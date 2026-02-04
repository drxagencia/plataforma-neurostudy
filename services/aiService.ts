
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
      // Allow if balance > 0 (even if tiny). Block if already <= 0.
      if (userData.balance <= 0) {
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
      
      const isBasic = userData.plan === 'basic';
      
      // Base Cost Calculation
      const baseMultiplier = isBasic ? 2 : 1;
      const baseCost = totalTokens * BASE_COST_PER_TOKEN * baseMultiplier;

      // Apply Visual Multiplier to the ACTUAL DEBIT (x80 for Basic, x40 for Others)
      // This ensures the debit matches the visual representation requested by the user.
      const billingMultiplier = isBasic ? 80 : 40;
      const finalCost = baseCost * billingMultiplier;

      // 4. Deduct Balance (Allow negative)
      // Re-fetch strictly to ensure no race condition on balance (simplified here)
      const currentBalance = userData.balance || 0;
      
      // Removed zero clamp to allow negative balance for one-time overage
      await update(ref(database, `users/${uid}`), { balance: currentBalance - finalCost });

      // 5. Log Transaction
      const transRef = push(ref(database, `user_transactions/${uid}`));
      await set(transRef, {
          id: transRef.key,
          type: 'debit',
          amount: finalCost, // Storing the inflated cost so history matches debit
          description: actionLabel, // Use specific label, e.g. "NeuroTutor: Resumo"
          timestamp: Date.now(),
          currencyType: 'BRL',
          tokensUsed: totalTokens // Kept for analytics
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
      // Allow if balance > 0
      if (userData.balance <= 0) throw new Error("402: Saldo insuficiente");

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
      
      const baseMultiplier = isBasic ? 2 : 1;
      const baseCost = totalTokens * BASE_COST_PER_TOKEN * baseMultiplier;

      const billingMultiplier = isBasic ? 80 : 40;
      const finalCost = baseCost * billingMultiplier;

      const currentBalance = userData.balance || 0;
      // Removed zero clamp to allow negative balance
      await update(ref(database, `users/${uid}`), { balance: currentBalance - finalCost });

      const transRef = push(ref(database, `user_transactions/${uid}`));
      await set(transRef, {
          id: transRef.key,
          type: 'debit',
          amount: finalCost, // Storing the inflated cost
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
