
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

    // --- CHECK FOR EXPIRATION LOGIC ---
    // Verifica se a data de expiração existe e se já passou
    if (user.aiUnlimitedExpiry) {
        const expiryDate = new Date(user.aiUnlimitedExpiry).getTime();
        const now = Date.now();
        
        // Se expirou e ainda não está marcado como "expirado" (e não é admin/permanente)
        if (expiryDate < now && user.ia_ilimitada !== 'expirado' && user.plan !== 'admin' && user.ia_ilimitada !== true && user.ia_ilimitada !== "true") {
            // Atualiza no banco para "expirado"
            await userRef.update({ ia_ilimitada: 'expirado' });
            // Atualiza objeto local para bloquear a requisição atual
            user.ia_ilimitada = 'expirado';
        }
    }

    // CHECK FOR UNLIMITED AI ACCESS
    // Regra: Admin OU Flag ia_ilimitada "true" (permanente) OU Data de validade no futuro
    // Se "expirado", hasUnlimitedAi deve ser FALSE
    const hasUnlimitedAi = 
        user.plan === 'admin' || 
        user.ia_ilimitada === true || 
        user.ia_ilimitada === "true" || 
        (user.aiUnlimitedExpiry && new Date(user.aiUnlimitedExpiry).getTime() > Date.now() && user.ia_ilimitada !== 'expirado');

    // CÁLCULO DE CONSUMO COM MULTIPLICADOR 50X (Used only if not unlimited)
    const baseCost = 0.002;
    const isAdvanced = user.plan === 'advanced';
    const multiplier = isAdvanced ? 25 : 50; 
    const calculatedCost = baseCost * multiplier; // R$ 0.10 para Basic, R$ 0.05 para Advanced

    if (mode === 'essay-correction') {
      const credits = user.essayCredits || 0;
      if (credits <= 0) return res.status(402).json({ error: 'Sem créditos de redação.' });
      
      const promptSistema = `
      Você é um Corretor Oficial do ENEM experiente. 
      Sua correção deve ser **técnica, justa e pedagógica**, similar à banca oficial.
      
      DIRETRIZES DE CORREÇÃO (IMPORTANTE):
      1. Seja exigente com a estrutura, mas **não puna excessivamente** erros gramaticais isolados se eles não prejudicarem a compreensão.
      2. Valorize bons argumentos e repertório sociocultural produtivo. Se o texto for bom, dê notas altas (acima de 900).
      3. Notas baixas (abaixo de 600) apenas para fugas ao tema ou textos muito ruins.
      4. Se o texto merecer 1000, DÊ 1000.
      
      REGRAS RÍGIDAS DE PONTUAÇÃO:
      1. Atribua nota de 0 a 200 para CADA competência (C1 a C5).
      2. AS NOTAS DEVEM SER OBRIGATORIAMENTE MÚLTIPLOS DE 20 (Ex: 0, 20, 40... 160, 180, 200).
      3. A nota total deve ser a soma exata das competências.
      
      SAÍDA ESPERADA (JSON):
      Retorne APENAS um JSON com este formato exato:
      {
        "c1": number, "c1_analysis": "Análise C1 (Norma Culta)",
        "c2": number, "c2_analysis": "Análise C2 (Tema/Tipo)",
        "c3": number, "c3_analysis": "Análise C3 (Argumentação)",
        "c4": number, "c4_analysis": "Análise C4 (Coesão)",
        "c5": number, "c5_analysis": "Análise C5 (Proposta)",
        "score_total": number,
        "general_feedback": "Feedback construtivo e motivador",
        "structural_tips": "Dica prática para evoluir",
        "strengths": ["Ponto forte 1", "Ponto forte 2"],
        "weaknesses": ["Ponto a melhorar 1", "Ponto a melhorar 2"]
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

    // Se estiver "expirado" ou sem saldo, bloqueia
    if (mode !== 'support' && !hasUnlimitedAi) {
        if (user.ia_ilimitada === 'expirado') {
             // Retorna status especial para o front saber que expirou
             return res.status(403).json({ error: 'PLAN_EXPIRED', message: 'Seu plano de IA Ilimitada expirou.' });
        }
        if (user.balance < calculatedCost) {
            return res.status(402).json({ error: 'Saldo insuficiente na NeuroAI. Faça upgrade para IA Ilimitada.' });
        }
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
