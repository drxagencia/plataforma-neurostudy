export type View = 'dashboard' | 'aulas' | 'simulados' | 'questoes' | 'comunidade' | 'provas' | 'ajustes' | 'admin';

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

export interface QuestionFilter {
  subjectId: string | null;
  topicId: string | null;
  subTopicId: string | null;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: number;
  likes: number;
}