export type View = 'dashboard' | 'aulas' | 'simulados' | 'questoes' | 'comunidade' | 'competitivo' | 'ajustes' | 'admin';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isAdmin?: boolean;
}

export interface UserProfile extends User {
  subscriptionStatus: 'free' | 'pro';
  subscriptionExpiry: string; // ISO Date string
  xp: number;
  lastPostedAt?: number; // Timestamp
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
  iconName: string; // Mapping to Lucide icon name
  color: string;
}

export interface Question {
  id?: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  subjectId?: string; // For Admin creation
  topic?: string;     // For Admin creation
}

export interface Lesson {
  id?: string;
  title: string;
  videoUrl: string;
  duration: string;
  subjectId?: string; // For Admin creation
  topic?: string;     // For Admin creation
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
  subjects: string[]; // Subject IDs
}