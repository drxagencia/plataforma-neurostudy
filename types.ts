
export type View = 'dashboard' | 'aulas' | 'simulados' | 'questoes' | 'comunidade' | 'competitivo' | 'tutor' | 'ajustes' | 'admin' | 'financeiro' | 'redacao' | 'militares';

export type UserPlan = 'basic' | 'intermediate' | 'advanced' | 'admin';

export interface Lead {
  id: string;
  amount: number;
  billing: string;
  contact: string;
  name: string; // Nome do aluno
  paymentMethod: string;
  planId: string; // 'adv', 'basic', etc
  status: string; // 'pending_pix', 'paid', etc
  timestamp: string; // ISO String
  pixIdentifier?: string; // Nome de quem pagou o PIX
  processed?: boolean; // Internal control
}

export interface Transaction {
  id: string;
  type: 'debit' | 'credit';
  amount: number; // Valor em R$ ou Créditos
  description: string;
  timestamp: number;
  tokensUsed?: number;
  currencyType?: 'BRL' | 'CREDIT';
}

export interface RechargeRequest {
  id: string;
  uid: string;
  userDisplayName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  type: 'BRL' | 'CREDIT'; // Distinguish between wallet balance and essay credits
  quantityCredits?: number; // Only if type is CREDIT
  planLabel?: string; // NEW: Description for unlimited plans (e.g., "1 Ano Ilimitado")
}

export interface AiConfig {
  intermediateLimits: {
    canUseExplanation: boolean; // "Quer saber pq errou?"
    canUseChat: boolean;        // Chat livre
    dailyMessageLimit: number;
  }
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isAdmin?: boolean;
}

export interface UserProfile extends User {
  plan: UserPlan;
  billingCycle?: 'monthly' | 'yearly'; // Rastreia se o plano atual é mensal ou anual
  subscriptionExpiry: string; // ISO Date string
  balance: number; // Saldo em R$ (IA Chat)
  essayCredits: number; // Créditos de Redação
  xp: number;
  lastPostedAt?: number;
  questionsAnswered?: number;
  hoursStudied?: number;
  theme?: 'dark' | 'light';
  // Gamification Fields
  lastLoginDate?: string; // YYYY-MM-DD
  loginStreak?: number;
  dailyLikesGiven?: number;
  lastLikeDate?: string; // YYYY-MM-DD to reset daily likes
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
}

export interface Subject {
  id: string;
  name: string;
  iconName: string; 
  color: string;
  category?: 'regular' | 'military'; // Distinction
}

export interface ContentTag {
    text: string;
    color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'indigo' | 'gray';
}

export interface Question {
  id?: string;
  text: string;
  imageUrl?: string; 
  options: string[];
  correctAnswer: number; 
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  subjectId?: string; 
  topic?: string;
  tag?: ContentTag; // NEW: Optional tag
}

export interface LessonMaterial {
  title: string;
  url: string;
  type?: 'pdf' | 'link' | 'image';
}

export interface Lesson {
  id?: string;
  title: string;
  type?: 'video' | 'exercise_block'; // New field to distinguish content type
  videoUrl?: string; // Optional if type is exercise_block
  duration?: string;
  subjectId?: string; 
  topic?: string;
  order?: number; // For manual ordering in playlist
  materials?: LessonMaterial[];
  tag?: ContentTag; // NEW: Optional tag
  // Filters for exercise blocks
  exerciseFilters?: {
      category: string;
      subject: string;
      topic: string;
      subtopics?: string[]; // Multiple subtopics support
  }
}

export interface Reply {
  id?: string;
  author: string;
  content: string;
  timestamp: number;
  authorXp?: number; // Snapshot of XP to render rank correctly
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorXp?: number; // Snapshot of XP to render rank correctly
  content: string;
  timestamp: number;
  likes: number;
  likedBy?: Record<string, boolean>; // Map of UIDs who liked
  replies?: Reply[];
}

export interface Simulation {
  id: string;
  title: string;
  description: string;
  questionIds: string[]; // List of Question IDs included in this simulation
  durationMinutes: number;
  type: 'official' | 'training';
  status: 'open' | 'closed' | 'coming_soon';
  subjects: string[]; // Tags for display
}

export interface SimulationResult {
  id?: string;
  userId: string;
  simulationId: string;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  answers: Record<string, boolean>; // QuestionID -> Correct(true/false)
  timestamp: number;
  topicPerformance?: Record<string, { correct: number; total: number }>; // Analysis data
}

// Enhanced Essay Correction Interface
export interface CompetencyDetail {
    score: number;
    analysis: string; // Deep analysis of this specific competency
    positivePoints?: string[];
    negativePoints?: string[];
}

export interface EssayCorrection {
  id?: string;
  theme: string;
  imageUrl: string; 
  date: number;
  scoreTotal: number;
  // Legacy support maps simple scores, but new AI fills detailedCompetencies
  competencies: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
    c5: number;
  };
  // Detailed New Structure
  detailedCompetencies?: {
      c1: CompetencyDetail;
      c2: CompetencyDetail;
      c3: CompetencyDetail;
      c4: CompetencyDetail;
      c5: CompetencyDetail;
  };
  // Legacy feedback
  competencyFeedback?: {
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
  };
  feedback: string; // General Analysis / Structural comments
  errors: string[]; // Specific grammar/logic errors list
  
  // New Fields for Rich UI
  strengths?: string[]; // "O que você dominou"
  weaknesses?: string[]; // "Onde perdeu pontos"
  structuralTips?: string; // Specific formatting/structure advice
}
