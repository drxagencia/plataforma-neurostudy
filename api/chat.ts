
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

        // Count existing essays to determine if this is 3rd or more
        // user.essays is an object map of ID -> Essay.
        const essayCount = user.essays ? Object.keys(user.essays).length : 0;
        // If essayCount is 2, the current one being processed will be the 3rd.
        const isThirdOrMore = essayCount >= 2;

        // PROMPT CALIBRADO - PADRÃO INEP/ENEM OFICIAL
        const prompt = `
            ATUE COMO: Um Corretor Oficial do ENEM (Banca Vunesp/Cebraspe/FGV).
            TEMA: ${message}
            TAREFA: Analisar a imagem da redação MANUSCRITA e atribuir nota seguindo ESTRITAMENTE a Matriz de Referência do ENEM.

            DIRETRIZES DE CALIBRAGEM (CRÍTICO - LEIA COM ATENÇÃO):
            1. NÃO SEJA EXCESSIVAMENTE PUNITIVO. O objetivo é simular a nota real. Se o texto for excelente, DÊ NOTA 1000.
            2. CALIGRAFIA & OCR: A imagem é manuscrita. Se o texto parece "estranho" ou com erro ortográfico, verifique o CONTEXTO. Se fizer sentido no contexto, considere que a IA leu errado e NÃO TIRE PONTOS. A dúvida sempre favorece o aluno (in dubio pro reo).
            3. NOTAS MÁXIMAS (200): Não tenha medo de dar 200 na competência se o aluno cumprir os requisitos, mesmo que não seja "perfeito". O ENEM tolera pequenos desvios para nota máxima na C1, por exemplo.
            4. ESCALA: Use APENAS múltiplos de 20 (0, 40, ..., 120, 160, 200).

            CRITÉRIOS PARA NOTA 200 (MÁXIMA) POR COMPETÊNCIA:
            - C1 (Norma Culta): Estrutura sintática excelente (no máximo uma falha) e raros desvios gramaticais. (Se o texto é bom, dê 200 ou 160, evite notas baixas por erro de leitura de imagem).
            - C2 (Tema/Estrutura): Texto dissertativo-argumentativo completo (Intro, Desenv, Concl) + Repertório Sociocultural Legitimado, Pertinente e PRODUTIVO.
            - C3 (Projeto de Texto): Autoria, progressão textual fluida, sem contradições. Argumentos bem desenvolvidos.
            - C4 (Coesão): Presença expressiva de elementos coesivos inter e intraparágrafos. Pouca ou nenhuma repetição.
            - C5 (Proposta): Apresenta 5 elementos: Agente, Ação, Meio/Modo, Efeito e Detalhamento.

            FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
            {
                "c1": { 
                    "score": number, 
                    "analysis": "Breve justificativa técnica.", 
                    "positive_points": ["Ponto positivo 1"], 
                    "negative_points": ["Se houver erro real, cite. Se não, deixe vazio."]
                },
                "c2": { "score": number, "analysis": "Justificativa C2.", "positive_points": [], "negative_points": [] },
                "c3": { "score": number, "analysis": "Justificativa C3.", "positive_points": [], "negative_points": [] },
                "c4": { "score": number, "analysis": "Justificativa C4.", "positive_points": [], "negative_points": [] },
                "c5": { "score": number, "analysis": "Justificativa C5.", "positive_points": [], "negative_points": [] },
                "total": number,
                "general_feedback": "Feedback construtivo e motivador (tom de professor experiente). Reconheça se o texto é de alto nível.",
                "strengths": ["3 pontos fortes do texto"],
                "weaknesses": ["3 pontos de melhoria"],
                "structural_tips": "Dica prática para alcançar o 1000 ou manter o nível."
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

            let responseText = data.choices[0].message.content;

            // --- SCORE ADJUSTMENT LOGIC (Backend Post-Processing) ---
            // If user has >= 3 essays (including this one), and score < 720, add 100 points
            if (isThirdOrMore) {
                try {
                    const parsed = JSON.parse(responseText);
                    const currentTotal = 
                        (parsed.c1?.score || 0) + 
                        (parsed.c2?.score || 0) + 
                        (parsed.c3?.score || 0) + 
                        (parsed.c4?.score || 0) + 
                        (parsed.c5?.score || 0);

                    if (currentTotal < 720) {
                        // Need to distribute 100 points.
                        // Strategy: Add 20 to each competency until 100 is distributed.
                        // Constraint: Max 200 per competency.
                        const competencies = ['c1', 'c2', 'c3', 'c4', 'c5'];
                        let pointsToAdd = 100;
                        
                        // First pass: try to add 20 to each
                        for (const comp of competencies) {
                            if (pointsToAdd <= 0) break;
                            
                            let currentScore = parsed[comp].score || 0;
                            if (currentScore + 20 <= 200) {
                                parsed[comp].score = currentScore + 20;
                                pointsToAdd -= 20;
                            }
                        }

                        // Second pass: if points remain (because some were capped at 200), dump remaining into whatever has space
                        if (pointsToAdd > 0) {
                            for (const comp of competencies) {
                                if (pointsToAdd <= 0) break;
                                let currentScore = parsed[comp].score || 0;
                                const space = 200 - currentScore;
                                const add = Math.min(space, pointsToAdd); // Add whatever fits or whatever is left
                                if (add > 0) {
                                    parsed[comp].score += add;
                                    pointsToAdd -= add;
                                }
                            }
                        }

                        // Recalculate total for consistency in JSON
                        parsed.total = 
                            parsed.c1.score + parsed.c2.score + parsed.c3.score + parsed.c4.score + parsed.c5.score;
                        
                        // Update response text
                        responseText = JSON.stringify(parsed);
                    }
                } catch (parseError) {
                    console.error("Error adjusting score:", parseError);
                    // If parsing fails, we return original text, no bonus applied to avoid corruption
                }
            }

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
    } else if (mode === 'lesson_tutor') {
        systemInstruction = `
        ATUE COMO: Um Tutor de Elite especializado em preparação para ENEM e Vestibulares de Alta Concorrência (Medicina).
        
        OBJETIVO: Explicar o conteúdo da aula de forma aprofundada, didática e esquematizada.
        
        FORMATO DE RESPOSTA (MARKDOWN):
        - Use Títulos com ## para separar seções.
        - Use Listas e Bullets para facilitar a leitura.
        - Use Negrito (**texto**) para conceitos chave.
        - Se o usuário pedir um MAPA MENTAL, crie uma lista hierárquica usando emojis e indentação.
        - Se o usuário pedir GRÁFICOS, descreva os eixos (X, Y) e o comportamento da curva detalhadamente, ou use ASCII art simples se apropriado.
        
        TONALIDADE:
        - Incentivadora mas técnica.
        - Foco em "O que cai no ENEM".
        - Evite respostas curtas demais. Explique o "porquê".
        `;
    } else if (mode === 'explanation') {
      systemInstruction = `
      ATUE COMO: Um Professor Especialista e Didático.
      
      OBJETIVO: Explicar detalhadamente a questão, comparando a alternativa escolhida pelo aluno (se houver) com o gabarito oficial fornecido.
      
      REGRAS CRÍTICAS (PARA FORMATAÇÃO):
      1. NÃO USE LaTeX (ex: \\[ ... \\], $...$). O frontend NÃO suporta.
      2. Use APENAS texto simples ou Markdown básico (**negrito**, listas com - ou *).
      3. Para fórmulas químicas ou matemáticas, use formatação linear simples. Exemplo: "H2O" em vez de fórmulas complexas. "x^2" para quadrado.
      
      REGRAS DE CONTEÚDO (PARA EVITAR ALUCINAÇÃO):
      1. Você receberá o "GABARITO OFICIAL" no prompt. ELE É A VERDADE ABSOLUTA. Nunca diga que o gabarito oficial está errado.
      2. Se o aluno marcou a alternativa incorreta, explique POR QUE ela está errada comparada ao gabarito.
      3. Se o aluno acertou, reforce o conceito.
      
      ESTRUTURA DE RESPOSTA:
      - Comece validando a dúvida.
      - Explique a alternativa correta (Gabarito).
      - Explique por que a alternativa do aluno (se diferente) está incorreta.
      - Use **negrito** para destacar termos chave.
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

    // Different max tokens for lesson tutor
    const maxTokens = (mode === 'lesson_tutor' || mode === 'explanation') ? 2000 : 300;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: AI_MODEL,
            messages: messagesPayload,
            max_tokens: maxTokens
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
        description: mode === 'explanation' ? 'Explicação Detalhada IA' : mode === 'lesson_tutor' ? 'NeuroTutor Aula' : 'Chat IA',
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
