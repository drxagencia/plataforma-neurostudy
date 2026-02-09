
import { auth } from "./firebaseConfig";
import { ChatMessage } from "../types";

export const AiService = {
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

  sendSupportMessage: async (message: string, history: ChatMessage[]): Promise<string> => {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message, 
            history, 
            uid: auth.currentUser?.uid, 
            mode: 'support',
            systemOverride: "Você é suporte técnico. Se não resolver, peça Nome e Problema. Retorne JSON: {\"type\": \"message\", \"content\": \"...\"} ou {\"type\": \"escalate\", \"name\": \"...\", \"issue\": \"...\"}"
        })
    });
    const data = await response.json();
    return data.text;
  },

  explainError: async (question: string, wrongAnswer: string, correctAnswer: string, context: string): Promise<string> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Não autenticado");

    const message = `Questão: ${question}\nResposta Errada: ${wrongAnswer}\nResposta Correta: ${correctAnswer}\nContexto: ${context}`;
    const systemContext = "Você é um professor experiente. Explique por que a alternativa escolhida pelo aluno está incorreta e por que a correta é a verdadeira. Seja didático e use Markdown.";

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, uid, systemOverride: systemContext, mode: 'explain' })
    });

    const data = await response.json();
    return data.text;
  },

  generateStudyPlan: async (simTitle: string, errors: { topic: string, questionText: string }[]): Promise<any> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Não autenticado");

    const message = `Simulado: ${simTitle}\nErros: ${JSON.stringify(errors)}`;
    const systemContext = "Analise os erros do aluno e gere um plano de estudos personalizado em JSON. Inclua 'analysis' (string) e 'recommendations' (array de {subjectId, topicName, reason}).";

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, uid, systemOverride: systemContext, mode: 'study-plan' })
    });

    const data = await response.json();
    try {
        return JSON.parse(data.text);
    } catch {
        return { analysis: data.text, recommendations: [] };
    }
  }
};
