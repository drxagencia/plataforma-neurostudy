import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./firebaseConfig";
import { User } from '../types';

// Helper to map Firebase User to our App User type
export const mapUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  displayName: firebaseUser.displayName || 'Estudante',
  email: firebaseUser.email || '',
  photoURL: firebaseUser.photoURL || undefined
});

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
      
      // Force token refresh to get new data could be done here, 
      // but usually returning the merged object is enough for UI
      return { ...user, ...updates };
    } catch (error) {
      console.error("Update Profile Error:", error);
      throw error;
    }
  }
};