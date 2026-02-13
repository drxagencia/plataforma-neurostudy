
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, update, push, set } from "firebase/database";
import OpenAI from "openai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Singleton Firebase initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const rawApiKey = process.env.API_KEY || "";
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, '');

  if (!apiKey) return res.status(500).json({ error: "Configuração de servidor incompleta." });

  const openai = new OpenAI({ apiKey });

  try {
    const { message, history, mode, uid, image, systemOverride } = req.body;
    if (!uid) return res.status(401).json({ error: 'User ID required' });

    const userRef = ref(db, `users/${uid}`);
    const userSnap = await get(userRef);
    const user = userSnap.val();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Multiplicador Proporcional (50x do custo base de 0.002)
    const baseCost = 0.002;
    const isAdvanced = user.plan === 'advanced';
    const multiplier = isAdvanced ? 25 : 50; // Advanced paga metade por msg
    const calculatedCost = baseCost * multiplier;

    // --- MODO CORREÇÃO DE REDAÇÃO ---
    if (mode === 'essay-correction') {
      const credits = user.essayCredits || 0;
      if (credits <= 0) return res.status(402).json({ error: 'Sem créditos de redação.' });
      if (!image) return res.status(400).json({ error: 'Imagem obrigatória.' });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um corretor oficial do ENEM. Retorne JSON: c1, c2, c3, c4, c5 (0-200), score_total, general_feedback, structural_tips." },
          { role: "user", content: [{ type: "text", text: `Tema: ${message}` }, { type: "image_url", image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }] }
        ],
        response_format: { type: "json_object" }
      });

      await DatabaseService_LogApiCost(uid, "Correção Redação IA", 0.15);
      return res.status(200).json({ text: response.choices[0].message.content });
    }

    // --- MODO CHAT / EXPLICAÇÃO ---
    if (user.balance < calculatedCost) {
        return res.status(402).json({ error: 'Saldo insuficiente na NeuroAI.' });
    }

    const sysMsg = systemOverride || "Você é a NeuroAI, tutora focado no ENEM.";
    const messages: any[] = [{ role: "system", content: sysMsg }];
    if (history) history.slice(-8).forEach((h: any) => messages.push({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.content }));
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages, temperature: 0.7 });
    const aiText = completion.choices[0].message.content;

    // Débito e Log de Transação Real
    await update(userRef, { balance: Math.max(0, (user.balance || 0) - calculatedCost) });
    const transRef = push(ref(db, `user_transactions/${uid}`));
    await set(transRef, {
        id: transRef.key,
        userId: uid,
        type: 'debit',
        amount: calculatedCost,
        description: mode === 'explain' ? 'Explicação de Questão IA' : 'Chat NeuroAI Mentor',
        timestamp: Date.now()
    });

    await DatabaseService_LogApiCost(uid, "NeuroAI Chat", 0.002);
    return res.status(200).json({ text: aiText });

  } catch (error: any) {
    if (error?.status === 401) return res.status(401).json({ error: "Chave de API Inválida." });
    return res.status(500).json({ error: "Falha na IA.", details: error.message });
  }
}

async function DatabaseService_LogApiCost(uid: string, desc: string, amount: number) {
    try {
        const costRef = push(ref(db, 'operational_costs'));
        await set(costRef, {
            id: costRef.key,
            name: `OpenAI: ${desc} (User ${uid.substring(0,5)})`,
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        });
    } catch (e) {}
}
