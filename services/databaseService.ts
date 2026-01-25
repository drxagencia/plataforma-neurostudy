import { ref, get, child, update, push, set } from "firebase/database";
import { database } from "./firebaseConfig";
import { Announcement, Subject, CommunityPost, Simulation, UserProfile } from "../types";
import { ANNOUNCEMENTS, SUBJECTS } from "../constants"; // Fallbacks only

export const DatabaseService = {
  // --- Announcements ---
  getAnnouncements: async (): Promise<Announcement[]> => {
    try {
      const snapshot = await get(child(ref(database), 'announcements'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Array.isArray(data) ? data : Object.values(data);
      }
    } catch (error) {
      console.warn("Error fetching announcements:", error);
    }
    return ANNOUNCEMENTS;
  },

  // --- Subjects ---
  getSubjects: async (): Promise<Subject[]> => {
    try {
      const snapshot = await get(child(ref(database), 'subjects'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Array.isArray(data) ? data : Object.values(data);
      }
    } catch (error) {
      console.warn("Error fetching subjects:", error);
    }
    return SUBJECTS;
  },

  // --- Topics & Subtopics ---
  // Returns { "math": ["Algebra", ...], "physics": [...] }
  getTopics: async (): Promise<Record<string, string[]>> => {
    try {
      const snapshot = await get(child(ref(database), 'topics'));
      if (snapshot.exists()) return snapshot.val();
    } catch (error) {
      console.warn("Error fetching topics:", error);
    }
    return {};
  },

  // Returns { "Algebra": ["Functions", ...], ... }
  getSubTopics: async (): Promise<Record<string, string[]>> => {
    try {
      const snapshot = await get(child(ref(database), 'subtopics'));
      if (snapshot.exists()) return snapshot.val();
    } catch (error) {
      console.warn("Error fetching subtopics:", error);
    }
    return {};
  },

  // --- Community ---
  getPosts: async (): Promise<CommunityPost[]> => {
    try {
      const snapshot = await get(child(ref(database), 'posts'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Convert object {key: post} to Array [post]
        const posts = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        return posts.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (error) {
      console.warn("Error fetching posts:", error);
    }
    return [];
  },

  createPost: async (post: Omit<CommunityPost, 'id'>): Promise<void> => {
    try {
      const postsRef = ref(database, 'posts');
      const newPostRef = push(postsRef);
      await set(newPostRef, post);
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  },

  // --- Simulations ---
  getSimulations: async (): Promise<Simulation[]> => {
    try {
      const snapshot = await get(child(ref(database), 'simulations'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ ...data[key], id: key }));
      }
    } catch (error) {
      console.warn("Error fetching simulations:", error);
    }
    return [];
  },

  // --- User Management (Admin) ---
  // Note: This requires users to be stored in the 'users' node in Realtime DB
  getAllUsers: async (): Promise<UserProfile[]> => {
    try {
      const snapshot = await get(child(ref(database), 'users'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          ...data[key],
          uid: key // Ensure UID is attached
        }));
      }
    } catch (error) {
      console.warn("Error fetching users:", error);
    }
    return [];
  },

  updateUserPlan: async (uid: string, status: 'free' | 'pro', expiry: string): Promise<void> => {
    try {
      const userRef = child(ref(database), `users/${uid}`);
      await update(userRef, {
        subscriptionStatus: status,
        subscriptionExpiry: expiry
      });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }
};