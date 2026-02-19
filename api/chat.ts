
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
      
      const promptSistema = `
      Você é um Corretor Oficial do ENEM sênior, conhecido por ser técnico e extremamente rigoroso.
      
      REGRAS RÍGIDAS DE PONTUAÇÃO (IMPORTANTE):
      1. Atribua nota de 0 a 200 para CADA competência (C1 a C5).
      2. AS NOTAS DEVEM SER OBRIGATORIAMENTE MÚLTIPLOS DE 20 (Ex: 0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200). NUNCA atribua notas quebradas como 15, 125, 130 ou 105.
      3. A nota total deve ser a soma exata das competências.
      
      CRITÉRIOS OBRIGATÓRIOS:
      C1 (Norma Culta): Desconte pontos a cada erro de crase, concordância e ortografia. Seja chato com vírgulas.
      C2 (Tema/Tipo): Verifique se há tese explícita e estrutura dissertativa-argumentativa completa.
      C3 (Argumentação): O aluno defende o ponto de vista? O repertório é produtivo e legitimado?
      C4 (Coesão): Exija conectivos variados entre parágrafos e intra-parágrafos. Penalize repetições de palavras.
      C5 (Proposta): Deve conter AGENTE, AÇÃO, MEIO/MODO, EFEITO e DETALHAMENTO. Se faltar um, desconte 40 pontos.

      SAÍDA ESPERADA (JSON):
      Retorne APENAS um JSON com este formato exato:
      {
        "c1": number, "c1_analysis": "Análise detalhada do porquê desta nota na C1 (aponte erros específicos se houver)",
        "c2": number, "c2_analysis": "Análise detalhada da C2 (estrutura e tema)",
        "c3": number, "c3_analysis": "Análise detalhada da C3 (projeto de texto e argumentação)",
        "c4": number, "c4_analysis": "Análise detalhada da C4 (conectivos e fluidez)",
        "c5": number, "c5_analysis": "Análise detalhada da C5 (presença dos 5 elementos)",
        "score_total": number,
        "general_feedback": "Resumo geral motivador mas realista sobre o desempenho",
        "structural_tips": "Uma dica prática e avançada para melhorar a estrutura na próxima",
        "strengths": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
        "weaknesses": ["Ponto fraco 1 (prioridade)", "Ponto fraco 2"]
      }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: promptSistema },
          { role: "user", content: [{ type: "text", text: `Tema da Redação: ${message}` }, { type: "image_url", image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }] }
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
