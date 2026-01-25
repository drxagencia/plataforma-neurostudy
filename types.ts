
export type View = 'dashboard' | 'aulas' | 'simulados' | 'questoes' | 'comunidade' | 'competitivo' | 'tutor' | 'ajustes' | 'admin' | 'financeiro';

export type UserPlan = 'basic' | 'intermediate' | 'advanced' | 'admin';

export interface Transaction {
  id: string;
  type: 'debit' | 'credit';
  amount: number; // Valor em R$
  description: string;
  timestamp: number;
  tokensUsed?: number;
}

export interface RechargeRequest {
  id: string;
  uid: string;
  userDisplayName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  proofUrl?: string; // Opcional, URL do comprovante
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
  balance: number; // Saldo em R$
  xp: number;
  lastPostedAt?: number;
  questionsAnswered?: number;
  hoursStudied?: number;
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

export interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: number;
  likes: number;
}

export interface Simulation {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  type: 'official' | 'training';
  status: 'open' | 'closed' | 'coming_soon';
  subjects: string[]; 
}
