
import { Subject, Announcement } from './types';
import { 
  Beaker, 
  BookOpen, 
  Calculator, 
  Languages, 
  Microscope, 
  PenTool, 
  Scale,
  BrainCircuit,
  ScrollText,
  Map,
  MessageCircle,
  Zap,
  Target,
  Sword
} from 'lucide-react';

export const APP_NAME = "NeuroStudy AI";

// Links de Pagamento
export const KIRVANO_LINKS = {
    balance_recharge: "https://kirvano.com/checkout/...", // Link genérico ou específico para saldo
    essay_credits: "https://kirvano.com/checkout/...",    // Link genérico (fallback)
    
    // Novos Pacotes de Redação (Cartão)
    essay_pack_basic: "https://kirvano.com/checkout/...",        // 8 Créditos - R$ 17
    essay_pack_intermediate: "https://kirvano.com/checkout/...", // 14 Créditos - R$ 27
    essay_pack_advanced: "https://kirvano.com/checkout/...",     // 30 Créditos - R$ 47

    // Planos IA Ilimitada (Cartão)
    ai_unlimited_monthly: "https://kirvano.com/checkout/...",   // R$ 37
    ai_unlimited_semester: "https://kirvano.com/checkout/...",  // R$ 57
    ai_unlimited_yearly: "https://kirvano.com/checkout/...",    // R$ 97

    upgrade_monthly: "https://kirvano.com/checkout/...",  // Upgrade Mensal
    upgrade_yearly: "https://kirvano.com/checkout/..."    // Upgrade Anual
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Super Revisão ENEM 2025',
    description: 'Acesse o cronograma completo da reta final.',
    image: 'https://picsum.photos/seed/enem/800/400',
    ctaText: 'Ver Cronograma'
  },
  {
    id: '2',
    title: 'Novo Módulo de Redação',
    description: 'Aprenda a estruturar sua nota 1000 com IA.',
    image: 'https://picsum.photos/seed/writing/800/400',
    ctaText: 'Começar Agora'
  }
];

// --- GAMIFICATION SYSTEM ---

export const XP_VALUES = {
    QUESTION_CORRECT: 15,
    QUESTION_WRONG: 5,
    LESSON_WATCHED: 50,
    SIMULATION_FINISH: 100, // + score * 2
    ESSAY_CORRECTION: 50,
    ESSAY_GOOD_SCORE_BONUS: 100, // if > 800
    AI_CHAT_MESSAGE: 5,
    DAILY_LOGIN_BASE: 50,
    DAILY_LOGIN_STREAK_BONUS: 10,
    LIKE_COMMENT: 10, // Max 5 per day
    FULLSCREEN_MODE: 20
};

export interface Rank {
    name: string;
    minXp: number;
    colorClass: string; // Text color
    bgClass: string;   // Badge bg
    borderClass: string; // Badge border
    effect?: string; // 'glow', 'shine'
}

