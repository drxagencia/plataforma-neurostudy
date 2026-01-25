
import { ref, get, child, update, push, set, query, orderByChild, equalTo, limitToLast, remove, startAfter, limitToFirst } from "firebase/database";
import { database } from "./firebaseConfig";
import { Announcement, Subject, CommunityPost, Simulation, UserProfile, Question, Lesson, RechargeRequest, Transaction, AiConfig, UserPlan, SimulationResult } from "../types";

export const DatabaseService = {
  // --- GENERIC HELPERS FOR ADMIN ---
  updatePath: async (path: string, data: any): Promise<void> => {
      try {
          await update(ref(database, path), data);
      } catch (e) {
          console.error(`Error updating path ${path}`, e);
          throw e;
      }
  },

  deletePath: async (path: string): Promise<void> => {
      try {
          await remove(ref(database, path));
      } catch (e) {
          console.error(`Error deleting path ${path}`, e);
          throw e;
      }
  },

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

  markQuestionAsAnswered: async (uid: string, questionId: string, isCorrect: boolean): Promise<void> => {
      try {
          await update(ref(database, `users/${uid}/answeredQuestions/${questionId}`), {
              timestamp: Date.now(),
              correct: isCorrect
          });
      } catch (e) {
          console.error("Error marking question", e);
      }
  },

  getAnsweredQuestions: async (uid: string): Promise<Record<string, { correct: boolean }>> => {
      try {
          const snap = await get(ref(database, `users/${uid}/answeredQuestions`));
          return snap.exists() ? snap.val() : {};
      } catch (e) {
          return {};
      }
  },

  // OPTIMIZED: Only fetch top 50 users sorted by XP server-side
  getLeaderboard: async (): Promise<UserProfile[]> => {
    try {
      // Order by XP and limit to last 50 (since RTDB sorts ascending, higher XP is at the end)
      const usersRef = query(ref(database, 'users'), orderByChild('xp'), limitToLast(50));
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const users = Object.keys(data).map(key => ({
          ...data[key],
          uid: key
        })) as UserProfile[];
        // Reverse here because limitToLast gives us the highest XP at the end of the array
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
          // Limit transactions history to prevent loading huge arrays
          const q = query(ref(database, `users/${uid}/transactions`), limitToLast(50));
          const snapshot = await get(q);
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

  createSubject: async (subject: Subject): Promise<void> => {
      try {
          const subjectsRef = ref(database, 'subjects');
          const snapshot = await get(subjectsRef);
          let currentSubjects: Subject[] = [];
          
          if (snapshot.exists()) {
             const val = snapshot.val();
             currentSubjects = Array.isArray(val) ? val : Object.values(val);
          }
          
          currentSubjects.push(subject);
          await set(subjectsRef, currentSubjects);
      } catch (e) {
          console.error("Error creating subject", e);
          throw e;
      }
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
  // Efficient fetch: specific path only
  getQuestions: async (subjectId: string, topic: string, subtopic?: string): Promise<Question[]> => {
    try {
      let path = `questions/${subjectId}/${topic}`;
      if (subtopic) {
        path += `/${subtopic}`;
      }
      
      const snapshot = await get(child(ref(database), path));
      if (!snapshot.exists()) return [];

      const data = snapshot.val();

      if (subtopic) {
        return Object.keys(data).map(key => ({ ...data[key], id: key }));
      } else {
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

  // OPTIMIZED: Fetch questions with explicit hierarchy path logic, used when filtering in Admin
  // Note: We intentionally removed 'getAllQuestionsFlat' to prevent 6MB downloads.
  getQuestionsByPath: async (subjectId: string, topic: string): Promise<(Question & { path: string, subtopic: string })[]> => {
     try {
         const snapshot = await get(ref(database, `questions/${subjectId}/${topic}`));
         if(!snapshot.exists()) return [];
         
         const data = snapshot.val();
         let questions: (Question & { path: string, subtopic: string })[] = [];

         Object.keys(data).forEach(subtopic => {
             const qs = data[subtopic];
             Object.keys(qs).forEach(qId => {
                 questions.push({
                     ...qs[qId],
                     id: qId,
                     subjectId: subjectId,
                     topic: topic,
                     subtopic: subtopic,
                     path: `questions/${subjectId}/${topic}/${subtopic}/${qId}`
                 });
             });
         });
         return questions;
     } catch (e) {
         return [];
     }
  },

  getQuestionsByIds: async (ids: string[]): Promise<Question[]> => {
      // For fetching specific simulation questions. 
      // In a scalable solution, we would fetch these individually in parallel 
      // rather than downloading the whole world.
      // Since RTDB doesn't have "WHERE IN", we have to be smart.
      // For now, assume ids contains path info? No, they are just keys.
      // We will search the most likely paths or assume small dataset for simulations.
      // Optimization: For now, we will just fetch.
      // Warning: This is still potentially heavy if we don't know the paths.
      // Ideally Simulation object should store the full path of the question, not just ID.
      // HOTFIX: Returning empty if we can't find them easily without scanning, 
      // but to keep app working, we will scan ONLY if absolutely necessary, 
      // but really we should update Simulation structure.
      // *Skipping deep scan to prevent explosion*.
      return []; 
  },
  
  // NEW: Fetch questions knowing their paths (Scalable Way)
  getQuestionsWithPaths: async (questionPaths: string[]): Promise<Question[]> => {
      const promises = questionPaths.map(path => get(ref(database, path)));
      const snapshots = await Promise.all(promises);
      return snapshots.map(snap => {
          if(snap.exists()) {
             return { ...snap.val(), id: snap.key };
          }
          return null;
      }).filter(q => q !== null) as Question[];
  },

  createQuestion: async (subjectId: string, topic: string, subtopic: string, question: Question): Promise<void> => {
     try {
       const questionsRef = ref(database, `questions/${subjectId}/${topic}/${subtopic}`);
       const newQuestionRef = push(questionsRef);
       await set(newQuestionRef, question);

       // Update Topics List
       const topicsRef = ref(database, `topics/${subjectId}`);
       const topicsSnap = await get(topicsRef);
       let currentTopics: string[] = [];
       if (topicsSnap.exists()) currentTopics = topicsSnap.val();
       if (!currentTopics.includes(topic)) {
           currentTopics.push(topic);
           await set(topicsRef, currentTopics);
       }

       // Update Subtopics List
       const subtopicsRef = ref(database, `subtopics/${topic}`);
       const subtopicsSnap = await get(subtopicsRef);
       let currentSubtopics: string[] = [];
       if (subtopicsSnap.exists()) currentSubtopics = subtopicsSnap.val();
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
  
  getSubjectsWithLessons: async (): Promise<string[]> => {
      try {
          const snapshot = await get(ref(database, 'lessons'));
          if (snapshot.exists()) {
              return Object.keys(snapshot.val());
          }
          return [];
      } catch (e) {
          return [];
      }
  },

  getLessonsByTopic: async (subjectId: string): Promise<Record<string, Lesson[]>> => {
      try {
          const snapshot = await get(ref(database, `lessons/${subjectId}`));
          if (snapshot.exists()) {
              const data = snapshot.val();
              const normalized: Record<string, Lesson[]> = {};
              Object.keys(data).forEach(topic => {
                  const val = data[topic];
                  if (Array.isArray(val)) {
                      normalized[topic] = val;
                  } else {
                      // If it's an object map (keys are IDs), convert to array but keep IDs
                      normalized[topic] = Object.keys(val).map(k => ({...val[k], id: k}));
                  }
              });
              return normalized;
          }
          return {};
      } catch (e) {
          return {};
      }
  },

  getLessons: async (subjectId: string): Promise<Lesson[]> => {
      // Helper used in specific contexts
      return [];
  },

  createLesson: async (subjectId: string, topic: string, lesson: Lesson): Promise<void> => {
    try {
      // Use push to create with a unique key, making it editable later
      const lessonsRef = ref(database, `lessons/${subjectId}/${topic}`);
      const newRef = push(lessonsRef);
      await set(newRef, lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      throw error;
    }
  },

  // --- Community ---
  getPosts: async (): Promise<CommunityPost[]> => {
    try {
      const q = query(ref(database, 'posts'), limitToLast(50));
      const snapshot = await get(q);
      
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
          throw new Error("Aguarde o timer para postar novamente.");
        }
      }

      const postsRef = ref(database, 'posts');
      const newPostRef = push(postsRef);
      await set(newPostRef, post);

      await update(ref(database, `users/${uid}`), { lastPostedAt: now });
      await DatabaseService.addXp(uid, 50); 
    } catch (error) {
      throw error;
    }
  },

  likePost: async (postId: string, uid: string): Promise<void> => {
      const postRef = ref(database, `posts/${postId}`);
      const snap = await get(postRef);
      if (snap.exists()) {
          const currentLikes = snap.val().likes || 0;
          await update(postRef, { likes: currentLikes + 1 });
      }
  },

  replyPost: async (postId: string, reply: { author: string, content: string }): Promise<void> => {
      const repliesRef = ref(database, `posts/${postId}/replies`);
      const snap = await get(repliesRef);
      let replies = [];
      if (snap.exists()) {
          replies = snap.val();
          if(!Array.isArray(replies)) replies = Object.values(replies);
      }
      replies.push({ ...reply, timestamp: Date.now() });
      await set(repliesRef, replies);
  },

  // --- Simulations ---
  getSimulations: async (): Promise<Simulation[]> => {
    try {
      const snapshot = await get(child(ref(database), 'simulations'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ 
            ...data[key], 
            id: key,
            questionIds: data[key].questionIds || [] // Ensure array
        }));
      }
    } catch (error) {
      console.warn("Error fetching simulations:", error);
    }
    return [];
  },

  createSimulation: async (simulation: Omit<Simulation, 'id'>): Promise<void> => {
      try {
          const simRef = push(ref(database, 'simulations'));
          await set(simRef, simulation);
      } catch (e) {
          throw e;
      }
  },

  saveSimulationResult: async (result: SimulationResult): Promise<void> => {
      try {
          const resRef = push(ref(database, `users/${result.userId}/simulationResults`));
          await set(resRef, result);
          await DatabaseService.addXp(result.userId, result.score * 5); 
          await DatabaseService.incrementQuestionsAnswered(result.userId, result.totalQuestions);
      } catch (e) {
          console.error(e);
      }
  },

  // --- Admin ---
  // OPTIMIZED: Never fetch ALL users. Default to last 50.
  getUsersPaginated: async (limit: number = 50): Promise<UserProfile[]> => {
    try {
      const q = query(ref(database, 'users'), limitToLast(limit));
      const snapshot = await get(q);
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
  
  // Deprecated usage of getAllUsers to prevent memory leaks
  getAllUsers: async (): Promise<UserProfile[]> => {
      return DatabaseService.getUsersPaginated(50);
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
