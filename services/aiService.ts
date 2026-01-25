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
          history: history.map(h => ({ role: h.role, content: h.content }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na comunicação: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  explainError: async (questionText: string, wrongAnswerText: string, correctAnswerText: string): Promise<string> => {
    try {
      const promptContext = `
        Questão: "${questionText}"
        Aluno marcou (Errada): "${wrongAnswerText}"
        A correta era: "${correctAnswerText}"
      `;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: promptContext,
          mode: 'explanation' 
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar explicação");
      
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("AI Explanation Error:", error);
      return "Ops, não consegui analisar seu erro agora. Tente novamente mais tarde.";
    }
  }
};