
import * as firebaseApp from "firebase/app";
import { getDatabase, ref, get, update, push, set } from "firebase/database";
import OpenAI from "openai";

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
        app = firebaseApp.getApps().length > 0 ? firebaseApp.getApp() : firebaseApp.initializeApp(firebaseConfig);
    }
}

const db = getDatabase(app);

// OpenAI Configuration
const OPENAI_MODEL = "gpt-4o-mini"; // Cost-effective, supports vision

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

  // Use environment variable for OpenAI Key
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server Config Error: Missing OpenAI API Key' });

  try {
    const { message, history, mode, uid, image, systemOverride } = req.body;

    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const configRef = ref(db, `config/ai`);
    
    const [userSnap, configSnap] = await Promise.all([get(userRef), get(configRef)]);
    
    if (!userSnap.exists()) return res.status(404).json({ error: 'User not found' });
    
    const user = userSnap.val();
    const config = configSnap.val() || { intermediateLimits: { canUseChat: false, canUseExplanation: true } };

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey });

    // --- ESSAY CORRECTION LOGIC (VISION) ---
    if (mode === 'essay-correction') {
        const credits = user.essayCredits || 0;
        if (credits <= 0) {
            return res.status(402).json({ error: 'Sem créditos de redação.' });
        }

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

        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: image } } // image MUST be a data URL (data:image/jpeg;base64,...)
                    ],
                },
            ],
            response_format: { type: "json_object" } // Force JSON
        });

        // Debit credit from DB
        await update(userRef, { essayCredits: credits - 1 });

        return res.status(200).json({ text: response.choices[0].message.content });
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

    let systemInstruction = systemOverride || "Você é a NeuroAI, uma tutora educacional de elite. Seja didática, direta e use formatação Markdown rica (negrito, listas).";

    // Transform history to OpenAI format
    const openAiHistory = history.map((h: any) => ({
        role: h.role === 'ai' ? 'assistant' : 'user',
        content: h.content
    }));

    const messages = [
        { role: 'system', content: systemInstruction },
        ...openAiHistory,
        { role: 'user', content: message }
    ];

    const result = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: messages as any,
    });

    const responseText = result.choices[0].message.content;

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
