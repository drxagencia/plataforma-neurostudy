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
  MessageCircle
} from 'lucide-react';

export const APP_NAME = "Lumina";

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

export const SUBJECTS: Subject[] = [
  { id: 'math', name: 'Matemática', iconName: 'Calculator', color: 'text-blue-400' },
  { id: 'physics', name: 'Física', iconName: 'Zap', color: 'text-yellow-400' },
  { id: 'chem', name: 'Química', iconName: 'Beaker', color: 'text-purple-400' },
  { id: 'bio', name: 'Biologia', iconName: 'Microscope', color: 'text-green-400' },
  { id: 'lit', name: 'Literatura', iconName: 'BookOpen', color: 'text-pink-400' },
  { id: 'gram', name: 'Gramática', iconName: 'PenTool', color: 'text-red-400' },
  { id: 'hist', name: 'História', iconName: 'ScrollText', color: 'text-orange-400' },
  { id: 'geo', name: 'Geografia', iconName: 'Map', color: 'text-emerald-400' },
  { id: 'phil', name: 'Filosofia/Soc.', iconName: 'Scale', color: 'text-indigo-400' },
  { id: 'eng', name: 'Inglês', iconName: 'Languages', color: 'text-cyan-400' },
  { id: 'spa', name: 'Espanhol', iconName: 'MessageCircle', color: 'text-rose-400' },
  { id: 'text', name: 'Interpretação', iconName: 'BrainCircuit', color: 'text-teal-400' },
];

export const MOCK_TOPICS: Record<string, string[]> = {
  'physics': ['Cinemática', 'Dinâmica', 'Eletrodinâmica', 'Termodinâmica', 'Óptica'],
  'math': ['Álgebra', 'Geometria Plana', 'Geometria Espacial', 'Trigonometria', 'Estatística'],
  'chem': ['Química Geral', 'Físico-Química', 'Química Orgânica', 'Atomística'],
  // Add others as needed for demo
};

export const MOCK_SUBTOPICS: Record<string, string[]> = {
  'Cinemática': ['Movimento Uniforme', 'Movimento Uniformemente Variado', 'Vetores', 'Lançamento Oblíquo'],
  'Dinâmica': ['Leis de Newton', 'Força de Atrito', 'Trabalho e Energia', 'Impulso'],
  'Álgebra': ['Funções', 'Logaritmos', 'Matrizes', 'Polinômios'],
};
