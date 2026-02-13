
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, update, push, set } from "firebase/database";
import OpenAI from "openai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Inicialização do Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);

// Inicialização da OpenAI
const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { message, history, mode, uid, image, systemOverride } = req.body;
    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const userSnap = await get(userRef);
    const user = userSnap.val();

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // --- LÓGICA DE CORREÇÃO DE REDAÇÃO ---
    if (mode === 'essay-correction') {
      const credits = user.essayCredits || 0;
      if (credits <= 0) return res.status(402).json({ error: 'Sem créditos de redação.' });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um corretor oficial do ENEM. Analise a imagem e retorne um JSON estrito com as competências c1, c2, c3, c4, c5 (notas de 0 a 200 em passos de 20), score_total, general_feedback, strengths (array), weaknesses (array) e structural_tips. Responda APENAS o JSON."
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Tema da Redação: ${message}` },
              {
                type: "image_url",
                image_url: {
                  url: image, // A imagem já vem como base64 data URL do frontend
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const resultText = response.choices[0].message.content || "{}";
      
      // Registrar custo operacional da API (Estimativa para GPT-4o-mini)
      const apiCost = 0.15; // R$ 0.15 por correção visão
      await DatabaseService_LogApiCost(uid, "Correção Redação IA", apiCost);

      return res.status(200).json({ text: resultText });
    }

    // --- LÓGICA DE CHAT / EXPLICAÇÃO ---
    const systemInstruction = systemOverride || "Você é a NeuroAI, uma tutora de elite focada em aprovação no ENEM e vestibulares militares. Seja didática, use Markdown e emojis.";
    
    // Preparar mensagens para a OpenAI
    const messages: any[] = [{ role: "system", content: systemInstruction }];
    
    if (history && history.length > 0) {
      history.forEach((h: any) => {
        messages.push({
          role: h.role === 'ai' ? 'assistant' : 'user',
          content: h.content
        });
      });
    }
    
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content;

    // Cálculo de débito do usuário (Regras do app: R$ 0.01 por msg no Pro, R$ 0.02 no Basic)
    const isBasic = user.plan === 'basic';
    const cost = isBasic ? 0.02 : 0.01;
    
    if (user.balance < cost) {
        return res.status(402).json({ error: 'Saldo insuficiente para a IA.' });
    }

    // Atualizar saldo do usuário
    await update(userRef, { balance: Math.max(0, (user.balance || 0) - cost) });

    // Registrar transação de débito
    const transRef = push(ref(db, `user_transactions/${uid}`));
    await set(transRef, {
        id: transRef.key,
        userId: uid,
        type: 'debit',
        amount: cost,
        description: mode === 'explain' ? 'Explicação de Questão' : 'Chat NeuroAI',
        timestamp: Date.now()
    });

    // Registrar Custo Operacional Real da API para o Admin (Estimativa gpt-4o-mini)
    const realApiCost = 0.002; // R$ 0.002 por mensagem média
    await DatabaseService_LogApiCost(uid, "Uso API Chat", realApiCost);
    
    return res.status(200).json({ text: aiText });

  } catch (error: any) {
    console.error("OpenAI Error:", error);
    return res.status(500).json({ error: error.message || "Erro interno no servidor de IA." });
  }
}

// Helper interno para logar custos de API no financeiro global
async function DatabaseService_LogApiCost(uid: string, desc: string, amount: number) {
    try {
        const costRef = push(ref(db, 'operational_costs'));
        await set(costRef, {
            id: costRef.key,
            name: `API OpenAI: ${desc} (User ${uid.substring(0,5)})`,
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        });
    } catch (e) {
        console.error("Erro ao logar custo operacional:", e);
    }
}
