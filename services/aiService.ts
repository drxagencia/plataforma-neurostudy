
import { auth, database } from "./firebaseConfig";
import OpenAI from "openai";
import { ref, push, set, get, update } from "firebase/database";

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

// Models - Using the cheapest capable model
const OPENAI_MODEL = "gpt-4o-mini";

// Pricing Configuration (BRL per Token)
const BASE_COST_PER_TOKEN = 0.00002; 

// Helper: Get API Key safely for Vite Environment
const getApiKey = () => {
    return (import.meta as any).env?.VITE_OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '') || '';
};

let aiInstance: OpenAI | null = null;

const getAiInstance = () => {
    if (!aiInstance) {
        const key = getApiKey();
        if (!key) {
            console.warn("OpenAI API Key missing.");
            throw new Error("API Key não configurada (VITE_OPENAI_API_KEY).");
        }
        aiInstance = new OpenAI({ 
            apiKey: key, 
            dangerouslyAllowBrowser: true 
        });
    }
    return aiInstance;
};

// Helper to get user plan and balance
const getUserData = async (uid: string) => {
    const userRef = ref(database, `users/${uid}`);
    const snap = await get(userRef);
    if (!snap.exists()) throw new Error("User not found");
    return snap.val();
};

const FORMATTING_RULES = `
REGRAS DE FORMATAÇÃO ESTRITA:
1. Use '### ' para Títulos e Subtítulos importantes.
2. Use '**' para destacar MUITO as palavras-chave e conceitos centrais. (IMPORTANTE: Estes destaques serão exibidos em cores NEON brilhantes (Ciano/Sky) para alto contraste no fundo escuro. Use com sabedoria).
3. Use listas com '- ' para passo-a-passo ou tópicos.
4. Use '> ' para notas de destaque, avisos ou "Dicas de Ouro".
5. NÃO use formatações complexas como tabelas Markdown ou LaTeX cru sem explicação.
6. O tom deve ser encorajador e direto.
7. Use emojis estrategicamente para ilustrar pontos (ex: 🚀, 💡, 🧠).
`;

