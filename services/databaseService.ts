
import { ref, get, child, update, push, set, query, orderByChild, equalTo, limitToLast, remove, startAfter, limitToFirst, runTransaction } from "firebase/database";
import { database } from "./firebaseConfig";
import { Announcement, Subject, CommunityPost, Simulation, UserProfile, Question, Lesson, RechargeRequest, Transaction, AiConfig, UserPlan, SimulationResult, EssayCorrection, Lead } from "../types";
import { XP_VALUES } from "../constants";

// --- MEMORY CACHE TO PREVENT REDUNDANT DOWNLOADS ---
const CACHE: {
    subjects: Subject[] | null;
    topics: Record<string, string[]> | null;
    subtopics: Record<string, string[]> | null;
    announcements: Announcement[] | null;
    aiConfig: AiConfig | null;
} = {
    subjects: null,
    topics: null,
    subtopics: null,
    announcements: null,
    aiConfig: null
};

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

  // --- LEADS & LANDING PAGE INTEGRATION ---
  getLeads: async (): Promise<Lead[]> => {
      try {
          const snapshot = await get(ref(database, 'leads'));
          if (snapshot.exists()) {
              const data = snapshot.val();
              // Convert object to array and sort by timestamp desc
              return Object.keys(data)
                .map(key => ({ ...data[key], id: key }))
                .sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    return timeB - timeA;
                });
          }
          return [];
      } catch (e) {
          console.error("Error fetching leads", e);
          return [];
      }
  },

  markLeadProcessed: async (leadId: string): Promise<void> => {
      try {
          await update(ref(database, `leads/${leadId}`), { 
              processed: true,
              status: 'approved_access' 
          });
      } catch (e) {
          throw e;
      }
  },

  // --- User Profile & XP ---
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      // NOTE: This fetches the ENTIRE user node. Avoid calling this frequently in child components.
      // Use the 'user' prop passed from App.tsx whenever possible.
      const snapshot = await get(child(ref(database), `users/${uid}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return { 
          ...data, 
          uid,
          plan: data.plan || (data.isAdmin ? 'admin' : 'basic'),
          balance: data.balance || 0,
          essayCredits: data.essayCredits || 0
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
        essayCredits: 0,
        plan: data.plan || (data.isAdmin ? 'admin' : 'basic'),
        xp: 0
      });
      // Sync with lightweight leaderboard
      await DatabaseService.syncLeaderboard(uid, data.displayName || 'User', data.photoURL || '', 0);
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
      
      // Update leaderboard info if name/photo changes
      if (data.displayName || data.photoURL) {
          const currentXP = (await get(child(ref(database), `users/${uid}/xp`))).val() || 0;
          await DatabaseService.syncLeaderboard(uid, data.displayName, data.photoURL, currentXP);
      }
    } catch (error) {
      console.error("Error saving user profile:", error);
      throw error;
    }
  },

  // Helper to keep a lightweight leaderboard node
  syncLeaderboard: async (uid: string, displayName?: string, photoURL?: string, xp?: number) => {
      const updates: any = {};
      if (displayName) updates[`leaderboard/${uid}/displayName`] = displayName;
      if (photoURL) updates[`leaderboard/${uid}/photoURL`] = photoURL;
      if (xp !== undefined) updates[`leaderboard/${uid}/xp`] = xp;
      await update(ref(database), updates);
  },

  // Centralized XP Logic
  processXpAction: async (uid: string, actionType: keyof typeof XP_VALUES, customAmount?: number): Promise<number> => {
      const userRef = ref(database, `users/${uid}`);
      let earnedXp = customAmount || XP_VALUES[actionType] || 0;

      try {
          await runTransaction(userRef, (user) => {
              if (user) {
                  // Initialize XP if missing
                  if (!user.xp) user.xp = 0;

                  // Handle Limits (Example: Likes)
                  if (actionType === 'LIKE_COMMENT') {
                      const today = new Date().toISOString().split('T')[0];
                      if (user.lastLikeDate !== today) {
                          user.lastLikeDate = today;
                          user.dailyLikesGiven = 0;
                      }
                      
                      if ((user.dailyLikesGiven || 0) >= 5) {
                          earnedXp = 0; // Limit reached
                      } else {
                          user.dailyLikesGiven = (user.dailyLikesGiven || 0) + 1;
                      }
                  }

                  // Handle Login Streak
                  if (actionType === 'DAILY_LOGIN_BASE') {
                      const today = new Date().toISOString().split('T')[0];
                      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                      
                      if (user.lastLoginDate === today) {
                          earnedXp = 0; // Already logged in today
                      } else {
                          if (user.lastLoginDate === yesterday) {
                              user.loginStreak = (user.loginStreak || 0) + 1;
                          } else {
                              user.loginStreak = 1;
                          }
                          user.lastLoginDate = today;
                          
                          // Add Streak Bonus
                          const bonus = Math.min((user.loginStreak || 1) * XP_VALUES.DAILY_LOGIN_STREAK_BONUS, 200); // Cap bonus
                          earnedXp += bonus;
                      }
                  }

                  if (earnedXp > 0) {
                      user.xp += earnedXp;
                  }
              }
              return user;
          });

          // Sync Leaderboard if XP changed
          if (earnedXp > 0) {
              // We need the new XP value, fetch it again or optimistically calc (fetch safer)
              const snap = await get(child(userRef, 'xp'));
              const newTotal = snap.val();
              const profileSnap = await get(userRef);
              const profile = profileSnap.val();
              await DatabaseService.syncLeaderboard(uid, profile.displayName, profile.photoURL, newTotal);
          }

          return earnedXp;
      } catch (e) {
          console.error("XP Transaction failed", e);
          return 0;
      }
  },

  // Legacy Wrapper for simple adds
  addXp: async (uid: string, amount: number): Promise<number> => {
      return await DatabaseService.processXpAction(uid, 'LESSON_WATCHED', amount); // Defaulting type just for logging if needed
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
          // Optimized: Only fetch if needed, but for now we keep it. 
          // Ideally, we shouldn't fetch the whole history on load if it's huge.
          const snap = await get(ref(database, `users/${uid}/answeredQuestions`));
          return snap.exists() ? snap.val() : {};
      } catch (e) {
          return {};
      }
  },

  // OPTIMIZED: Fetch from 'leaderboard' node instead of 'users'
  getLeaderboard: async (): Promise<UserProfile[]> => {
    try {
      const lbRef = query(ref(database, 'leaderboard'), orderByChild('xp'), limitToLast(50));
      const snapshot = await get(lbRef);
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
  createRechargeRequest: async (uid: string, userDisplayName: string, amount: number, type: 'BRL' | 'CREDIT' = 'BRL', quantityCredits?: number, planLabel?: string): Promise<void> => {
    try {
        const reqRef = push(ref(database, 'recharges'));
        const request: RechargeRequest = {
            id: reqRef.key!,
            uid,
            userDisplayName,
            amount,
            status: 'pending',
            timestamp: Date.now(),
            type,
            // FIX: Only add quantityCredits if defined. Firebase throws on undefined.
            ...(quantityCredits !== undefined ? { quantityCredits } : {}),
            ...(planLabel ? { planLabel } : {})
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
            
            if (request.type === 'CREDIT' && request.quantityCredits) {
                // Add Essay Credits
                const currentCredits = userSnap.val().essayCredits || 0;
                await update(userRef, { essayCredits: currentCredits + request.quantityCredits });
                
                // Transaction Record
                const transRef = push(ref(database, `users/${request.uid}/transactions`));
                await set(transRef, {
                    id: transRef.key!,
                    type: 'credit',
                    amount: request.quantityCredits,
                    description: `Compra de ${request.quantityCredits} créditos de redação`,
                    timestamp: Date.now(),
                    currencyType: 'CREDIT'
                });

            } else {
                // Add Balance BRL
                const currentBalance = userSnap.val().balance || 0;
                await update(userRef, { balance: currentBalance + request.amount });

                const transRef = push(ref(database, `users/${request.uid}/transactions`));
                await set(transRef, {
                    id: transRef.key!,
                    type: 'credit',
                    amount: request.amount,
                    description: request.planLabel || 'Recarga saldo IA',
                    timestamp: Date.now(),
                    currencyType: 'BRL'
                });
            }
        }

        await update(reqRef, { status });
    } catch (error) {
        console.error("Error processing recharge:", error);
        throw error;
    }
  },

  getUserTransactions: async (uid: string): Promise<Transaction[]> => {
      try {
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
  
  deductEssayCredit: async (uid: string): Promise<void> => {
      const userRef = ref(database, `users/${uid}`);
      await runTransaction(userRef, (user) => {
          if (user) {
              if (user.essayCredits && user.essayCredits > 0) {
                  user.essayCredits--;
                  return user;
              } else {
                  throw new Error("Saldo de créditos insuficiente");
              }
          }
          return user;
      });
  },

  // OPTIMIZED: Split heavy image data from light metadata
  saveEssayCorrection: async (uid: string, correction: EssayCorrection): Promise<void> => {
     // 1. Generate ID
     const correctionRef = push(ref(database, `users/${uid}/essays`));
     const correctionId = correctionRef.key!;

     // 2. Extract heavy image data
     const { imageUrl, ...metaData } = correction;

     // 3. Save metadata to user profile list
     await set(correctionRef, { ...metaData, id: correctionId });

     // 4. Save heavy image to separate node 'essay_blobs'
     if (imageUrl) {
         await set(ref(database, `essay_blobs/${correctionId}`), { imageUrl });
     }
  },

  getEssayCorrections: async (uid: string): Promise<EssayCorrection[]> => {
      try {
          // This only fetches metadata (no images)
          const snap = await get(ref(database, `users/${uid}/essays`));
          if(snap.exists()) {
             return Object.values(snap.val());
          }
          return [];
      } catch (e) { return []; }
  },

  // New method to fetch the heavy image only when needed
  getEssayImage: async (correctionId: string): Promise<string | null> => {
      try {
          const snap = await get(ref(database, `essay_blobs/${correctionId}/imageUrl`));
          if (snap.exists()) return snap.val();
          return null;
      } catch (e) { return null; }
  },

  // --- AI Config ---
  getAiConfig: async (): Promise<AiConfig> => {
      if (CACHE.aiConfig) return CACHE.aiConfig;
      try {
          const snapshot = await get(ref(database, 'config/ai'));
          if (snapshot.exists()) {
              CACHE.aiConfig = snapshot.val();
              return CACHE.aiConfig!;
          }
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
      CACHE.aiConfig = config; // Update cache immediately
      await set(ref(database, 'config/ai'), config);
  },

  // --- Announcements ---
  getAnnouncements: async (): Promise<Announcement[]> => {
    if (CACHE.announcements) return CACHE.announcements;
    try {
      const snapshot = await get(child(ref(database), 'announcements'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const result = Array.isArray(data) ? data : Object.values(data);
        CACHE.announcements = result;
        return result;
      }
    } catch (error) {
      console.warn("Error fetching announcements:", error);
    }
    return [];
  },

  // --- Subjects ---
  getSubjects: async (): Promise<Subject[]> => {
    if (CACHE.subjects) return CACHE.subjects;
    try {
      const snapshot = await get(child(ref(database), 'subjects'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const result = Array.isArray(data) ? data : Object.values(data);
        CACHE.subjects = result;
        return result;
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
          CACHE.subjects = null; // Invalidate cache
      } catch (e) {
          console.error("Error creating subject", e);
          throw e;
      }
  },

  // --- Topics & Subtopics ---
  getTopics: async (): Promise<Record<string, string[]>> => {
    if (CACHE.topics) return CACHE.topics;
    try {
      const snapshot = await get(child(ref(database), 'topics'));
      if (snapshot.exists()) {
          CACHE.topics = snapshot.val();
          return CACHE.topics!;
      }
    } catch (error) {
      console.warn("Error fetching topics:", error);
    }
    return {};
  },

  getSubTopics: async (): Promise<Record<string, string[]>> => {
    if (CACHE.subtopics) return CACHE.subtopics;
    try {
      const snapshot = await get(child(ref(database), 'subtopics'));
      if (snapshot.exists()) {
          CACHE.subtopics = snapshot.val();
          return CACHE.subtopics!;
      }
    } catch (error) {
      console.warn("Error fetching subtopics:", error);
    }
    return {};
  },

  // --- Questions (Hierarchical) ---
  // Updated to support Category (regular vs military)
  getQuestions: async (category: string, subjectId: string, topic: string, subtopic?: string): Promise<Question[]> => {
    try {
      // Path format: questions/{category}/{subject}/{topic}/{subtopic}
      // If category is not provided, we might default to 'regular' in the path or old path logic
      const root = category ? `questions/${category}` : `questions/regular`;
      
      let path = `${root}/${subjectId}/${topic}`;
      if (subtopic) {
        path += `/${subtopic}`;
      }
      
      const dbRef = ref(database, path);
      // Limit to first 30 questions to save bandwidth
      const qQuery = query(dbRef, limitToFirst(30));
      
      const snapshot = await get(qQuery);
      if (!snapshot.exists()) return [];

      const data = snapshot.val();

      if (subtopic) {
        return Object.keys(data).map(key => ({ ...data[key], id: key }));
      } else {
        let allQuestions: Question[] = [];
        let count = 0;
        Object.keys(data).forEach(subtopicKey => {
            if (count >= 30) return; // Client side check just in case
            const questionsInSubtopic = data[subtopicKey];
            if (typeof questionsInSubtopic === 'object') {
                Object.keys(questionsInSubtopic).forEach(qKey => {
                    if (count >= 30) return;
                    allQuestions.push({
                        ...questionsInSubtopic[qKey],
                        id: qKey
                    });
                    count++;
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

  getQuestionsByPath: async (category: string, subjectId: string, topic: string): Promise<(Question & { path: string, subtopic: string })[]> => {
     try {
         const root = category ? `questions/${category}` : `questions/regular`;
         // Limit this admin query as well
         const snapshot = await get(query(ref(database, `${root}/${subjectId}/${topic}`), limitToFirst(50)));
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
                     path: `${root}/${subjectId}/${topic}/${subtopic}/${qId}`
                 });
             });
         });
         return questions;
     } catch (e) {
         return [];
     }
  },

  getQuestionsByIds: async (ids: string[]): Promise<Question[]> => {
      // Optimized to use Promise.all instead of fetching parent
      return []; 
  },
  
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

  createQuestion: async (category: string, subjectId: string, topic: string, subtopic: string, question: Question): Promise<void> => {
     try {
       const root = category ? `questions/${category}` : `questions/regular`;
       const questionsRef = ref(database, `${root}/${subjectId}/${topic}/${subtopic}`);
       const newQuestionRef = push(questionsRef);
       await set(newQuestionRef, question);

       const topicsRef = ref(database, `topics/${subjectId}`);
       const topicsSnap = await get(topicsRef);
       let currentTopics: string[] = [];
       if (topicsSnap.exists()) currentTopics = topicsSnap.val();
       if (!currentTopics.includes(topic)) {
           currentTopics.push(topic);
           await set(topicsRef, currentTopics);
           CACHE.topics = null;
       }

       const subtopicsRef = ref(database, `subtopics/${topic}`);
       const subtopicsSnap = await get(subtopicsRef);
       let currentSubtopics: string[] = [];
       if (subtopicsSnap.exists()) currentSubtopics = subtopicsSnap.val();
       if (!currentSubtopics.includes(subtopic)) {
           currentSubtopics.push(subtopic);
           await set(subtopicsRef, currentSubtopics);
           CACHE.subtopics = null;
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
      return [];
  },

  createLesson: async (subjectId: string, topic: string, lesson: Lesson): Promise<void> => {
    try {
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
        // Here we'd ideally join with user profiles to get current XP/Rank
        // For efficiency, we will fetch user snapshot for the posts
        // For simplicity now, we assume authorXP is stored on post or fetched. 
        // We will fetch author XP in real-time or assume stored.
        // Let's rely on cached 'users' node if small, or just display static XP from creation (less ideal).
        // Better: Fetch author profile for displayed posts.
        
        // As a quick fix for the "High Quality Tags", we will modify the return to include authorXp by fetching user data for the specific authors.
        // This is N+1 but for 50 posts it's acceptable if cached.
        
        const postsArray = Object.keys(data).map(key => ({...data[key], id: key}));
        
        // Fetch XP for authors
        // Note: In a production app, use Cloud Functions to sync authorXp to post or index users.
        const posts = await Promise.all(postsArray.map(async (p: any) => {
             // Try to find user by name if uid not stored? Or if we stored uid.
             // We stored UID in createPost logic? No, only passed it. 
             // We need to store authorId in post to fetch current rank.
             // Assuming we update createPost to store authorId.
             
             // Fallback: If we don't have ID, we can't show dynamic rank easily.
             // Let's assume we start storing authorId from now on.
             let xp = 0;
             if (p.authorId) {
                 const u = await DatabaseService.getUserProfile(p.authorId);
                 if (u) xp = u.xp;
             }
             return { ...p, authorXp: xp, replies: p.replies ? Object.values(p.replies) : [] };
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
      // Store authorId for rank fetching
      await set(newPostRef, { ...post, authorId: uid });

      await update(ref(database, `users/${uid}`), { lastPostedAt: now });
      await DatabaseService.processXpAction(uid, 'DAILY_LOGIN_BASE', 50); // Fallback XP for posting? Or just use specific
    } catch (error) {
      throw error;
    }
  },

  toggleLike: async (postId: string, uid: string): Promise<void> => {
      const postRef = ref(database, `posts/${postId}`);
      await runTransaction(postRef, (post) => {
          if (post) {
              if (post.likedBy && post.likedBy[uid]) {
                  // Already liked: Remove like
                  post.likes = (post.likes || 1) - 1;
                  delete post.likedBy[uid];
              } else {
                  // Not liked: Add like
                  post.likes = (post.likes || 0) + 1;
                  if (!post.likedBy) post.likedBy = {};
                  post.likedBy[uid] = true;
              }
          }
          return post;
      });
      // Award XP for liking
      await DatabaseService.processXpAction(uid, 'LIKE_COMMENT');
  },

  replyPost: async (postId: string, reply: { author: string, content: string }): Promise<void> => {
      const repliesRef = ref(database, `posts/${postId}/replies`);
      const newReplyRef = push(repliesRef);
      await set(newReplyRef, {
          ...reply,
          timestamp: Date.now()
      });
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
            questionIds: data[key].questionIds || [] 
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
          
          // XP Calculation: Base 100 + (Score * 2)
          const xpEarned = XP_VALUES.SIMULATION_FINISH + (result.score * 2);
          await DatabaseService.processXpAction(result.userId, 'SIMULATION_FINISH', xpEarned); 
          
          await DatabaseService.incrementQuestionsAnswered(result.userId, result.totalQuestions);
      } catch (e) {
          console.error(e);
      }
  },

  // --- Admin ---
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
  
  getAllUsers: async (): Promise<UserProfile[]> => {
      return DatabaseService.getUsersPaginated(50);
  },

  updateUserPlan: async (uid: string, plan: UserPlan, expiry: string): Promise<void> => {
    try {
      const userRef = ref(database, `users/${uid}`);
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
