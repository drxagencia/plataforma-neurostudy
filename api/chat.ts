
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, update, push, set } from "firebase/database";
import OpenAI from "openai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Inicialização do Firebase (Singleton para Serverless)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verificar Chave de API
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("ERRO CRÍTICO: Variável de ambiente API_KEY não configurada no Vercel.");
    return res.status(500).json({ error: "Configuração de servidor incompleta (API_KEY missing)." });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const { message, history, mode, uid, image, systemOverride } = req.body;
    
    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const userSnap = await get(userRef);
    const user = userSnap.val();

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });

    // --- LÓGICA DE CORREÇÃO DE REDAÇÃO (VISION) ---
    if (mode === 'essay-correction') {
      const credits = user.essayCredits || 0;
      if (credits <= 0) return res.status(402).json({ error: 'Sem créditos de redação disponíveis.' });

      if (!image) return res.status(400).json({ error: 'Imagem da redação é obrigatória para este modo.' });

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
                  url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const resultText = response.choices[0].message.content || "{}";
      await DatabaseService_LogApiCost(uid, "Correção Redação IA", 0.15);

      return res.status(200).json({ text: resultText });
    }

    // --- LÓGICA DE CHAT / EXPLICAÇÃO ---
    const systemInstruction = systemOverride || "Você é a NeuroAI, uma tutora de elite focada em aprovação no ENEM e vestibulares militares. Seja didática, use Markdown e emojis.";
    
    const messages: any[] = [{ role: "system", content: systemInstruction }];
    
    if (history && history.length > 0) {
      history.slice(-10).forEach((h: any) => { // Pegar apenas as últimas 10 para economizar tokens
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
      max_tokens: 1500,
    });

    const aiText = completion.choices[0].message.content;

    // Débito do usuário
    const isBasic = user.plan === 'basic';
    const cost = isBasic ? 0.02 : 0.01;
    
    if (user.balance < cost) {
        return res.status(402).json({ error: 'Saldo insuficiente para processar a dúvida com IA.' });
    }

    // Atualizar saldo e logar
    await update(userRef, { balance: Math.max(0, (user.balance || 0) - cost) });
    const transRef = push(ref(db, `user_transactions/${uid}`));
    await set(transRef, {
        id: transRef.key,
        userId: uid,
        type: 'debit',
        amount: cost,
        description: mode === 'explain' ? 'Explicação de Questão' : 'Chat NeuroAI',
        timestamp: Date.now()
    });

    await DatabaseService_LogApiCost(uid, "Uso API Chat", 0.002);
    
    return res.status(200).json({ text: aiText });

  } catch (error: any) {
    console.error("ERRO OPENAI:", error?.response?.data || error.message);
    return res.status(500).json({ 
      error: "Falha na comunicação com a inteligência artificial.",
      details: error.message 
    });
  }
}

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
