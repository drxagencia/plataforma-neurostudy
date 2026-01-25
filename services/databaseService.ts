import { ref, get, child, update, push, set, query, orderByChild, equalTo } from "firebase/database";
import { database } from "./firebaseConfig";
import { Announcement, Subject, CommunityPost, Simulation, UserProfile, Question, Lesson, RechargeRequest, Transaction, AiConfig, UserPlan } from "../types";

export const DatabaseService = {
  // --- User Profile & XP ---
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const snapshot = await get(child(ref(database), `users/${uid}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return { 
          ...data, 
          uid,
          plan: data.plan || (data.isAdmin ? 'admin' : 'basic'),
          balance: data.balance || 0
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  },

  createUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    try {
      await set(ref(database, `users/${uid}`), {
        ...data,
        balance: 0,
        plan: data.isAdmin ? 'admin' : 'basic'
      });
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },

  ensureUserProfile: async (uid: string, authData: Partial<UserProfile>): Promise<UserProfile> => {
     try {
         let profile = await DatabaseService.getUserProfile(uid);
         if (!profile) {
             console.log("User profile missing, creating...", uid);
             await DatabaseService.createUserProfile(uid, authData);
             profile = await DatabaseService.getUserProfile(uid);
         }
         return profile!;
     } catch (e) {
         console.error("Failed to ensure user profile", e);
         throw e;
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

  // --- Financial & Credits System ---
  createRechargeRequest: async (uid: string, userDisplayName: string, amount: number): Promise<void> => {
    try {
        const reqRef = push(ref(database, 'recharges'));
        const request: RechargeRequest = {
            id: reqRef.key!,
            uid,
            userDisplayName,
            amount,
            status: 'pending',
            timestamp: Date.now()
        };
        await set(reqRef, request);
    } catch (error) {
        console.error("Error creating recharge:", error);
        throw error;
    }
  },

  getRechargeRequests: async (): Promise<RechargeRequest[]> => {
    try {
        const snapshot = await get(ref(database, 'recharges'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return (Object.values(data) as RechargeRequest[]).sort((a, b) => b.timestamp - a.timestamp);
        }
        return [];
    } catch (error) {
        return [];
    }
  },

  processRecharge: async (requestId: string, status: 'approved' | 'rejected'): Promise<void> => {
    try {
        const reqRef = ref(database, `recharges/${requestId}`);
        const snapshot = await get(reqRef);
        if (!snapshot.exists()) throw new Error("Request not found");
        
        const request = snapshot.val() as RechargeRequest;
        
        if (status === 'approved' && request.status !== 'approved') {
            const userRef = ref(database, `users/${request.uid}`);
            const userSnap = await get(userRef);
            const currentBalance = userSnap.val().balance || 0;
            
            await update(userRef, { balance: currentBalance + request.amount });

            const transRef = push(ref(database, `users/${request.uid}/transactions`));
            const transaction: Transaction = {
                id: transRef.key!,
                type: 'credit',
                amount: request.amount,
                description: 'Recarga aprovada via PIX',
                timestamp: Date.now()
            };
            await set(transRef, transaction);
        }

        await update(reqRef, { status });
    } catch (error) {
        console.error("Error processing recharge:", error);
        throw error;
    }
  },

  getUserTransactions: async (uid: string): Promise<Transaction[]> => {
      try {
          const snapshot = await get(ref(database, `users/${uid}/transactions`));
          if (snapshot.exists()) {
              const data = snapshot.val();
              return (Object.values(data) as Transaction[]).sort((a, b) => b.timestamp - a.timestamp);
          }
          return [];
      } catch (error) {
          return [];
      }
  },

  // --- AI Config ---
  getAiConfig: async (): Promise<AiConfig> => {
      try {
          const snapshot = await get(ref(database, 'config/ai'));
          if (snapshot.exists()) return snapshot.val();
          return {
              intermediateLimits: {
                  canUseChat: false,
                  canUseExplanation: true,
                  dailyMessageLimit: 10
              }
          };
      } catch (error) {
          return { intermediateLimits: { canUseChat: false, canUseExplanation: true, dailyMessageLimit: 10 } };
      }
  },

  updateAiConfig: async (config: AiConfig): Promise<void> => {
      await set(ref(database, 'config/ai'), config);
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

  // --- Questions (Hierarchical) ---
  getQuestions: async (subjectId: string, topic: string, subtopic?: string): Promise<Question[]> => {
    try {
      // Structure: questions/{subjectId}/{topic}/{subtopic}/{questionId}
      let path = `questions/${subjectId}/${topic}`;
      
      if (subtopic) {
        // Fetch specific subtopic folder
        path += `/${subtopic}`;
      }
      
      const snapshot = await get(child(ref(database), path));
      if (!snapshot.exists()) return [];

      const data = snapshot.val();

      if (subtopic) {
        // Data is object of questions { q1: {}, q2: {} }
        return Object.keys(data).map(key => ({
            ...data[key],
            id: key
        }));
      } else {
        // Data is object of subtopics { subtopic1: {q1, q2}, subtopic2: {q3, q4} }
        // We need to flatten to get all questions in the topic
        let allQuestions: Question[] = [];
        
        Object.keys(data).forEach(subtopicKey => {
            const questionsInSubtopic = data[subtopicKey];
            if (typeof questionsInSubtopic === 'object') {
                Object.keys(questionsInSubtopic).forEach(qKey => {
                    allQuestions.push({
                        ...questionsInSubtopic[qKey],
                        id: qKey
                    });
                });
            }
        });
        
        return allQuestions;
      }
    } catch (error) {
      console.warn("Error fetching questions:", error);
    }
    return [];
  },

  createQuestion: async (subjectId: string, topic: string, subtopic: string, question: Question): Promise<void> => {
     try {
       // 1. Save Question to Hierarchy
       const questionsRef = ref(database, `questions/${subjectId}/${topic}/${subtopic}`);
       const newQuestionRef = push(questionsRef);
       await set(newQuestionRef, question);

       // 2. Update Metadata: Topics List
       // Check if topic exists in subjects list, if not add it
       const topicsRef = ref(database, `topics/${subjectId}`);
       const topicsSnap = await get(topicsRef);
       let currentTopics: string[] = [];
       if (topicsSnap.exists()) {
           currentTopics = topicsSnap.val();
       }
       if (!currentTopics.includes(topic)) {
           currentTopics.push(topic);
           await set(topicsRef, currentTopics);
       }

       // 3. Update Metadata: Subtopics List
       // Check if subtopic exists in topics list, if not add it
       const subtopicsRef = ref(database, `subtopics/${topic}`);
       const subtopicsSnap = await get(subtopicsRef);
       let currentSubtopics: string[] = [];
       if (subtopicsSnap.exists()) {
           currentSubtopics = subtopicsSnap.val();
       }
       if (!currentSubtopics.includes(subtopic)) {
           currentSubtopics.push(subtopic);
           await set(subtopicsRef, currentSubtopics);
       }

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

  updateUserPlan: async (uid: string, plan: UserPlan, expiry: string): Promise<void> => {
    try {
      const userRef = child(ref(database), `users/${uid}`);
      await update(userRef, {
        plan: plan,
        subscriptionExpiry: expiry
      });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }
};