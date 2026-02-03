
import * as firebaseApp from "firebase/app";
import { getDatabase, ref, get, update, push, set } from "firebase/database";
import { GoogleGenAI } from "@google/genai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Initialize Firebase App for serverless context
let app;
if (firebaseApp.getApps().length > 0) {
    app = firebaseApp.getApp();
} else {
    try {
        app = firebaseApp.initializeApp(firebaseConfig, "serverless_worker");
    } catch (e: any) {
        // Fallback or if already exists
        app = firebaseApp.getApps().length > 0 ? firebaseApp.getApp() : firebaseApp.initializeApp(firebaseConfig);
    }
}

const db = getDatabase(app);

// Configuration for Gemini
const GEMINI_MODEL = "gemini-3-flash-preview"; // Updated to recommended model
const GEMINI_VISION_MODEL = "gemini-2.5-flash-image"; // Valid for image tasks

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
  if (!apiKey) return res.status(500).json({ error: 'Server Config Error: Missing Gemini API Key' });

  try {
    const { message, history, mode, uid, image, systemOverride } = req.body;

    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const configRef = ref(db, `config/ai`);
    
    const [userSnap, configSnap] = await Promise.all([get(userRef), get(configRef)]);
    
    if (!userSnap.exists()) return res.status(404).json({ error: 'User not found' });
    
    const user = userSnap.val();
    const config = configSnap.val() || { intermediateLimits: { canUseChat: false, canUseExplanation: true } };

    // --- ESSAY CORRECTION LOGIC (VISION) ---
    if (mode === 'essay-correction') {
        const credits = user.essayCredits || 0;
        if (credits <= 0) {
            return res.status(402).json({ error: 'Sem créditos de redação.' });
        }

        // Count existing essays to determine if this is 3rd or more
        const essaysRef = ref(db, `user_essays/${uid}`);
        
        // PROMPT CALIBRADO - PADRÃO INEP/ENEM OFICIAL
        const prompt = `
            ATUE COMO: Um Corretor Oficial do ENEM (Banca FGV/Vunesp/Cebraspe).
            TAREFA: Corrigir a redação manuscrita na imagem anexa baseada no tema: "${message}".
            
            ESTRUTURA DE RESPOSTA (JSON STRICT):
            Retorne APENAS um JSON válido. Não use Markdown. Não use crases.
            {
              "c1": {"score": number (0-200), "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c2": {"score": number (0-200), "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c3": {"score": number (0-200), "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c4": {"score": number (0-200), "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c5": {"score": number (0-200), "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "final_score": number (sum),
              "general_feedback": "string (resumo geral)",
              "strengths": ["string", "string"],
              "weaknesses": ["string", "string"],
              "structural_tips": "string"
            }

            CRITÉRIOS RIGOROSOS:
            1. Se a imagem estiver ilegível, retorne score 0 e avise no feedback.
            2. Seja exigente com pontuação, acentuação e crase (C1).
            3. Verifique tangenciamento do tema (C2).
            4. Exija proposta de intervenção completa (C5).
        `;

        const ai = new GoogleGenAI({ apiKey });
        
        // Prepare Image Part
        // Assuming 'image' comes as "data:image/jpeg;base64,....."
        const base64Data = image.split(',')[1];
        
        const response = await ai.models.generateContent({
            model: GEMINI_VISION_MODEL,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
                ]
            }
        });

        // Debit credit from DB
        await update(userRef, { essayCredits: credits - 1 });

        return res.status(200).json({ text: response.text });
    }

    // --- CHAT / TUTOR LOGIC ---
    
    // Check Permissions
    const isBasic = user.plan === 'basic';
    const isIntermediate = user.plan === 'intermediate';
    
    if (isBasic && mode === 'chat') {
        return res.status(403).json({ error: 'Upgrade seu plano para usar o chat livre.' });
    }
    if (isIntermediate && mode === 'chat' && !config.intermediateLimits.canUseChat) {
        return res.status(403).json({ error: 'Seu plano permite apenas explicações de questões.' });
    }

    // Check Balance (Cost Per Message approx)
    const COST_PER_REQ = isBasic ? 0.02 : 0.01; // Basic pays double
    if (user.balance < COST_PER_REQ) {
        return res.status(402).json({ error: 'Saldo insuficiente.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = GEMINI_MODEL;

    let systemInstruction = systemOverride || "Você é a NeuroAI, uma tutora educacional de elite. Seja didática, direta e use formatação Markdown rica (negrito, listas).";

    // Transform history to Gemini format
    // Gemini expects 'user' and 'model' roles.
    const geminiHistory = history.map((h: any) => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }]
    }));

    // Add current message
    const chat = ai.chats.create({
        model: model,
        history: geminiHistory,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    const result = await chat.sendMessage({ message: message });
    const responseText = result.text;

    // Deduct Balance
    const newBalance = Math.max(0, user.balance - COST_PER_REQ);
    await update(userRef, { balance: newBalance });

    // Log Usage (SEPARATE NODE)
    const transRef = push(ref(db, `user_transactions/${uid}`));
    await set(transRef, {
        id: transRef.key,
        type: 'debit',
        amount: COST_PER_REQ,
        description: `NeuroAI (${mode || 'Chat'})`,
        timestamp: Date.now(),
        currencyType: 'BRL'
    });

    return res.status(200).json({ text: responseText });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
