export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export const AiService = {
  sendMessage: async (message: string, history: ChatMessage[]): Promise<string> => {
    try {
      // Chamada para a nossa Serverless Function
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          history: history.map(h => ({ role: h.role, content: h.content })) // Envia apenas o necessário
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
  }
};