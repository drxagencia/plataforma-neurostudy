
import * as firebaseApp from "firebase/app";
import { getDatabase, ref, get, update, push, set } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Initialize Firebase App for serverless context
let app;
try {
    app = firebaseApp.initializeApp(firebaseConfig, "serverless_worker");
} catch (e: any) {
    app = firebaseApp.initializeApp(firebaseConfig); 
}
const db = getDatabase(app);

// Configuration for "GPT 5 Nano" (using gpt-4o-mini)
const AI_MODEL = "gpt-4o-mini"; 
const USD_TO_BRL = 6.0; // Fixed exchange rate assumption
const PROFIT_MARGIN = 1.5; // 1.5x markup

// Pricing per 1 Million Tokens (USD)
const PRICE_INPUT_1M = 0.15;
const PRICE_OUTPUT_1M = 0.60;

// AGGRESSIVE TOKEN MULTIPLIER (100x)
// "A cada 1 token gasto, nós iremos computar 100"
const TOKEN_COMPUTE_MULTIPLIER = 100; 

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

        // PROMPT AVANÇADO - Especialista ENEM
        const prompt = `
            ATUE COMO: Um Corretor Sênior da Banca do ENEM, extremamente técnico, exigente e detalhista.
            TEMA: ${message}
            TAREFA: Analise a imagem da redação MANUSCRITA e forneça uma correção completa e rigorosa.
            
            ATENÇÃO: A imagem contém texto escrito à mão. Considere possíveis ambiguidades de caligrafia típicas de estudantes. Se uma palavra parecer errada mas for apenas má caligrafia, seja ponderado, mas penalize ilegibilidade se afetar a compreensão.

            REGRAS DE PONTUAÇÃO (CRÍTICO):
            1. As notas de C1 a C5 DEVEM ser MÚLTIPLOS DE 20 (ex: 0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200).
            2. NÃO dê nota "média" (120) se o aluno for excelente (180/200) ou fraco (40/60). Seja justo e identifique os extremos.
            3. Analise com rigor: Coesão, Coerência, Gramática, Repertório Sociocultural e Proposta de Intervenção.
            4. SOMA: O campo "total" DEVE SER EXATAMENTE a soma de c1+c2+c3+c4+c5. Verifique sua matemática.

            FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
            {
                "c1": { 
                    "score": number, 
                    "analysis": "Texto técnico explicando o desempenho na norma culta.", 
                    "positive_points": ["Item 1", "Item 2"], 
                    "negative_points": ["Erro grave de crase na linha X", "Concordância"]
                },
                "c2": { 
                    "score": number, 
                    "analysis": "Texto sobre a compreensão do tema e estrutura dissertativa.",
                    "positive_points": ["Uso produtivo de repertório", "Boa tese"], 
                    "negative_points": ["Tangenciamento do tema"]
                },
                "c3": { "score": number, "analysis": "Texto sobre projeto de texto e argumentação.", "positive_points": [], "negative_points": [] },
                "c4": { "score": number, "analysis": "Texto sobre mecanismos linguísticos e coesão.", "positive_points": [], "negative_points": [] },
                "c5": { "score": number, "analysis": "Texto sobre proposta de intervenção (GOMIF).", "positive_points": [], "negative_points": [] },
                "total": number,
                "general_feedback": "Uma análise macroestrutural do texto. Fale sobre o estilo de escrita do aluno, a progressão textual e a maturidade dos argumentos.",
                "strengths": ["Lista de 3 pontos fortes gerais do texto"],
                "weaknesses": ["Lista de 3 pontos fracos gerais do texto"],
                "structural_tips": "Dica prática de como melhorar a estrutura dos parágrafos ou a caligrafia/organização visual."
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
                    max_tokens: 2500, // Aumentado para resposta rica
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
                description: 'Correção Detalhada ENEM',
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
    if (systemOverride) {
        systemInstruction = systemOverride;
    } else if (mode === 'explanation') {
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
    
    // Calculate Pricing with 100x Multiplier
    const rawInputTokens = usage?.prompt_tokens || 0;
    const rawOutputTokens = usage?.completion_tokens || 0;

    // --- APPLY MULTIPLIER HERE ---
    const inputTokens = rawInputTokens * TOKEN_COMPUTE_MULTIPLIER;
    const outputTokens = rawOutputTokens * TOKEN_COMPUTE_MULTIPLIER;

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
        tokensUsed: inputTokens + outputTokens, // Log the inflated token usage for transparency in internal logs if needed
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
