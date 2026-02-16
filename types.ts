
export type View = 'dashboard' | 'aulas' | 'militares' | 'redacao' | 'tutor' | 'simulados' | 'questoes' | 'comunidade' | 'competitivo' | 'admin' | 'ajustes' | 'suporte' | 'financeiro';

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

export interface TopicStats {
    correct: number;
    wrong: number;
}

export interface UserStatsMap {
    [subjectId: string]: Record<string, TopicStats>;
}

export interface UserProfile extends User {
  plan: UserPlan;
  billingCycle?: BillingCycle;
  subscriptionExpiry?: string;
  aiUnlimitedExpiry?: string; 
  essayPlanExpiry?: string;    
  xp?: number;
  weeklyXp?: number;
  lastXpWeek?: number;
  balance: number;
  essayCredits?: number;
  
  // Study Stats
  hoursStudied?: number; // Total Lifetime Hours
  dailyStudyMinutes?: number; // Minutes studied TODAY
  dailyGoal?: number; // Goal in HOURS
  lastStudyDate?: string; // ISO Date YYYY-MM-DD
  
  questionsAnswered?: number;
  loginStreak?: number;
  dailyLikesGiven?: number;
  lastPostedAt?: number;
  theme?: 'dark' | 'light';
  hasSupportNotification?: boolean;
  whatsapp?: string;           
  firstTimeSetupDone?: boolean; 
  totalSpent?: number;         
}

export interface OperationalCost {
    id: string;
    name: string;
    date: string; // ISO format
    amount: number;
    timestamp: number;
}

export interface SupportMessage {
  role: 'user' | 'ai' | 'admin';
  content: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  issueDescription: string;
  status: 'open' | 'answered';
  messages: SupportMessage[];
  lastUpdated: number;
}

export interface Subject {
  id: string;
  name: string;
  iconName: string;
  color: string;
  category: 'regular' | 'military';
}

export interface LessonMaterial {
  title: string;
  url: string;
}

export interface Lesson {
  id?: string;
  title: string;
  type: 'video' | 'exercise_block';
  videoUrl?: string;
  duration?: string;
  materials?: LessonMaterial[];
  tag?: { text: string; color: string };
  exerciseFilters?: { category: string; subject: string; topic: string; subtopics?: string[] };
  order?: number;
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
  // Fix: added category to Question interface
  category?: 'regular' | 'military';
  // Added tag property to Question interface
  tag?: { text: string; color: string };
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
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
  replies?: { author: string; content: string; timestamp: number }[];
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

export interface EssayCorrection {
  id?: string;
  theme: string;
  imageUrl?: string;
  date: number;
  scoreTotal: number;
  competencies: { c1: number; c2: number; c3: number; c4: number; c5: number };
  detailedCompetencies?: any;
  feedback: string;
  strengths?: string[];
  weaknesses?: string[];
  structuralTips?: string;
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
  password?: string;
  payerName?: string;
}

export interface RechargeRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  amount: number;
  currencyType: 'BRL' | 'CREDIT';
  quantityCredits?: number;
  type: 'CREDIT' | 'BALANCE';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  planLabel?: string;
}

export interface Transaction {
  id: string;
  userId?: string;
  userName?: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: number;
  currencyType?: 'BRL' | 'CREDIT';
}

export interface TrafficConfig {
    vslScript: string;
    checkoutLinkMonthly: string;
    checkoutLinkYearly: string;
}

export interface PlanConfig {
    permissions: any;
    prices: { basic: number; advanced: number };
}
