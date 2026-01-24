import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./firebaseConfig";
import { User } from '../types';

// Helper to map Firebase User to our App User type
export const mapUser = (firebaseUser: FirebaseUser): User => {
  const email = firebaseUser.email || '';
  const isAdmin = email.endsWith('@admin.com');

  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'Estudante',
    email: email,
    photoURL: firebaseUser.photoURL || undefined,
    isAdmin: isAdmin
  };
};

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return mapUser(userCredential.user);
    } catch (error: any) {
      console.error("Auth Error:", error);
      throw new Error(error.message || 'Falha na autenticação');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  },

  updateProfile: async (user: User, updates: Partial<User>): Promise<User> => {
    if (!auth.currentUser) throw new Error("No user logged in");
    
    try {
      await firebaseUpdateProfile(auth.currentUser, {
        displayName: updates.displayName,
        photoURL: updates.photoURL
      });
      
      return { ...user, ...updates };
    } catch (error) {
      console.error("Update Profile Error:", error);
      throw error;
    }
  }
};