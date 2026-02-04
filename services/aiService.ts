
import { auth, database } from "./firebaseConfig";
import { GoogleGenAI } from "@google/genai";
import { ref, push, set, get, update } from "firebase/database";

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

// Initialize GenAI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const GEMINI_MODEL = "gemini-3-flash-preview";

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
    if (!process.env.API_KEY) throw new Error("Server Config Error: Missing Gemini API Key. Configure process.env.API_KEY");
    if (!auth.currentUser) throw new Error("User not authenticated");

    const COST = 0.02; // Fixed cost per message for simplicity

    try {
      // 1. Check Balance
      await checkAndDeductBalance(auth.currentUser.uid, COST, "NeuroAI (Chat)");

      // 2. Call AI
      const systemInstruction = "Você é a NeuroAI, uma tutora educacional de elite. Seja didática, direta e use formatação Markdown rica (negrito, listas).";
      
      const geminiHistory = history.map(h => ({
          role: h.role === 'ai' ? 'model' : 'user',
          parts: [{ text: h.content }]
      }));

      const chat = ai.chats.create({
          model: GEMINI_MODEL,
          history: geminiHistory,
          config: { systemInstruction }
      });

      const result = await chat.sendMessage({ message: message });
      return result.text || "Sem resposta.";

    } catch (error: any) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  explainError: async (questionText: string, wrongAnswerText: string, correctAnswerText: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("Server Config Error: Missing Gemini API Key");
    if (!auth.currentUser) throw new Error("User not authenticated");

    const COST = 0.05; // Slightly higher for explanation

    try {
      // 1. Check Balance
      await checkAndDeductBalance(auth.currentUser.uid, COST, "NeuroAI (Explicação)");

      // 2. Call AI
      const prompt = `
[DADOS DA QUESTÃO]
ENUNCIADO: "${questionText}"

[AÇÃO DO ALUNO]
ALTERNATIVA SELECIONADA (INCORRETA): "${wrongAnswerText}"

[GABARITO OFICIAL]
ALTERNATIVA CORRETA: "${correctAnswerText}"

INSTRUÇÃO: Compare a alternativa incorreta com a correta. Explique onde está o erro conceitual do aluno. Use APENAS os dados acima como verdade.
      `;

      const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt
      });

      return response.text || "Não foi possível gerar a explicação.";

    } catch (error) {
      console.error("AI Explanation Error:", error);
      throw error;
    }
  }
};
