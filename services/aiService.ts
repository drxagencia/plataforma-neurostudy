
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

// Helper to check/deduct balance
const checkAndDeductBalance = async (uid: string, amount: number, description: string) => {
    const userRef = ref(database, `users/${uid}`);
    const snap = await get(userRef);
    if (!snap.exists()) throw new Error("User not found");
    
    const userData = snap.val();
    const currentBalance = userData.balance || 0;

    if (currentBalance < amount) {
        throw new Error("402: Saldo insuficiente");
    }

    const newBalance = currentBalance - amount;
    await update(userRef, { balance: newBalance });

    const transRef = push(ref(database, `user_transactions/${uid}`));
    await set(transRef, {
        id: transRef.key,
        type: 'debit',
        amount: amount,
        description: description,
        timestamp: Date.now(),
        currencyType: 'BRL'
    });
};

export const AiService = {
  sendMessage: async (message: string, history: ChatMessage[]): Promise<string> => {
    if (!auth.currentUser) throw new Error("User not authenticated");

    // NEW RAW COST: 0.0002
    // Multiplied by 100 (Advanced) = R$ 0.02 displayed
    // Multiplied by 200 (Basic) = R$ 0.04 displayed
    const COST = 0.0002; 

    try {
      // 1. Check Balance
      await checkAndDeductBalance(auth.currentUser.uid, COST, "NeuroAI (Chat)");

      // 2. Call OpenAI
      const ai = getAiInstance();
      const systemInstruction = "Você é a NeuroAI, uma tutora educacional de elite. Seja didática, direta e use formatação Markdown rica (negrito, listas).";
      
      // Map history to OpenAI format
      const openaiHistory = history.map(h => ({
          role: h.role === 'ai' ? 'assistant' : 'user',
          content: h.content
      })) as OpenAI.Chat.ChatCompletionMessageParam[];

      // Add system message at the start
      const messages = [
          { role: 'system', content: systemInstruction },
          ...openaiHistory,
          { role: 'user', content: message }
      ] as OpenAI.Chat.ChatCompletionMessageParam[];

      const completion = await ai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: messages,
      });

      return completion.choices[0]?.message?.content || "Sem resposta.";

    } catch (error: any) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  explainError: async (questionText: string, wrongAnswerText: string, correctAnswerText: string): Promise<string> => {
    if (!auth.currentUser) throw new Error("User not authenticated");

    // Explanation Raw Cost (Slightly higher)
    const COST = 0.0005; 

    try {
      // 1. Check Balance
      await checkAndDeductBalance(auth.currentUser.uid, COST, "NeuroAI (Explicação)");

      // 2. Call OpenAI
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

      return completion.choices[0]?.message?.content || "Não foi possível gerar a explicação.";

    } catch (error) {
      console.error("AI Explanation Error:", error);
      throw error;
    }
  }
};
