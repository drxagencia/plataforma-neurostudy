
import { initializeApp, getApps, getApp } from "firebase/app";
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
const apps = getApps();
if (apps.length > 0) {
    app = getApp();
} else {
    try {
        app = initializeApp(firebaseConfig, "serverless_worker");
    } catch (e: any) {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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

    // DATABASE CHECK: Ensure we get the source of truth for the plan
    const userRef = ref(db, `users/${uid}`);
    const userSnap = await get(userRef);
    
    if (!userSnap.exists()) return res.status(404).json({ error: 'User not found' });
    
    const user = userSnap.val();
    
    // STRICT PLAN CHECK
    const isBasic = user.plan === 'basic';
    const isAdvanced = user.plan === 'advanced' || user.plan === 'admin' || user.isAdmin;

    // --- ESSAY CORRECTION LOGIC (VISION) ---
    if (mode === 'essay-correction') {
        // Basic users CAN perform essay correction IF they have credits (purchased separately)
        // Advanced users have credits included in subscription
        const credits = user.essayCredits || 0;
        if (credits <= 0) {
            return res.status(402).json({ error: 'Sem créditos de redação.' });
        }

        // Initialize OpenAI
        const openai = new OpenAI({ apiKey });

        // PROMPT CALIBRADO - PADRÃO INEP/ENEM OFICIAL
        // ATUALIZADO: Regra estrita de múltiplos de 20
        const prompt = `
            ATUE COMO: Um Corretor Oficial do ENEM (Banca FGV/Vunesp/Cebraspe).
            TAREFA: Corrigir a redação manuscrita na imagem anexa baseada no tema: "${message}".
            
            REGRAS DE NOTA (MUITO IMPORTANTE):
            1. As notas das competências (C1 a C5) DEVEM ser estritamente múltiplos de 20.
            2. Valores aceitos: 0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200.
            3. JAMAIS retorne valores quebrados como 125, 130 ou 155. Arredonde sempre para o múltiplo de 20 mais próximo de acordo com o nível do aluno.
            
            ESTRUTURA DE RESPOSTA (JSON STRICT):
            Retorne APENAS um JSON válido. Não use Markdown. Não use crases.
            {
              "c1": {"score": number, "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c2": {"score": number, "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c3": {"score": number, "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c4": {"score": number, "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "c5": {"score": number, "analysis": "string", "positivePoints": ["string"], "negativePoints": ["string"]},
              "final_score": number (soma das competencias),
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
    
    // Strict block for Basic Plan on Chat
    if (isBasic && mode === 'chat') {
        return res.status(403).json({ error: 'Upgrade para o plano Advanced necessário para usar o NeuroTutor.' });
    }

    // Check Balance (Cost Per Message approx)
    // Advanced users pay standard rate or have optimized consumption
    const COST_PER_REQ = 0.01; 
    
    if (user.balance < COST_PER_REQ) {
        return res.status(402).json({ error: 'Saldo insuficiente.' });
    }

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey });

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
