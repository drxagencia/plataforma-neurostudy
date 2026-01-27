
import { auth } from "./firebaseConfig";

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export const AiService = {
  sendMessage: async (message: string, history: ChatMessage[]): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          history: history.map(h => ({ role: h.role, content: h.content })),
          uid: auth.currentUser?.uid, // Send UID for balance verification
          mode: 'chat'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${data.error || response.statusText}`);
      }

      return data.text;
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  explainError: async (questionText: string, wrongAnswerText: string, correctAnswerText: string): Promise<string> => {
    try {
      // Force strict structure to prevent AI confusion
      const promptContext = `
[DADOS DA QUESTÃO]
ENUNCIADO: "${questionText}"

[AÇÃO DO ALUNO]
ALTERNATIVA SELECIONADA (INCORRETA): "${wrongAnswerText}"

[GABARITO OFICIAL]
ALTERNATIVA CORRETA: "${correctAnswerText}"

INSTRUÇÃO: Compare a alternativa incorreta com a correta. Explique onde está o erro conceitual do aluno. Use APENAS os dados acima como verdade.
      `;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: promptContext,
          mode: 'explanation',
          uid: auth.currentUser?.uid
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
         throw new Error(`${response.status}: ${data.error || response.statusText}`);
      }
      
      return data.text;
    } catch (error) {
      console.error("AI Explanation Error:", error);
      // If error is related to plan permissions/balance, rethrow to be handled by UI
      throw error;
    }
  }
};
