
export type View = 'dashboard' | 'aulas' | 'militares' | 'redacao' | 'tutor' | 'simulados' | 'questoes' | 'comunidade' | 'competitivo' | 'admin' | 'ajustes' | 'suporte';

export type UserPlan = 'basic' | 'advanced' | 'admin';
export type BillingCycle = 'monthly' | 'yearly';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
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
  billingCycle?: BillingCycle;
  subscriptionExpiry?: string;
  xp?: number;
  weeklyXp?: number; // New: Weekly XP
  lastXpWeek?: number; // New: Week ID for reset logic
  balance: number;
  essayCredits?: number;
  hoursStudied?: number;
  questionsAnswered?: number;
  loginStreak?: number;
  dailyLikesGiven?: number;
  lastPostedAt?: number;
  theme?: 'dark' | 'light';
  hasSupportNotification?: boolean; // New: Notification flag
  // REMOVED HEAVY OBJECTS FROM MAIN PROFILE FETCH
  // essays and transactions are now fetched on demand from separate root nodes
}

export interface SupportMessage {
  role: 'user' | 'ai' | 'admin';
  content: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string; // usually userId
  userId: string;
  userName: string; // Nome completo informado
  userEmail: string;
  issueDescription: string;
  status: 'open' | 'answered'; // open = waiting admin, answered = waiting user
  messages: SupportMessage[];
  lastUpdated: number;
}

export interface Subject {
  id: string;
  name: string;
  iconName: string; // Lucide icon name
  color: string; // Tailwind class
  category: 'regular' | 'military';
}

export interface LessonMaterial {
  title: string;
  url: string;
}

export interface LessonTag {
  text: string;
  color: string;
}

export interface ExerciseFilters {
  category: string;
  subject: string;
  topic: string;
  subtopics?: string[];
}

export interface Lesson {
  id?: string;
  title: string;
  type: 'video' | 'exercise_block';
  videoUrl?: string; // YouTube ID or URL
  duration?: string;
  materials?: LessonMaterial[];
  tag?: LessonTag;
  exerciseFilters?: ExerciseFilters;
}

export interface Question {
  id?: string;
  text: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  subjectId: string;
  topic: string;
  subtopic?: string;
  tag?: LessonTag;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
}

export interface CommunityReply {
  author: string;
  content: string;
  timestamp: number;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorXp?: number;
  content: string;
  timestamp: number;
  likes: number;
  likedBy?: Record<string, boolean>;
  replies?: CommunityReply[];
}

export interface Simulation {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  type: 'official' | 'training';
  status: 'open' | 'closed' | 'coming_soon';
  subjects?: string[];
  questionIds?: string[];
  questionCount?: number;
}

export interface SimulationResult {
  userId: string;
  simulationId: string;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  answers: Record<string, boolean>;
  timestamp: number;
  topicPerformance?: Record<string, { correct: number, total: number }>;
}

export interface CompetencyDetails {
    score: number;
    analysis?: string;
    positivePoints?: string[];
    negativePoints?: string[];
}

export interface EssayCorrection {
  id?: string;
  theme: string;
  imageUrl?: string; // NOTE: In DB list, this will be null/id. In UI detail, it's the blob.
  date: number;
  scoreTotal: number;
  competencies: {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
    c5: number;
  };
  detailedCompetencies?: {
    c1: CompetencyDetails;
    c2: CompetencyDetails;
    c3: CompetencyDetails;
    c4: CompetencyDetails;
    c5: CompetencyDetails;
  };
  feedback: string;
  errors?: string[]; // Legacy fallback
  strengths?: string[];
  weaknesses?: string[];
  structuralTips?: string;
  competencyFeedback?: Record<string, string>; // Legacy fallback
}

export interface Lead {
  id: string;
  name: string;
  contact: string;
  planId: string;
  amount: number;
  billing: 'monthly' | 'yearly';
  paymentMethod: string;
  pixIdentifier?: string;
  timestamp: string;
  status: 'pending' | 'paid' | 'approved_access' | 'pending_pix';
  processed?: boolean;
}

export interface RechargeRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  amount: number;
  currencyType: 'BRL' | 'CREDIT';
  quantityCredits?: number; // if CREDIT
  type: 'CREDIT' | 'BALANCE'; // Derived from currencyType usually
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  planLabel?: string;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: number;
  tokensUsed?: number;
  currencyType?: 'BRL' | 'CREDIT';
}

export interface PlanFeatures {
    canUseChat: boolean;
    canUseExplanation: boolean; // For question bank AI
    canUseEssay: boolean;
    canUseSimulations: boolean;
    canUseCommunity: boolean;
    canUseMilitary: boolean;
}

export interface PlanConfig {
    permissions: {
        basic: PlanFeatures;
        advanced: PlanFeatures;
    };
    prices: {
        basic: number;
        advanced: number;
    };
}

export interface AiConfig {
  // Legacy, kept for compatibility, now mostly superseded by PlanConfig
  intermediateLimits: {
    canUseChat: boolean;
    canUseExplanation: boolean;
  };
}

export interface TrafficConfig {
    vslScript: string;
    checkoutLinkMonthly: string;
    checkoutLinkYearly: string;
    pixelId?: string;
}