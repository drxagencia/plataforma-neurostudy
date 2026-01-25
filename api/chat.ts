import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, push, set } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

let app;
try {
    app = initializeApp(firebaseConfig, "serverless_worker");
} catch (e) {
    app = initializeApp(firebaseConfig); 
}
const db = getDatabase(app);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.SECRET_APIKEY;
  if (!apiKey) return res.status(500).json({ error: 'Server Config Error' });

  try {
    const { message, history, mode, uid } = req.body;

    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const configRef = ref(db, `config/ai`);
    
    const [userSnap, configSnap] = await Promise.all([get(userRef), get(configRef)]);
    
    if (!userSnap.exists()) return res.status(404).json({ error: 'User not found' });
    
    const user = userSnap.val();
    const config = configSnap.val() || { intermediateLimits: { canUseChat: false, canUseExplanation: true } };

    if (user.plan === 'basic') {
        return res.status(403).json({ error: 'Plano Básico não permite acesso à IA.' });
    }

    if (user.plan === 'intermediate') {
        if (mode === 'explanation' && !config.intermediateLimits.canUseExplanation) {
            return res.status(403).json({ error: 'Plano não permite explicação.' });
        }
        if ((!mode || mode === 'chat') && !config.intermediateLimits.canUseChat) {
            return res.status(403).json({ error: 'Plano não permite chat.' });
        }
    }

    const currentBalance = user.balance || 0;
    if (currentBalance <= 0.05) {
        return res.status(402).json({ error: 'Saldo insuficiente.' });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const modelId = 'gemini-flash-lite-latest'; 

    let fullPrompt = "";
    if (mode === 'explanation') {
      fullPrompt = `
      Você é um tutor.
      TAREFA: Explicar o erro na questão.
      REGRAS: 
      1. Seja direto e curto (max 100 palavras).
      2. Use **negrito** para destacar conceitos chave.
      3. Não use blocos de código ou markdown complexo.
      DADOS: ${message}`;
    } else {
      fullPrompt = "Você é o NeuroTutor. Responda de forma didática e curta. Use **negrito** para destaques.\n\n";
      if (history && Array.isArray(history)) {
        history.slice(-5).forEach((msg: any) => { // Limit context to 5 msgs for tokens
          fullPrompt += `${msg.role === 'user' ? 'Aluno' : 'Tutor'}: ${msg.content}\n`;
        });
      }
      fullPrompt += `Aluno: ${message}\nTutor:`;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: fullPrompt,
    });

    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || fullPrompt.length / 4;
    const outputTokens = usage?.candidatesTokenCount || response.text.length / 4;

    const pricePerMillionInputBRL = 0.075 * 6;
    const pricePerMillionOutputBRL = 0.30 * 6;

    const rawCost = (inputTokens * (pricePerMillionInputBRL / 1000000)) + (outputTokens * (pricePerMillionOutputBRL / 1000000));
    
    const finalCostToUser = rawCost * 1.10;
    const chargeAmount = Math.max(finalCostToUser, 0.00001);

    const newBalance = currentBalance - chargeAmount;
    
    await update(userRef, { balance: newBalance });
    
    const transRef = push(ref(db, `users/${uid}/transactions`));
    await set(transRef, {
        id: transRef.key,
        type: 'debit',
        amount: chargeAmount,
        description: mode === 'explanation' ? 'Explicação IA' : 'Chat IA',
        timestamp: Date.now(),
        tokensUsed: inputTokens + outputTokens
    });

    return res.status(200).json({ 
        text: response.text, 
        cost: chargeAmount,
        remainingBalance: newBalance 
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
}