export const RANKS: Rank[] = [
    { name: 'Bronze', minXp: 0, colorClass: 'text-orange-700', bgClass: 'bg-orange-900/20', borderClass: 'border-orange-700/50' },
    
    { name: 'Prata I', minXp: 500, colorClass: 'text-slate-300', bgClass: 'bg-slate-800', borderClass: 'border-slate-500' },
    { name: 'Prata II', minXp: 1000, colorClass: 'text-slate-300', bgClass: 'bg-slate-800', borderClass: 'border-slate-400' },
    { name: 'Prata III', minXp: 1500, colorClass: 'text-slate-200', bgClass: 'bg-slate-700', borderClass: 'border-slate-300' },

    { name: 'Ouro I', minXp: 2000, colorClass: 'text-yellow-500', bgClass: 'bg-yellow-900/20', borderClass: 'border-yellow-600' },
    { name: 'Ouro II', minXp: 3000, colorClass: 'text-yellow-400', bgClass: 'bg-yellow-900/30', borderClass: 'border-yellow-500' },
    { name: 'Ouro III', minXp: 4000, colorClass: 'text-yellow-300', bgClass: 'bg-yellow-900/40', borderClass: 'border-yellow-400' },
    { name: 'Ouro IV', minXp: 5000, colorClass: 'text-amber-300', bgClass: 'bg-amber-900/40', borderClass: 'border-amber-400' },

    { name: 'Platina I', minXp: 6000, colorClass: 'text-cyan-600', bgClass: 'bg-cyan-900/20', borderClass: 'border-cyan-600' },
    { name: 'Platina II', minXp: 8000, colorClass: 'text-cyan-500', bgClass: 'bg-cyan-900/20', borderClass: 'border-cyan-500' },
    { name: 'Platina III', minXp: 10000, colorClass: 'text-cyan-400', bgClass: 'bg-cyan-900/30', borderClass: 'border-cyan-400' },
    { name: 'Platina IV', minXp: 12000, colorClass: 'text-cyan-300', bgClass: 'bg-cyan-900/30', borderClass: 'border-cyan-300' },
    { name: 'Platina V', minXp: 14000, colorClass: 'text-cyan-200', bgClass: 'bg-cyan-900/40', borderClass: 'border-cyan-200', effect: 'shine' },

    { name: 'Diamante I', minXp: 16000, colorClass: 'text-blue-400', bgClass: 'bg-blue-900/30', borderClass: 'border-blue-500' },
    { name: 'Diamante II', minXp: 21000, colorClass: 'text-blue-300', bgClass: 'bg-blue-900/40', borderClass: 'border-blue-400' },
    { name: 'Diamante III', minXp: 26000, colorClass: 'text-blue-200', bgClass: 'bg-blue-900/50', borderClass: 'border-blue-300', effect: 'glow' },
    { name: 'Diamante IV', minXp: 31000, colorClass: 'text-indigo-300', bgClass: 'bg-indigo-900/50', borderClass: 'border-indigo-400', effect: 'glow' },
    { name: 'Diamante V', minXp: 36000, colorClass: 'text-indigo-200', bgClass: 'bg-indigo-900/60', borderClass: 'border-indigo-300', effect: 'glow' },

    { name: 'Lendário I', minXp: 41000, colorClass: 'text-purple-400', bgClass: 'bg-purple-900/40', borderClass: 'border-purple-500', effect: 'glow' },
    { name: 'Lendário II', minXp: 51000, colorClass: 'text-fuchsia-400', bgClass: 'bg-fuchsia-900/50', borderClass: 'border-fuchsia-500', effect: 'glow' },
    { name: 'Lendário III', minXp: 61000, colorClass: 'text-pink-400', bgClass: 'bg-pink-900/60', borderClass: 'border-pink-500', effect: 'glow' },

    { name: 'Mestre', minXp: 100000, colorClass: 'text-red-500', bgClass: 'bg-red-950/80', borderClass: 'border-red-500', effect: 'pulse' },
    { name: 'Grande Mestre', minXp: 200000, colorClass: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500', bgClass: 'bg-black/80', borderClass: 'border-yellow-500', effect: 'rainbow' }
];

export const getRank = (xp: number) => {
    // Reverse find to get the highest rank achieved
    // Ensure Bronze is returned correctly if xp is 0
    if (xp === undefined || xp === null) return RANKS[0];
    return [...RANKS].reverse().find(r => xp >= r.minXp) || RANKS[0];
};

export const getNextRank = (xp: number) => {
    return RANKS.find(r => r.minXp > xp);
};

// IDs must match database keys (lowercase, no accents)
export const SUBJECTS: Subject[] = [
  { id: 'matematica', name: 'Matemática', iconName: 'Calculator', color: 'text-blue-400', category: 'regular' },
  { id: 'fisica', name: 'Física', iconName: 'Zap', color: 'text-yellow-400', category: 'regular' },
  { id: 'quimica', name: 'Química', iconName: 'Beaker', color: 'text-purple-400', category: 'regular' },
  { id: 'biologia', name: 'Biologia', iconName: 'Microscope', color: 'text-green-400', category: 'regular' },
  { id: 'literatura', name: 'Literatura', iconName: 'BookOpen', color: 'text-pink-400', category: 'regular' },
  { id: 'gramatica', name: 'Gramática', iconName: 'PenTool', color: 'text-red-400', category: 'regular' },
  { id: 'historia', name: 'História', iconName: 'ScrollText', color: 'text-orange-400', category: 'regular' },
  { id: 'geografia', name: 'Geografia', iconName: 'Map', color: 'text-emerald-400', category: 'regular' },
  { id: 'filosofia', name: 'Filosofia/Soc.', iconName: 'Scale', color: 'text-indigo-400', category: 'regular' },
  { id: 'ingles', name: 'Inglês', iconName: 'Languages', color: 'text-cyan-400', category: 'regular' },
  { id: 'espanhol', name: 'Espanhol', iconName: 'MessageCircle', color: 'text-rose-400', category: 'regular' },
  { id: 'interpretacao', name: 'Interpretação', iconName: 'BrainCircuit', color: 'text-teal-400', category: 'regular' },
  // Military
  { id: 'esa', name: 'ESA', iconName: 'Target', color: 'text-emerald-600', category: 'military' },
  { id: 'espcex', name: 'ESPCEX', iconName: 'Sword', color: 'text-emerald-800', category: 'military' },
];

export const MOCK_TOPICS: Record<string, string[]> = {
  'fisica': ['Cinemática', 'Dinâmica', 'Eletrodinâmica', 'Termodinâmica', 'Óptica'],
  'matematica': ['Álgebra', 'Geometria Plana', 'Geometria Espacial', 'Trigonometria', 'Estatística'],
  'quimica': ['Química Geral', 'Físico-Química', 'Química Orgânica', 'Atomística'],
};

export const MOCK_SUBTOPICS: Record<string, string[]> = {
  'Cinemática': ['Movimento Uniforme', 'Movimento Uniformemente Variado', 'Vetores', 'Lançamento Oblíquo'],
  'Dinâmica': ['Leis de Newton', 'Força de Atrito', 'Trabalho e Energia', 'Impulso'],
  'Álgebra': ['Funções', 'Logaritmos', 'Matrizes', 'Polinômios'],
};
