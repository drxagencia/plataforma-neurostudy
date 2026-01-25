import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Configuração de CORS para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.SECRET_APIKEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key not found.' });
  }

  try {
    const { message, history } = req.body;

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Usando o modelo Flash Lite (mais econômico) conforme solicitado
    const modelId = 'gemini-flash-lite-latest'; 

    // Construção do prompt com histórico simples
    let fullPrompt = "Você é o Tutor IA da NeuroStudy. Responda de forma didática, direta e motivadora para estudantes do ENEM/Vestibulares.\n\n";
    
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        fullPrompt += `${msg.role === 'user' ? 'Aluno' : 'Tutor'}: ${msg.content}\n`;
      });
    }
    
    fullPrompt += `Aluno: ${message}\nTutor:`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: fullPrompt,
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
}