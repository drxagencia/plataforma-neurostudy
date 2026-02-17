
import { auth } from "./firebaseConfig";
import { ChatMessage } from "../types";

export const AiService = {
  /**
   * Envia uma mensagem para o Mentor NeuroAI (OpenAI GPT-4o-mini)
   */
  sendMessage: async (message: string, history: ChatMessage[], actionLabel: string = 'NeuroAI Tutor', systemContext?: string): Promise<string> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Não autenticado");

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, uid, systemOverride: systemContext, mode: 'chat' })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro na IA");
    }

    const data = await response.json();
    return data.text;
  },

  /**
   * Suporte técnico via IA
   */
  sendSupportMessage: async (message: string, history: ChatMessage[]): Promise<string> => {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message, 
            history, 
            uid: auth.currentUser?.uid, 
            mode: 'support',
            systemOverride: "Você é o suporte técnico da NeuroStudy. Ajude o aluno. Se não resolver, peça Nome e Problema para escalar. Retorne JSON: {\"type\": \"message\", \"content\": \"...\"} ou {\"type\": \"escalate\", \"name\": \"...\", \"issue\": \"...\"}"
        })
    });
    const data = await response.json();
    return data.text;
  },

  /**
   * Explicação didática de erros em questões
   */
  explainError: async (question: string, wrongAnswer: string, correctAnswer: string, context: string): Promise<string> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Não autenticado");

    const message = `Questão: ${question}\nResposta Errada Escolhida: ${wrongAnswer}\nResposta Correta: ${correctAnswer}\nContexto: ${context}`;
    const systemContext = "Você é um professor experiente. Explique de forma clara e didática por que a alternativa escolhida está incorreta e o raciocínio para chegar na correta. Use Markdown. IMPORTANTE: Não use LaTeX ou blocos matemáticos (como \\[, \\], \\frac, \\text). Para fórmulas, use sempre notação linear simples (ex: Velocidade = Distancia / Tempo) ou texto corrido para garantir a legibilidade.";

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, uid, systemOverride: systemContext, mode: 'explain' })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro na IA");
    }

    const data = await response.json();
    return data.text;
  },

  /**
   * Gera plano de estudos baseado no histórico de erros
   */
  generateStudyPlan: async (simTitle: string, errors: { topic: string, questionText: string }[]): Promise<any> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Não autenticado");

    const message = `Análise do Simulado: ${simTitle}\nLista de Erros:\n${JSON.stringify(errors)}`;
    const systemContext = "Analise os erros do aluno e gere um plano de estudos personalizado focado em cobrir as lacunas de conhecimento. Retorne OBRIGATORIAMENTE um JSON com as chaves 'analysis' (string) e 'recommendations' (array de objetos {subjectId, topicName, reason}).";

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, uid, systemOverride: systemContext, mode: 'study-plan' })
    });

    const data = await response.json();
    try {
        // Tenta parsear o texto retornado como JSON caso venha dentro de blocos de markdown
        let cleanText = data.text;
        if (cleanText.includes('```json')) {
            cleanText = cleanText.split('```json')[1].split('```')[0].trim();
        } else if (cleanText.includes('```')) {
            cleanText = cleanText.split('```')[1].split('```')[0].trim();
        }
        return JSON.parse(cleanText);
    } catch {
        return { analysis: data.text, recommendations: [] };
    }
  }
};
