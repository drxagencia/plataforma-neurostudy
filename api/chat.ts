
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

  const apiKey = process.env.API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server Config Error' });

  try {
    const { message, history, mode, uid, image } = req.body;

    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const configRef = ref(db, `config/ai`);
    
    const [userSnap, configSnap] = await Promise.all([get(userRef), get(configRef)]);
    
    if (!userSnap.exists()) return res.status(404).json({ error: 'User not found' });
    
    const user = userSnap.val();
    const config = configSnap.val() || { intermediateLimits: { canUseChat: false, canUseExplanation: true } };

    // --- ESSAY CORRECTION LOGIC ---
    if (mode === 'essay-correction') {
        const credits = user.essayCredits || 0;
        if (credits <= 0) {
            return res.status(402).json({ error: 'Sem créditos de redação.' });
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });
        // Corrected Model ID for Vision capabilities
        const modelId = 'gemini-2.0-flash-exp'; 

        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg', 
                data: image.split(',')[1] // Remove data:image/jpeg;base64,
            }
        };

        const prompt = `
            Você é um corretor especialista do ENEM.
            TEMA: ${message}
            TAREFA: Analise a imagem da redação manuscrita.
            SAÍDA: Retorne APENAS um JSON (sem markdown, sem code block) com o formato:
            {
                "c1": (nota 0-200),
                "c2": (nota 0-200),
                "c3": (nota 0-200),
                "c4": (nota 0-200),
                "c5": (nota 0-200),
                "total": (soma),
                "feedback": "Resumo geral curto de 2 frases",
                "errors": ["erro especifico 1", "erro especifico 2", "ponto de melhoria"]
            }
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [imagePart, { text: prompt }] }
        });

        // Deduct 1 credit
        await update(userRef, { essayCredits: credits - 1 });
        
        // Log transaction
        const transRef = push(ref(db, `users/${uid}/transactions`));
        await set(transRef, {
            id: transRef.key,
            type: 'debit',
            amount: 1,
            description: 'Correção de Redação',
            timestamp: Date.now(),
            currencyType: 'CREDIT'
        });

        return res.status(200).json({ text: response.text });
    }

    // --- STANDARD CHAT LOGIC ---
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
      Atue como Tutor Sênior.
      OBJETIVO: Explicar o erro do aluno de forma DIDÁTICA e MUITO BREVE.
      CONTEXTO: ${message}
      REGRAS:
      1. Use estritamente **negrito** para palavras-chave.
      2. Máximo 40 palavras.
      3. Vá direto ao ponto. Sem saudações.
      `;
    } else {
      fullPrompt = "Tutor Sênior. Responda de forma curta, direta e didática. Max 30 palavras por resposta. Use **negrito** nos conceitos.\n\n";
      if (history && Array.isArray(history)) {
        history.slice(-3).forEach((msg: any) => { 
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
        tokensUsed: inputTokens + outputTokens,
        currencyType: 'BRL'
    });

    return res.status(200).json({ 
        text: response.text, 
        cost: chargeAmount,
        remainingBalance: newBalance 
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: `Server Error: ${error.message}` });
  }
}
