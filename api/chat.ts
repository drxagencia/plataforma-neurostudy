
import * as firebaseApp from "firebase/app";
import { getDatabase, ref, get, update, push, set } from "firebase/database";
import { GoogleGenAI, Type } from "@google/genai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

let app;
const apps = firebaseApp.getApps();
if (apps.length > 0) {
    app = firebaseApp.getApp();
} else {
    try {
        app = firebaseApp.initializeApp(firebaseConfig, "serverless_worker");
    } catch (e: any) {
        app = firebaseApp.getApps().length > 0 ? firebaseApp.getApp() : firebaseApp.initializeApp(firebaseConfig);
    }
}

const db = getDatabase(app);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { message, history, mode, uid, image, systemOverride } = req.body;
    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const userSnap = await get(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: 'User not found' });
    const user = userSnap.val();

    if (mode === 'essay-correction') {
        const credits = user.essayCredits || 0;
        if (credits <= 0) return res.status(402).json({ error: 'Sem créditos de redação.' });

        const systemInstruction = `
            ATUE COMO: Um Corretor Oficial do ENEM.
            REGRAS DE NOTA: Multiplos de 20 (0-200).
            RETORNE APENAS JSON.
        `;

        // Fix: Use ai.models.generateContent with image part
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: image.split(',')[1],
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [imagePart, { text: `Tema: ${message}\nCorrija esta redação.` }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        c1: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, analysis: { type: Type.STRING } } },
                        c2: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, analysis: { type: Type.STRING } } },
                        c3: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, analysis: { type: Type.STRING } } },
                        c4: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, analysis: { type: Type.STRING } } },
                        c5: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, analysis: { type: Type.STRING } } },
                        final_score: { type: Type.NUMBER },
                        general_feedback: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        structural_tips: { type: Type.STRING }
                    },
                    required: ["c1", "c2", "c3", "c4", "c5", "final_score"]
                }
            }
        });

        await update(userRef, { essayCredits: credits - 1 });
        return res.status(200).json({ text: response.text });
    }

    const isBasic = user.plan === 'basic';
    if (isBasic && mode === 'chat') return res.status(403).json({ error: 'Upgrade necessário.' });

    const COST_PER_REQ = 0.01; 
    if (user.balance < COST_PER_REQ) return res.status(402).json({ error: 'Saldo insuficiente.' });

    const contents = (history || []).map((h: any) => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction: systemOverride || "Você é a NeuroAI." }
    });

    await update(userRef, { balance: Math.max(0, user.balance - COST_PER_REQ) });
    const transRef = push(ref(db, `user_transactions/${uid}`));
    await set(transRef, {
        id: transRef.key,
        type: 'debit',
        amount: COST_PER_REQ,
        description: `NeuroAI (${mode || 'Chat'})`,
        timestamp: Date.now(),
        currencyType: 'BRL'
    });

    return res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
