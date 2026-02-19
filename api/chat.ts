
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
      Você é um Corretor Oficial do ENEM sênior, conhecido por ser técnico e justo. Sua tarefa é corrigir a redação com base nas 5 Competências (0 a 200 pontos cada).
      
      DIRETRIZES DE NOTA (SEJA RIGOROSO):
      - Nota 1000: Apenas para textos impecáveis, com tese forte, repertório sociocultural produtivo, coesão perfeita e proposta de intervenção completíssima. (Nota: 960-1000).
      - Nota Alta (900+): Textos excelentes mas com 1 ou 2 desvios leves (ex: uma vírgula, uma repetição).
      - Nota Média (700-800): Textos bons, mas com lacunas argumentativas, repertório não legitimado ou falhas de coesão.
      - Nota Baixa (<600): Tangenciamento do tema, estrutura confusa, muitos erros gramaticais ou proposta nula.

      CRITÉRIOS OBRIGATÓRIOS:
      C1 (Norma Culta): Desconte pontos por crase, concordância e ortografia.
      C2 (Tema/Tipo): Verifique se há tese explícita e estrutura dissertativa-argumentativa.
      C3 (Argumentação): O aluno defende o ponto de vista? O repertório é produtivo?
      C4 (Coesão): Exija conectivos variados entre parágrafos e intra-parágrafos. Penalize repetições.
      C5 (Proposta): Deve conter AGENTE, AÇÃO, MEIO/MODO, EFEITO e DETALHAMENTO. Se faltar um, não dê 200.

      SAÍDA ESPERADA (JSON):
      Retorne APENAS um JSON com este formato:
      {
        "c1": number, "c1_analysis": "string curta",
        "c2": number, "c2_analysis": "string curta",
        "c3": number, "c3_analysis": "string curta",
        "c4": number, "c4_analysis": "string curta",
        "c5": number, "c5_analysis": "string curta",
        "score_total": number,
        "general_feedback": "Resumo geral motivador mas realista",
        "structural_tips": "Dica prática para melhorar (ex: 'Use mais conectivos como 'Ademais'')",
        "strengths": ["Ponto forte 1", "Ponto forte 2"],
        "weaknesses": ["Ponto fraco 1", "Ponto fraco 2"]
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
