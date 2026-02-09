
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, update } from "firebase/database";
import { GoogleGenAI, Type } from "@google/genai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Ensure Firebase is initialized correctly for the environment
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);

// Initialize Gemini API with API_KEY from environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { message, history, mode, uid, image, systemOverride } = req.body;
    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const userSnap = await get(userRef);
    const user = userSnap.val();

    if (mode === 'essay-correction') {
      const credits = user.essayCredits || 0;
      if (credits <= 0) return res.status(402).json({ error: 'Sem créditos de redação.' });

      const prompt = `Você é um corretor oficial do ENEM. Analise a imagem/texto e retorne um JSON estrito com notas de 0 a 200 para as 5 competências (c1, c2, c3, c4, c5), nota final, feedback geral, pontos fortes, fracos e dicas estruturais. Tema: ${message}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              c1: { type: Type.NUMBER },
              c2: { type: Type.NUMBER },
              c3: { type: Type.NUMBER },
              c4: { type: Type.NUMBER },
              c5: { type: Type.NUMBER },
              score_total: { type: Type.NUMBER },
              general_feedback: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              structural_tips: { type: Type.STRING }
            }
          }
        }
      });

      await update(userRef, { essayCredits: credits - 1 });
      // Guideline: access text via response.text getter
      return res.status(200).json({ text: response.text });
    }

    // Default chat/explain/study-plan logic
    const systemInstruction = systemOverride || "Você é a NeuroAI, tutora de elite. Ajude o aluno a ser aprovado no ENEM.";
    
    // Convert history for Gemini
    const contents = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: mode === 'chat' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const cost = 0.01;
    await update(userRef, { balance: Math.max(0, (user.balance || 0) - cost) });
    
    // Guideline: access text via response.text getter
    return res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
