
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
// gpt-4o-mini is approx $0.15 / 1M tokens input. 
// We set a base margin. 
// 0.00002 BRL per token approx covers costs + margin.
const BASE_COST_PER_TOKEN = 0.00002; 

// Helper: Get API Key safely for Vite Environment
const getApiKey = () => {
    return (import.meta as any).env?.VITE_OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '') || '';
};

// Lazy initialization to prevent app crash on load if key is missing
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
            dangerouslyAllowBrowser: true // Allowed for client-side demo; ideally use backend proxy
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

export const AiService = {
  sendMessage: async (message: string, history: ChatMessage[], actionLabel: string = 'NeuroAI Tutor'): Promise<string> => {
    if (!auth.currentUser) throw new Error("User not authenticated");
    const uid = auth.currentUser.uid;

    try {
      // 1. Get User Data for Plan Check (Optimistic check before call)
      const userData = await getUserData(uid);
      if (userData.balance <= 0.001) {
          throw new Error("402: Saldo insuficiente");
      }

      // 2. Call OpenAI
      const ai = getAiInstance();
      const systemInstruction = "Você é a NeuroAI, uma tutora educacional de elite. Seja didática, direta e use formatação Markdown rica (negrito, listas).";
      
      // Map history to OpenAI format
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
      
      // 3. Calculate Token Usage & Cost
      const usage = completion.usage;
      const totalTokens = usage?.total_tokens || 0;
      
      // Dynamic Pricing Rule
      // Basic Plan: Pays 2x multiplier
      // Advanced/Intermediate/Admin: Pays 1x multiplier
      const isBasic = userData.plan === 'basic';
      const multiplier = isBasic ? 2 : 1;
      
      const cost = totalTokens * BASE_COST_PER_TOKEN * multiplier;

      // 4. Deduct Balance (Atomic-like update)
      // Re-fetch strictly to ensure no race condition on balance (simplified here)
      const currentBalance = userData.balance || 0;
      
      if (currentBalance < cost) {
          // Edge case: ran out during generation
          await update(ref(database, `users/${uid}`), { balance: 0 });
      } else {
          await update(ref(database, `users/${uid}`), { balance: currentBalance - cost });
      }

      // 5. Log Transaction
      const transRef = push(ref(database, `user_transactions/${uid}`));
      await set(transRef, {
          id: transRef.key,
          type: 'debit',
          amount: cost,
          description: actionLabel, // Use specific label, e.g. "NeuroTutor: Resumo"
          timestamp: Date.now(),
          currencyType: 'BRL',
          tokensUsed: totalTokens // Kept for analytics but not shown in description
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
      if (userData.balance <= 0.001) throw new Error("402: Saldo insuficiente");

      const ai = getAiInstance();
      const prompt = `
[DADOS DA QUESTÃO]
ENUNCIADO: "${questionText}"

[AÇÃO DO ALUNO]
ALTERNATIVA SELECIONADA (INCORRETA): "${wrongAnswerText}"

[GABARITO OFICIAL]
ALTERNATIVA CORRETA: "${correctAnswerText}"

INSTRUÇÃO: Compare a alternativa incorreta com a correta. Explique onde está o erro conceitual do aluno. Use APENAS os dados acima como verdade.
      `;

      const completion = await ai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
      });

      const responseText = completion.choices[0]?.message?.content || "Não foi possível gerar a explicação.";

      // Billing for explanation
      const usage = completion.usage;
      const totalTokens = usage?.total_tokens || 0;
      const isBasic = userData.plan === 'basic';
      const multiplier = isBasic ? 2 : 1;
      const cost = totalTokens * BASE_COST_PER_TOKEN * multiplier;

      const currentBalance = userData.balance || 0;
      await update(ref(database, `users/${uid}`), { balance: Math.max(0, currentBalance - cost) });

      const transRef = push(ref(database, `user_transactions/${uid}`));
      await set(transRef, {
          id: transRef.key,
          type: 'debit',
          amount: cost,
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
  }
};
