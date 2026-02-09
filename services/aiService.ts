
import { auth, database } from "./firebaseConfig";
import { GoogleGenAI, Type } from "@google/genai";
import { ref, push, set, get, update } from "firebase/database";
import { ChatMessage } from "../types";

// Helper: Get API Key safely
const getApiKey = () => {
    return process.env.API_KEY || "";
};

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: getApiKey() });

// Pricing Configuration (BRL per Token)
const BASE_COST_PER_TOKEN = 0.00002; 

// Helper to get user data
const getUserData = async (uid: string) => {
    const userRef = ref(database, `users/${uid}`);
    const snap = await get(userRef);
    if (!snap.exists()) throw new Error("User not found");
    return snap.val();
};

const FORMATTING_RULES = `
REGRAS DE FORMATAÇÃO ESTRITA:
1. Use '### ' para Títulos e Subtítulos importantes.
2. Use '**' para destacar MUITO as palavras-chave e conceitos centrais. (Estes destaques serão exibidos em cores NEON brilhantes para alto contraste no fundo escuro).
3. Use listas com '- ' para passo-a-passo ou tópicos.
4. Use '> ' para notas de destaque, avisos ou "Dicas de Ouro".
5. NÃO use formatações complexas como tabelas Markdown sem explicação.
6. O tom deve ser encorajador e direto.
7. Use emojis estrategicamente (ex: 🚀, 💡, 🧠).
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

      const systemInstruction = systemContext 
        ? `${systemContext}\n\n${FORMATTING_RULES}`
        : `Você é a NeuroAI, uma tutora educacional de elite. Sua missão é explicar conteúdos de forma DIDÁTICA, VISUAL e PROFISSIONAL.\n${FORMATTING_RULES}`;

      const contents = history.map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      // Fix: Use ai.models.generateContent directly
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const responseText = response.text || "Sem resposta.";
      
      // Tokens estimation for billing
      const totalTokens = message.length / 4 + responseText.length / 4; 
      const isBasic = userData.plan === 'basic';
      const baseMultiplier = isBasic ? 2 : 1;
      const baseCost = totalTokens * BASE_COST_PER_TOKEN * baseMultiplier;
      const finalCost = baseCost * 80;

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
          tokensUsed: Math.floor(totalTokens)
      });

      return responseText;

    } catch (error: any) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  sendSupportMessage: async (message: string, history: ChatMessage[]): Promise<string> => {
    const systemInstruction = `
      Você é um Agente de Suporte da NeuroStudy (Nível 1).
      SEU OBJETIVO: Tentar resolver a dúvida do usuário (problemas de acesso, como usar a plataforma, dicas de estudo básico).
      REGRA CRÍTICA: Analise se consegue resolver ou se precisa escalar para um humano.
      Se NÃO conseguir resolver, peça Nome Completo e Descrição do Problema.
      VOCÊ DEVE SEMPRE RESPONDER APENAS COM UM JSON VÁLIDO.
      
      Cenário 1 (Mensagem): {"type": "message", "content": "Sua resposta..."}
      Cenário 2 (Escalonamento): {"type": "escalate", "name": "Nome", "issue": "Problema"}
    `;

    const contents = history.map(h => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            content: { type: Type.STRING },
            name: { type: Type.STRING },
            issue: { type: Type.STRING }
          },
          required: ["type"]
        }
      }
    });

    return response.text || "{\"type\": \"message\", \"content\": \"Erro no suporte.\"}";
  },

  explainError: async (questionText: string, wrongAnswerText: string, correctAnswerText: string, contextLabel: string = 'Ajuda: Questão'): Promise<string> => {
    if (!auth.currentUser) throw new Error("User not authenticated");
    const uid = auth.currentUser.uid;

    try {
      const userData = await getUserData(uid);
      if (userData.balance <= 0) throw new Error("402: Saldo insuficiente");

      const prompt = `
[DADOS DA QUESTÃO]
ENUNCIADO: "${questionText}"
[AÇÃO DO ALUNO]
ALTERNATIVA SELECIONADA (INCORRETA): "${wrongAnswerText}"
[GABARITO OFICIAL]
ALTERNATIVA CORRETA: "${correctAnswerText}"

INSTRUÇÃO: Explique o erro e o caminho correto com formatação rica.\n${FORMATTING_RULES}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const responseText = response.text || "Não foi possível gerar a explicação.";
      const totalTokens = prompt.length / 4 + responseText.length / 4;
      const finalCost = (totalTokens * BASE_COST_PER_TOKEN * (userData.plan === 'basic' ? 2 : 1)) * 80;

      await update(ref(database, `users/${uid}`), { balance: userData.balance - finalCost });
      const transRef = push(ref(database, `user_transactions/${uid}`));
      await set(transRef, {
          id: transRef.key,
          type: 'debit',
          amount: finalCost, 
          description: contextLabel,
          timestamp: Date.now(),
          currencyType: 'BRL'
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

          const errorsText = errors.map(e => `- Tópico: ${e.topic} | Questão: ${e.questionText.substring(0, 50)}...`).join('\n');
          const prompt = `Analise os erros do simulado "${simulationTitle}":\n${errorsText}\nRetorne um JSON com análise e recomendações (subjectId, topicName, reason).`;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    analysis: { type: Type.STRING },
                    recommendations: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          subjectId: { type: Type.STRING },
                          topicName: { type: Type.STRING },
                          reason: { type: Type.STRING }
                        },
                        required: ["subjectId", "topicName", "reason"]
                      }
                    }
                  },
                  required: ["analysis", "recommendations"]
                }
              }
          });

          const result = JSON.parse(response.text || "{}");
          const finalCost = 0.05; // Fixed cost for simplicity or calculated

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
