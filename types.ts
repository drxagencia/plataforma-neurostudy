
export type View = 'dashboard' | 'aulas' | 'simulados' | 'questoes' | 'comunidade' | 'competitivo' | 'tutor' | 'ajustes' | 'admin' | 'financeiro' | 'redacao' | 'militares';

export type UserPlan = 'basic' | 'intermediate' | 'advanced' | 'admin';

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
  subscriptionExpiry: string; // ISO Date string
  balance: number; // Saldo em R$ (IA Chat)
  essayCredits: number; // Créditos de Redação
  xp: number;
  lastPostedAt?: number;
  questionsAnswered?: number;
  hoursStudied?: number;
  theme?: 'dark' | 'light'; // Removed Midnight
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
}

export interface LessonMaterial {
  title: string;
  url: string;
  type?: 'pdf' | 'link' | 'image';
}

export interface Lesson {
  id?: string;
  title: string;
  videoUrl: string;
  duration: string;
  subjectId?: string; 
  topic?: string;
  materials?: LessonMaterial[];
}

export interface Reply {
  id?: string;
  author: string;
  content: string;
  timestamp: number;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
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

export interface EssayCorrection {
  id?: string;
  theme: string;
  imageUrl: string; // Currently base64 for simplicity in MVP, ideally Storage URL
  date: number;
  scoreTotal: number;
  competencies: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
    c5: number;
  };
  competencyFeedback?: {
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
  };
  feedback: string;
  errors: string[];
}
