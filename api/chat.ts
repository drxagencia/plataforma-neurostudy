import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, push, set } from "firebase/database";

// Initialize Firebase Admin logic (using client SDK for Vercel simplicity in this demo)
// In a real prod env, use firebase-admin with Service Account
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo", // Fallback for dev
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Singleton-ish app init
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

    // 1. Fetch User Data & AI Config
    const userRef = ref(db, `users/${uid}`);
    const configRef = ref(db, `config/ai`);
    
    const [userSnap, configSnap] = await Promise.all([get(userRef), get(configRef)]);
    
    if (!userSnap.exists()) return res.status(404).json({ error: 'User not found' });
    
    const user = userSnap.val();
    const config = configSnap.val() || { intermediateLimits: { canUseChat: false, canUseExplanation: true } };

    // 2. Access Control Logic
    if (user.plan === 'basic') {
        return res.status(403).json({ error: 'Plano Básico não permite acesso à IA. Faça upgrade.' });
    }

    if (user.plan === 'intermediate') {
        if (mode === 'explanation' && !config.intermediateLimits.canUseExplanation) {
            return res.status(403).json({ error: 'Seu plano não permite explicação de questões.' });
        }
        if ((!mode || mode === 'chat') && !config.intermediateLimits.canUseChat) {
            return res.status(403).json({ error: 'Seu plano não permite chat livre.' });
        }
    }

    // 3. Balance Check
    const currentBalance = user.balance || 0;
    if (currentBalance <= 0.05) { // Minimum threshold
        return res.status(402).json({ error: 'Saldo insuficiente. Recarregue seus créditos.' });
    }

    // 4. Call Gemini AI
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const modelId = 'gemini-flash-lite-latest'; 

    let fullPrompt = "";
    if (mode === 'explanation') {
      fullPrompt = `
      Você é um tutor focado em corrigir erros.
      CONTEXTO: Aluno errou uma questão.
      OBJETIVO: Explicar PORQUE a alternativa marcada está errada e PORQUE a correta é a certa.
      TOM: Simples, didático, amigável.
      DADOS: ${message}`;
    } else {
      fullPrompt = "Você é o Tutor IA da NeuroStudy. Responda de forma didática e direta.\n\n";
      if (history && Array.isArray(history)) {
        history.forEach((msg: any) => {
          fullPrompt += `${msg.role === 'user' ? 'Aluno' : 'Tutor'}: ${msg.content}\n`;
        });
      }
      fullPrompt += `Aluno: ${message}\nTutor:`;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: fullPrompt,
    });

    // 5. Cost Calculation & Markup (The "Hidden" Tax)
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || fullPrompt.length / 4; // Fallback approx
    const outputTokens = usage?.candidatesTokenCount || response.text.length / 4;

    // Pricing (Approximate Flash Lite in USD -> converted to BRL)
    // $0.075 per 1M input | $0.30 per 1M output
    // Exchange Rate assumed fixed at 6.00 BRL
    const pricePerMillionInputBRL = 0.075 * 6;
    const pricePerMillionOutputBRL = 0.30 * 6;

    const rawCost = (inputTokens * (pricePerMillionInputBRL / 1000000)) + (outputTokens * (pricePerMillionOutputBRL / 1000000));
    
    // Apply 10% Markup
    const finalCostToUser = rawCost * 1.10;
    
    // Ensure minimum charge to avoid floating point zeros issues (e.g., minimum R$ 0.0001)
    const chargeAmount = Math.max(finalCostToUser, 0.00001);

    // 6. Deduct Balance & Log Transaction
    const newBalance = currentBalance - chargeAmount;
    
    await update(userRef, { balance: newBalance });
    
    const transRef = push(ref(db, `users/${uid}/transactions`));
    await set(transRef, {
        id: transRef.key,
        type: 'debit',
        amount: chargeAmount,
        description: mode === 'explanation' ? 'IA: Explicação de Questão' : 'IA: Chat Tutor',
        timestamp: Date.now(),
        tokensUsed: inputTokens + outputTokens
    });

    return res.status(200).json({ 
        text: response.text, 
        cost: chargeAmount,
        remainingBalance: newBalance 
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
}