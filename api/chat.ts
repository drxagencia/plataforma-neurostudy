
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { getDatabase, ref, get, update, push, set } from "firebase/database"; // keep modular for types/utils if available, or switch to compat logic if needed
import OpenAI from "openai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
};

// Use Compat Init
const app = firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(firebaseConfig);
const db = app.database(); // Compat DB instance

export default async function handler(req: any, res: any) {
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

    const userRef = db.ref(`users/${uid}`);
    const userSnap = await userRef.once('value');
    const user = userSnap.val();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // CHECK FOR UNLIMITED AI ACCESS
    // Checks if expiration date exists AND is in the future
    const hasUnlimitedAi = (user.aiUnlimitedExpiry && new Date(user.aiUnlimitedExpiry).getTime() > Date.now()) || user.plan === 'admin';

    // CÁLCULO DE CONSUMO COM MULTIPLICADOR 50X (Used only if not unlimited)
    const baseCost = 0.002;
    const isAdvanced = user.plan === 'advanced';
    const multiplier = isAdvanced ? 25 : 50; 
    const calculatedCost = baseCost * multiplier; // R$ 0.10 para Basic, R$ 0.05 para Advanced

    if (mode === 'essay-correction') {
      const credits = user.essayCredits || 0;
      if (credits <= 0) return res.status(402).json({ error: 'Sem créditos de redação.' });
      
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

    // Validação de saldo (SOMENTE SE NÃO TIVER IA ILIMITADA E NÃO FOR SUPORTE)
    if (mode !== 'support' && !hasUnlimitedAi && user.balance < calculatedCost) {
        return res.status(402).json({ error: 'Saldo insuficiente na NeuroAI. Faça upgrade para IA Ilimitada.' });
    }

    const sysMsg = systemOverride || "Você é a NeuroAI, tutora focado no ENEM.";
    const messages: any[] = [{ role: "system", content: sysMsg }];
    if (history) history.slice(-8).forEach((h: any) => messages.push({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.content }));
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages, temperature: 0.7 });
    const aiText = completion.choices[0].message.content;

    // Débito do valor (SOMENTE SE NÃO TIVER IA ILIMITADA E NÃO FOR SUPORTE)
    if (mode !== 'support' && !hasUnlimitedAi) {
        await userRef.update({ balance: Math.max(0, (user.balance || 0) - calculatedCost) });
        
        // Log da transação com o valor que o usuário vê (multiplicado)
        const transRef = db.ref(`user_transactions/${uid}`).push();
        await transRef.set({
            id: transRef.key,
            userId: uid,
            type: 'debit',
            amount: calculatedCost, // Valor real debitado (ex: 0.10)
            description: mode === 'explain' ? 'Explicação de Questão IA (Avulso)' : 'Chat NeuroAI Mentor (Avulso)',
            timestamp: Date.now()
        });
    }

    await DatabaseService_LogApiCost(uid, mode === 'support' ? "Suporte IA" : "NeuroAI Chat", 0.002);
    return res.status(200).json({ text: aiText });

  } catch (error: any) {
    return res.status(500).json({ error: "Falha na IA.", details: error.message });
  }
}

async function DatabaseService_LogApiCost(uid: string, desc: string, amount: number) {
    try {
        const costRef = db.ref('operational_costs').push();
        await costRef.set({
            id: costRef.key,
            name: `OpenAI: ${desc} (User ${uid.substring(0,5)})`,
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        });
    } catch (e) {}
}
