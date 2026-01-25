import { ref, get, child, update, push, set, query, orderByChild } from "firebase/database";
import { database } from "./firebaseConfig";
import { Announcement, Subject, CommunityPost, Simulation, UserProfile, Question, Lesson } from "../types";

export const DatabaseService = {
  // --- User Profile & XP ---
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const snapshot = await get(child(ref(database), `users/${uid}`));
      if (snapshot.exists()) {
        return { ...snapshot.val(), uid };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  },

  // Used by Admin to pre-create user profiles
  createUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    try {
      await set(ref(database, `users/${uid}`), data);
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },

  saveUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    try {
      await update(ref(database, `users/${uid}`), data);
    } catch (error) {
      console.error("Error saving user profile:", error);
      throw error;
    }
  },

  addXp: async (uid: string, amount: number): Promise<number> => {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const currentXp = snapshot.val().xp || 0;
        const newXp = currentXp + amount;
        await update(userRef, { xp: newXp });
        return newXp;
      }
    } catch (error) {
      console.error("Error adding XP:", error);
    }
    return 0;
  },

  incrementQuestionsAnswered: async (uid: string, count: number): Promise<void> => {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const current = snapshot.val().questionsAnswered || 0;
        await update(userRef, { questionsAnswered: current + count });
      }
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  },

  getLeaderboard: async (): Promise<UserProfile[]> => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const users = Object.keys(data).map(key => ({
          ...data[key],
          uid: key
        })) as UserProfile[];
        return users.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
    return [];
  },

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
    return [];
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
    return [];
  },

  // --- Topics & Subtopics ---
  getTopics: async (): Promise<Record<string, string[]>> => {
    try {
      const snapshot = await get(child(ref(database), 'topics'));
      if (snapshot.exists()) return snapshot.val();
    } catch (error) {
      console.warn("Error fetching topics:", error);
    }
    return {};
  },

  getSubTopics: async (): Promise<Record<string, string[]>> => {
    try {
      const snapshot = await get(child(ref(database), 'subtopics'));
      if (snapshot.exists()) return snapshot.val();
    } catch (error) {
      console.warn("Error fetching subtopics:", error);
    }
    return {};
  },

  // --- Questions ---
  getQuestions: async (subjectId: string, topic: string, subtopic?: string): Promise<Question[]> => {
    try {
      const path = `questions/${subjectId}/${topic}`; 
      const snapshot = await get(child(ref(database), path));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Array.isArray(data) ? data : Object.values(data);
      }
    } catch (error) {
      console.warn("Error fetching questions:", error);
    }
    return [];
  },

  createQuestion: async (subjectId: string, topic: string, question: Question): Promise<void> => {
     try {
       const questionsRef = ref(database, `questions/${subjectId}/${topic}`);
       // Get existing or create new array
       const snapshot = await get(questionsRef);
       let questions = [];
       if (snapshot.exists()) {
         questions = snapshot.val();
         if (!Array.isArray(questions)) questions = Object.values(questions);
       }
       questions.push(question);
       await set(questionsRef, questions);
     } catch (error) {
       console.error("Error creating question:", error);
       throw error;
     }
  },

  // --- Lessons ---
  createLesson: async (subjectId: string, topic: string, lesson: Lesson): Promise<void> => {
    try {
      const lessonsRef = ref(database, `lessons/${subjectId}/${topic}`);
      const snapshot = await get(lessonsRef);
      let lessons = [];
      if (snapshot.exists()) {
        lessons = snapshot.val();
        if (!Array.isArray(lessons)) lessons = Object.values(lessons);
      }
      lessons.push(lesson);
      await set(lessonsRef, lessons);
    } catch (error) {
      console.error("Error creating lesson:", error);
      throw error;
    }
  },

  // --- Community ---
  getPosts: async (): Promise<CommunityPost[]> => {
    try {
      const snapshot = await get(child(ref(database), 'posts'));
      if (snapshot.exists()) {
        const data = snapshot.val();
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

  createPost: async (post: Omit<CommunityPost, 'id'>, uid: string): Promise<void> => {
    try {
      const userProfile = await DatabaseService.getUserProfile(uid);
      const now = Date.now();
      
      if (userProfile?.lastPostedAt) {
        const hoursSinceLastPost = (now - userProfile.lastPostedAt) / (1000 * 60 * 60);
        if (hoursSinceLastPost < 24) {
          throw new Error("Você só pode enviar uma mensagem a cada 24 horas.");
        }
      }

      const postsRef = ref(database, 'posts');
      const newPostRef = push(postsRef);
      await set(newPostRef, post);

      await update(ref(database, `users/${uid}`), { lastPostedAt: now });
      await DatabaseService.addXp(uid, 50); 
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

  // --- Admin ---
  getAllUsers: async (): Promise<UserProfile[]> => {
    try {
      const snapshot = await get(child(ref(database), 'users'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          ...data[key],
          uid: key 
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