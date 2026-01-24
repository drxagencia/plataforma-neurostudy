import { User } from '../types';

// Mock delay to simulate network request
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    await delay(1200); // Simulate network latency
    
    if (email === 'fail@test.com') {
      throw new Error('Invalid credentials');
    }

    return {
      uid: 'user_12345',
      displayName: 'Estudante Dedicado',
      email: email,
      photoURL: 'https://picsum.photos/seed/user1/200/200'
    };
  },

  logout: async (): Promise<void> => {
    await delay(500);
    return;
  },

  updateProfile: async (user: User, updates: Partial<User>): Promise<User> => {
    await delay(1000);
    return { ...user, ...updates };
  }
};