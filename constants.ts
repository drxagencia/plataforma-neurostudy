
import { Subject, Announcement } from './types';
import { 
  Beaker, 
  BookOpen, 
  Calculator, 
  Globe, 
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