export const AiService = {
  sendMessage: async (message: string, history: ChatMessage[], actionLabel: string = 'NeuroAI Tutor', systemContext?: string): Promise<string> => {
    if (!auth.currentUser) throw new Error("User not authenticated");
    const uid = auth.currentUser.uid;

    try {
      const userData = await getUserData(uid);
      if (userData.balance <= 0) {
          throw new Error("402: Saldo insuficiente");
      }

      const ai = getAiInstance();
      
      let systemInstruction = `
        Você é a NeuroAI, uma tutora educacional de elite. 
        Sua missão é explicar conteúdos de forma DIDÁTICA, VISUAL e PROFISSIONAL.
        ${FORMATTING_RULES}
      `;

      if (systemContext) {
          systemInstruction = `${systemContext}\n\n${FORMATTING_RULES}`;
      }
      
      const openaiHistory = history.map(h => ({
          role: h.role === 'ai' ? 'assistant' : 'user',
          content: h.content
      })) as OpenAI.Chat.ChatCompletionMessageParam[];

      const messages = [
          { role: 'system', content: systemInstruction },
          ...openaiHistory,
          { role: 'user', content: message }
      ] as OpenAI.Chat.ChatCompletionMessageParam[];

      const completion = await ai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: messages,
      });

      const responseText = completion.choices[0]?.message?.content || "Sem resposta.";
      
      const usage = completion.usage;
      const totalTokens = usage?.total_tokens || 0;
      
      const isBasic = userData.plan === 'basic';
      const baseMultiplier = isBasic ? 2 : 1;
      const baseCost = totalTokens * BASE_COST_PER_TOKEN * baseMultiplier;
      const billingMultiplier = isBasic ? 80 : 40;
      const finalCost = baseCost * billingMultiplier;

      const currentBalance = userData.balance || 0;
      
      await update(ref(database, `users/${uid}`), { balance: currentBalance - finalCost });

      const transRef = push(ref(database, `user_transactions/${uid}`));
      await set(transRef, {
          id: transRef.key,
          type: 'debit',
          amount: finalCost, 
          description: actionLabel, 
          timestamp: Date.now(),
          currencyType: 'BRL',
          tokensUsed: totalTokens 
      });

      return responseText;

    } catch (error: any) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  explainError: async (questionText: string, wrongAnswerText: string, correctAnswerText: string, contextLabel: string = 'Ajuda: Questão'): Promise<string> => {
    if (!auth.currentUser) throw new Error("User not authenticated");
    const uid = auth.currentUser.uid;

    try {
      const userData = await getUserData(uid);
      if (userData.balance <= 0) throw new Error("402: Saldo insuficiente");

      const ai = getAiInstance();
      const prompt = `
[DADOS DA QUESTÃO]
ENUNCIADO: "${questionText}"

[AÇÃO DO ALUNO]
ALTERNATIVA SELECIONADA (INCORRETA): "${wrongAnswerText}"

[GABARITO OFICIAL]
ALTERNATIVA CORRETA: "${correctAnswerText}"

INSTRUÇÃO: 
Você é um Professor Particular Senior. Explique onde está o erro conceitual do aluno e como chegar na resposta correta.
Use a seguinte estrutura de formatação para renderização profissional:
- Use '### ' para separar "Análise do Erro" e "Caminho Correto".
- Use '**' para destacar termos técnicos. (Estes ficarão em NEON brilhante).
- Use '> ' para uma "Dica Final" ou macete de memorização.
      `;

      const completion = await ai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
      });

      const responseText = completion.choices[0]?.message?.content || "Não foi possível gerar a explicação.";

      const usage = completion.usage;
      const totalTokens = usage?.total_tokens || 0;
      const isBasic = userData.plan === 'basic';
      
      const baseMultiplier = isBasic ? 2 : 1;
      const baseCost = totalTokens * BASE_COST_PER_TOKEN * baseMultiplier;

      const billingMultiplier = isBasic ? 80 : 40;
      const finalCost = baseCost * billingMultiplier;

      const currentBalance = userData.balance || 0;
      await update(ref(database, `users/${uid}`), { balance: currentBalance - finalCost });

      const transRef = push(ref(database, `user_transactions/${uid}`));
      await set(transRef, {
          id: transRef.key,
          type: 'debit',
          amount: finalCost, 
          description: contextLabel,
          timestamp: Date.now(),
          currencyType: 'BRL',
          tokensUsed: totalTokens
      });

      return responseText;

    } catch (error) {
      console.error("AI Explanation Error:", error);
      throw error;
    }
  },

  generateStudyPlan: async (simulationTitle: string, errors: { topic: string, questionText: string }[]): Promise<{analysis: string, recommendations: {subjectId: string, topicName: string, reason: string}[]}> => {
      if (!auth.currentUser) throw new Error("User not authenticated");
      const uid = auth.currentUser.uid;

      try {
          const userData = await getUserData(uid);
          if (userData.balance <= 0.05) throw new Error("402: Saldo insuficiente");

          const ai = getAiInstance();
          const errorsText = errors.map(e => `- Tópico: ${e.topic} | Questão: ${e.questionText.substring(0, 50)}...`).join('\n');
          
          const prompt = `
            Você é um Mentor de Estudos Estratégico para o ENEM.
            O aluno acabou de realizar o simulado: "${simulationTitle}".
            
            ERROS COMETIDOS:
            ${errorsText}

            TAREFA:
            1. Analise brevemente os pontos fracos.
            2. Recomende até 3 tópicos prioritários para estudar AGORA.
            3. Para cada recomendação, forneça o ID da Matéria (ex: 'fisica', 'matematica', 'quimica', 'biologia', 'historia', 'geografia') e o Nome do Tópico (ex: 'Cinemática', 'Estequiometria'). Tente mapear para os tópicos padrão do ensino médio.

            RETORNE APENAS UM JSON VÁLIDO:
            {
                "analysis": "Texto motivacional curto e análise dos erros (use markdown simples).",
                "recommendations": [
                    { "subjectId": "string (id da materia)", "topicName": "string (nome do topico)", "reason": "Por que estudar isso?" }
                ]
            }
          `;

          const completion = await ai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: "json_object" }
          });

          const jsonContent = completion.choices[0]?.message?.content;
          if(!jsonContent) throw new Error("Falha na geração");
          
          const result = JSON.parse(jsonContent);

          // Billing
          const usage = completion.usage;
          const totalTokens = usage?.total_tokens || 0;
          const isBasic = userData.plan === 'basic';
          const baseCost = totalTokens * BASE_COST_PER_TOKEN * (isBasic ? 2 : 1);
          const finalCost = baseCost * (isBasic ? 80 : 40);

          await update(ref(database, `users/${uid}`), { balance: userData.balance - finalCost });
          const transRef = push(ref(database, `user_transactions/${uid}`));
          await set(transRef, {
              id: transRef.key,
              type: 'debit',
              amount: finalCost,
              description: `Plano de Estudo: ${simulationTitle}`,
              timestamp: Date.now(),
              currencyType: 'BRL'
          });

          return result;

      } catch (error) {
          console.error("AI Study Plan Error:", error);
          throw error;
      }
  }
};
