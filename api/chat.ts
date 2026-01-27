import * as firebaseApp from "firebase/app";
import { getDatabase, ref, get, update, push, set } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Initialize Firebase App for serverless context
// Checks if app is already initialized to avoid duplicate errors in hot-reload/serverless environments
let app;
try {
    // Attempt to initialize with a unique name for the worker
    app = firebaseApp.initializeApp(firebaseConfig, "serverless_worker");
} catch (e: any) {
    // If it fails (e.g. already exists), try to get the default app or re-initialize without name if necessary
    // However, usually in V9 modular, initializeApp returns the instance. 
    // If "serverless_worker" already exists, it throws. We can ignore or handle.
    // In this context, simpler is often better: just create a new one or ignore if we can't get reference easily without getApp
    // We will just try default init if named failed, or suppress.
    // Correct approach for repeated calls:
    app = firebaseApp.initializeApp(firebaseConfig); 
}
const db = getDatabase(app);

// Configuration for "GPT 5 Nano" (using gpt-4o-mini)
const AI_MODEL = "gpt-4o-mini"; 
const USD_TO_BRL = 6.0; // Fixed exchange rate assumption
const PROFIT_MARGIN = 1.5; // 1.5x markup

// Updated Pricing per 1 Million Tokens (USD)
const PRICE_INPUT_1M = 0.15;
const PRICE_OUTPUT_1M = 0.60;

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
  if (!apiKey) return res.status(500).json({ error: 'Server Config Error: Missing OpenAI API Key' });

  try {
    const { message, history, mode, uid, image } = req.body;

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

        const prompt = `
            Você é um corretor especialista do ENEM.
            TEMA: ${message}
            TAREFA: Analise a imagem da redação manuscrita.
            
            SAÍDA: Retorne ESTRITAMENTE um JSON com o seguinte formato exato (sem markdown):
            {
                "c1": { "score": (0-200), "comment": "Explicação breve do erro ou acerto na C1" },
                "c2": { "score": (0-200), "comment": "Explicação breve na C2" },
                "c3": { "score": (0-200), "comment": "Explicação breve na C3" },
                "c4": { "score": (0-200), "comment": "Explicação breve na C4" },
                "c5": { "score": (0-200), "comment": "Explicação breve na C5" },
                "total": (soma das notas),
                "feedback": "Resumo geral curto de 2 frases sobre o texto todo",
                "errors": ["erro gramatical 1", "erro de coesão 2", "ponto de melhoria"]
            }
        `;

        try {
            const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { 
                                    type: "image_url", 
                                    image_url: { 
                                        url: image 
                                    } 
                                }
                            ]
                        }
                    ],
                    max_tokens: 1500,
                    response_format: { type: "json_object" }
                })
            });

            const data = await openAiResponse.json();

            if (!openAiResponse.ok) {
                throw new Error(data.error?.message || 'OpenAI API Error');
            }

            const responseText = data.choices[0].message.content;

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

            return res.status(200).json({ text: responseText });
        } catch (innerError: any) {
            console.error("OpenAI Vision Error:", innerError);
            if (innerError.message?.includes('429')) {
                 return res.status(429).json({ error: 'Sistema sobrecarregado. Tente novamente em 1 minuto.' });
            }
            throw innerError;
        }
    }

    // --- STANDARD CHAT LOGIC (TEXT) ---
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

    let systemInstruction = "";
    if (mode === 'explanation') {
      systemInstruction = `
      Atue como Tutor Sênior.
      OBJETIVO: Explicar o erro do aluno de forma DIDÁTICA e MUITO BREVE.
      REGRAS:
      1. Use estritamente **negrito** para palavras-chave.
      2. Máximo 40 palavras.
      3. Vá direto ao ponto. Sem saudações.
      `;
    } else {
      systemInstruction = "Tutor Sênior. Responda de forma curta, direta e didática. Max 30 palavras por resposta. Use **negrito** nos conceitos.";
    }

    // Prepare Messages
    const messagesPayload = [
        { role: "system", content: systemInstruction }
    ];

    if (history && Array.isArray(history)) {
        // OpenAI expects 'assistant' instead of 'ai' for role
        history.slice(-3).forEach((msg: any) => {
            messagesPayload.push({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            });
        });
    }
    
    messagesPayload.push({ role: "user", content: message });

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: AI_MODEL,
            messages: messagesPayload,
            max_tokens: 300
        })
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
        throw new Error(data.error?.message || 'OpenAI API Error');
    }

    const responseText = data.choices[0].message.content;
    const usage = data.usage;
    
    // Calculate Pricing
    const inputTokens = usage?.prompt_tokens || 0;
    const outputTokens = usage?.completion_tokens || 0;

    // USD Cost
    const costInputUSD = (inputTokens / 1000000) * PRICE_INPUT_1M;
    const costOutputUSD = (outputTokens / 1000000) * PRICE_OUTPUT_1M;
    const totalCostUSD = costInputUSD + costOutputUSD;

    // Convert to BRL
    const totalCostBRL = totalCostUSD * USD_TO_BRL;

    // Apply Markup (1.5x)
    const finalChargeAmount = Math.max(totalCostBRL * PROFIT_MARGIN, 0.00001);
    
    const newBalance = currentBalance - finalChargeAmount;
    
    await update(userRef, { balance: newBalance });
    
    const transRef = push(ref(db, `users/${uid}/transactions`));
    await set(transRef, {
        id: transRef.key,
        type: 'debit',
        amount: finalChargeAmount,
        description: mode === 'explanation' ? 'Explicação IA' : 'Chat IA',
        timestamp: Date.now(),
        tokensUsed: inputTokens + outputTokens,
        currencyType: 'BRL'
    });

    return res.status(200).json({ 
        text: responseText, 
        cost: finalChargeAmount,
        remainingBalance: newBalance 
    });

  } catch (error: any) {
    console.error("API Error:", error);
    const status = 500;
    const message = error.message || 'Unknown Server Error';
    return res.status(status).json({ error: `Server Error: ${message}` });
  }
}