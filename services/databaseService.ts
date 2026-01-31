
import { ref, get, child, update, push, set, query, orderByChild, equalTo, limitToLast, remove, startAfter, limitToFirst, runTransaction } from "firebase/database";
import { database } from "./firebaseConfig";
import { Announcement, Subject, CommunityPost, Simulation, UserProfile, Question, Lesson, RechargeRequest, Transaction, AiConfig, UserPlan, SimulationResult, EssayCorrection, Lead } from "../types";
import { XP_VALUES } from "../constants";

// --- CACHE SYSTEM (LOCAL STORAGE + MEMORY) ---
const CACHE_TTL = 60 * 60 * 1000; // 1 Hour Cache Validity

const LocalCache = {
    get: <T>(key: string): T | null => {
        try {
            const itemStr = localStorage.getItem(`neuro_cache_${key}`);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = Date.now();
            
            if (now > item.expiry) {
                localStorage.removeItem(`neuro_cache_${key}`);
                return null;
            }
            return item.value;
        } catch (e) {
            return null;
        }
    },
    set: (key: string, value: any) => {
        try {
            const item = {
                value: value,
                expiry: Date.now() + CACHE_TTL,
            };
            localStorage.setItem(`neuro_cache_${key}`, JSON.stringify(item));
        } catch (e) {
            console.warn("Local storage full or disabled");
        }
    },
    clear: (key: string) => {
        localStorage.removeItem(`neuro_cache_${key}`);
    }
};

// --- XP EVENT SYSTEM ---
type XpCallback = (amount: number, reason: string) => void;
let xpListeners: XpCallback[] = [];

export const DatabaseService = {
  // --- GENERIC HELPERS FOR ADMIN ---
  updatePath: async (path: string, data: any): Promise<void> => {
      try {
          const cleanData = JSON.parse(JSON.stringify(data));
          await update(ref(database, path), cleanData);
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

  // --- LEADS ---
  createLead: async (leadData: Omit<Lead, 'id' | 'processed' | 'status'>): Promise<void> => {
      try {
          const leadsRef = ref(database, 'leads');
          const newLeadRef = push(leadsRef);
          await set(newLeadRef, {
              ...leadData,
              status: 'pending_pix',
              processed: false,
              timestamp: new Date().toISOString()
          });
      } catch (e) {
          console.error("Error creating lead", e);
          throw e;
      }
  },

  getLeads: async (): Promise<Lead[]> => {
      try {
          // Admin only, no caching needed usually, or short cache
          const snapshot = await get(ref(database, 'leads'));
          if (snapshot.exists()) {
              const data = snapshot.val();
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

  // --- User Profile ---
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      // User profile changes often (balance, xp), so we fetch fresh or use a very short memory cache if implemented in context
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
      await DatabaseService.syncLeaderboard(uid, data.displayName || 'User', data.photoURL || '', 0);
    } catch (error) {
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
         throw e;
     }
  },

  saveUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    try {
      await update(ref(database, `users/${uid}`), data);
      if (data.displayName || data.photoURL) {
          const currentXP = (await get(child(ref(database), `users/${uid}/xp`))).val() || 0;
          await DatabaseService.syncLeaderboard(uid, data.displayName, data.photoURL, currentXP);
      }
    } catch (error) {
      throw error;
    }
  },

  syncLeaderboard: async (uid: string, displayName?: string, photoURL?: string, xp?: number) => {
      const updates: any = {};
      if (displayName) updates[`leaderboard/${uid}/displayName`] = displayName;
      if (photoURL) updates[`leaderboard/${uid}/photoURL`] = photoURL;
      if (xp !== undefined) updates[`leaderboard/${uid}/xp`] = xp;
      await update(ref(database), updates);
  },

  onXpEarned: (callback: XpCallback) => {
      xpListeners.push(callback);
      return () => {
          xpListeners = xpListeners.filter(cb => cb !== callback);
      };
  },

  processXpAction: async (uid: string, actionType: keyof typeof XP_VALUES, customAmount?: number): Promise<number> => {
      const userRef = ref(database, `users/${uid}`);
      let earnedXp = customAmount || XP_VALUES[actionType] || 0;

      try {
          await runTransaction(userRef, (user) => {
              if (user) {
                  if (!user.xp) user.xp = 0;
                  if (actionType === 'LIKE_COMMENT') {
                      const today = new Date().toISOString().split('T')[0];
                      if (user.lastLikeDate !== today) {
                          user.lastLikeDate = today;
                          user.dailyLikesGiven = 0;
                      }
                      if ((user.dailyLikesGiven || 0) >= 5) earnedXp = 0;
                      else user.dailyLikesGiven = (user.dailyLikesGiven || 0) + 1;
                  }
                  if (actionType === 'DAILY_LOGIN_BASE') {
                      const today = new Date().toISOString().split('T')[0];
                      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                      if (user.lastLoginDate === today) earnedXp = 0;
                      else {
                          if (user.lastLoginDate === yesterday) user.loginStreak = (user.loginStreak || 0) + 1;
                          else user.loginStreak = 1;
                          user.lastLoginDate = today;
                          const bonus = Math.min((user.loginStreak || 1) * XP_VALUES.DAILY_LOGIN_STREAK_BONUS, 200);
                          earnedXp += bonus;
                      }
                  }
                  if (earnedXp > 0) user.xp += earnedXp;
              }
              return user;
          });

          if (earnedXp > 0) {
              xpListeners.forEach(cb => cb(earnedXp, actionType));
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

  addXp: async (uid: string, amount: number): Promise<number> => {
      return await DatabaseService.processXpAction(uid, 'LESSON_WATCHED', amount);
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
          // Can cache this in session storage if needed, but it changes often
          const snap = await get(ref(database, `users/${uid}/answeredQuestions`));
          return snap.exists() ? snap.val() : {};
      } catch (e) {
          return {};
      }
  },

  getCompletedLessons: async (uid: string): Promise<string[]> => {
      try {
          const snap = await get(ref(database, `users/${uid}/completedLessons`));
          return snap.exists() ? Object.keys(snap.val()) : [];
      } catch (e) {
          return [];
      }
  },

  markLessonComplete: async (uid: string, lessonId: string): Promise<void> => {
      try {
          await update(ref(database, `users/${uid}/completedLessons`), {
              [lessonId]: Date.now()
          });
      } catch (e) {
          console.error("Error marking lesson complete", e);
      }
  },

  getLeaderboard: async (): Promise<UserProfile[]> => {
    try {
      // Leaderboard needs to be fresh
      const lbRef = query(ref(database, 'leaderboard'), orderByChild('xp'), limitToLast(50));
      const snapshot = await get(lbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const users = Object.keys(data).map(key => ({ ...data[key], uid: key })) as UserProfile[];
        return users.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      }
    } catch (error) {}
    return [];
  },

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
            ...(quantityCredits !== undefined ? { quantityCredits } : {}),
            ...(planLabel ? { planLabel } : {})
        };
        await set(reqRef, request);
    } catch (error) {
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
                const currentCredits = userSnap.val().essayCredits || 0;
                await update(userRef, { essayCredits: currentCredits + request.quantityCredits });
                
                const transRef = push(ref(database, `user_transactions/${request.uid}`));
                await set(transRef, {
                    id: transRef.key!,
                    type: 'credit',
                    amount: request.quantityCredits,
                    description: `Compra de ${request.quantityCredits} créditos de redação`,
                    timestamp: Date.now(),
                    currencyType: 'CREDIT'
                });

            } else {
                const currentBalance = userSnap.val().balance || 0;
                await update(userRef, { balance: currentBalance + request.amount });

                const transRef = push(ref(database, `user_transactions/${request.uid}`));
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
        throw error;
    }
  },

  getUserTransactions: async (uid: string): Promise<Transaction[]> => {
      try {
          const q = query(ref(database, `user_transactions/${uid}`), limitToLast(50));
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

  saveEssayCorrection: async (uid: string, correction: EssayCorrection): Promise<void> => {
     const correctionRef = push(ref(database, `users/${uid}/essays`)); 
     const correctionId = correctionRef.key!;
     const { imageUrl, ...metaData } = correction;
     await set(correctionRef, { ...metaData, id: correctionId });
     if (imageUrl) {
         await set(ref(database, `essay_blobs/${correctionId}`), { imageUrl });
     }
  },

  getEssayCorrections: async (uid: string): Promise<EssayCorrection[]> => {
      try {
          const snap = await get(ref(database, `users/${uid}/essays`));
          if(snap.exists()) {
             return Object.values(snap.val());
          }
          return [];
      } catch (e) { return []; }
  },

  getEssayImage: async (correctionId: string): Promise<string | null> => {
      try {
          const snap = await get(ref(database, `essay_blobs/${correctionId}/imageUrl`));
          if (snap.exists()) return snap.val();
          return null;
      } catch (e) { return null; }
  },

  // --- AI Config (Cached) ---
  getAiConfig: async (): Promise<AiConfig> => {
      const cached = LocalCache.get<AiConfig>('aiConfig');
      if (cached) return cached;

      try {
          const snapshot = await get(ref(database, 'config/ai'));
          if (snapshot.exists()) {
              const data = snapshot.val();
              LocalCache.set('aiConfig', data);
              return data;
          }
          return { intermediateLimits: { canUseChat: false, canUseExplanation: true, dailyMessageLimit: 10 } };
      } catch (error) {
          return { intermediateLimits: { canUseChat: false, canUseExplanation: true, dailyMessageLimit: 10 } };
      }
  },

  updateAiConfig: async (config: AiConfig): Promise<void> => {
      LocalCache.set('aiConfig', config);
      await set(ref(database, 'config/ai'), config);
  },

  // --- Announcements (Cached) ---
  getAnnouncements: async (): Promise<Announcement[]> => {
    // Announcements change rarely, cache safe
    const cached = LocalCache.get<Announcement[]>('announcements');
    if (cached) return cached;

    try {
      const snapshot = await get(child(ref(database), 'announcements'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const result = Array.isArray(data) ? data : Object.values(data);
        LocalCache.set('announcements', result);
        return result;
      }
    } catch (error) {}
    return [];
  },

  // --- Subjects (Cached) ---
  getSubjects: async (): Promise<Subject[]> => {
    const cached = LocalCache.get<Subject[]>('subjects');
    if (cached) return cached;

    try {
      const snapshot = await get(child(ref(database), 'subjects'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const result = Array.isArray(data) ? data : Object.values(data);
        LocalCache.set('subjects', result);
        return result;
      }
    } catch (error) {}
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
          LocalCache.clear('subjects');
      } catch (e) {
          throw e;
      }
  },

  // --- Topics & Subtopics (Cached) ---
  getTopics: async (): Promise<Record<string, string[]>> => {
    const cached = LocalCache.get<Record<string, string[]>>('topics');
    if (cached) return cached;

    try {
      const snapshot = await get(child(ref(database), 'topics'));
      if (snapshot.exists()) {
          const data = snapshot.val();
          LocalCache.set('topics', data);
          return data;
      }
    } catch (error) {}
    return {};
  },

  getSubTopics: async (): Promise<Record<string, string[]>> => {
    const cached = LocalCache.get<Record<string, string[]>>('subtopics');
    if (cached) return cached;

    try {
      const snapshot = await get(child(ref(database), 'subtopics'));
      if (snapshot.exists()) {
          const data = snapshot.val();
          LocalCache.set('subtopics', data);
          return data;
      }
    } catch (error) {}
    return {};
  },

  // --- Questions (Optimized Limit) ---
  getQuestions: async (category: string, subjectId: string, topic: string, subtopic?: string): Promise<Question[]> => {
    try {
      const root = category ? `questions/${category}` : `questions/regular`;
      let path = `${root}/${subjectId}/${topic}`;
      if (subtopic) {
        path += `/${subtopic}`;
      }
      
      const dbRef = ref(database, path);
      // STRICT LIMIT: 30 items
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
            if (count >= 30) return;
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
    } catch (error) {}
    return [];
  },

  getQuestionsFromSubtopics: async (category: string, subjectId: string, topic: string, subtopics: string[]): Promise<Question[]> => {
      if (!subtopics || subtopics.length === 0) return [];
      try {
          const promises = subtopics.map(sub => 
              DatabaseService.getQuestions(category, subjectId, topic, sub)
          );
          const results = await Promise.all(promises);
          return results.flat();
      } catch (e) {
          return [];
      }
  },

  getQuestionsByPath: async (category: string, subjectId: string, topic: string): Promise<(Question & { path: string, subtopic: string })[]> => {
     try {
         const root = category ? `questions/${category}` : `questions/regular`;
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
           LocalCache.clear('topics');
       }

       const subtopicsRef = ref(database, `subtopics/${topic}`);
       const subtopicsSnap = await get(subtopicsRef);
       let currentSubtopics: string[] = [];
       if (subtopicsSnap.exists()) currentSubtopics = subtopicsSnap.val();
       if (!currentSubtopics.includes(subtopic)) {
           currentSubtopics.push(subtopic);
           await set(subtopicsRef, currentSubtopics);
           LocalCache.clear('subtopics');
       }
     } catch (error) {
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
                  let lessonsList: Lesson[] = [];
                  if (Array.isArray(val)) {
                      lessonsList = val;
                  } else {
                      lessonsList = Object.keys(val).map(k => ({...val[k], id: k}));
                  }
                  lessonsList.sort((a, b) => (a.order || 0) - (b.order || 0));
                  normalized[topic] = lessonsList;
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
      const cleanLesson = JSON.parse(JSON.stringify(lesson));
      await set(newRef, cleanLesson);
    } catch (error) {
      throw error;
    }
  },

  createLessonWithOrder: async (subjectId: string, topic: string, lesson: Lesson, targetIndex: number): Promise<void> => {
      try {
          const topicRef = ref(database, `lessons/${subjectId}/${topic}`);
          const snapshot = await get(topicRef);
          let lessonsList: {id: string, data: Lesson}[] = [];
          if (snapshot.exists()) {
              const val = snapshot.val();
              lessonsList = Object.keys(val).map(k => ({id: k, data: val[k]}));
              lessonsList.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
          }

          const insertIdx = (targetIndex === -1 || targetIndex > lessonsList.length) 
                            ? lessonsList.length 
                            : targetIndex;

          const newRef = push(topicRef);
          const newId = newRef.key!;
          const updates: Record<string, any> = {};
          const cleanLesson = JSON.parse(JSON.stringify(lesson));

          updates[`${newId}`] = { ...cleanLesson, order: insertIdx };

          for (let i = insertIdx; i < lessonsList.length; i++) {
              const item = lessonsList[i];
              updates[`${item.id}/order`] = i + 1;
          }
          await update(topicRef, updates);
      } catch (error) {
          throw error;
      }
  },

  // --- Community (Limited) ---
  getPosts: async (): Promise<CommunityPost[]> => {
    try {
      const q = query(ref(database, 'posts'), limitToLast(30)); // Lower limit for mobile speed
      const snapshot = await get(q);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const postsArray = Object.keys(data).map(key => ({...data[key], id: key}));
        
        const posts = await Promise.all(postsArray.map(async (p: any) => {
             let xp = 0;
             if (p.authorId) {
                 const u = await DatabaseService.getUserProfile(p.authorId);
                 if (u) xp = u.xp;
             }
             return { ...p, authorXp: xp, replies: p.replies ? Object.values(p.replies) : [] };
        }));

        return posts.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (error) {}
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
      await set(newPostRef, { ...post, authorId: uid });
      await update(ref(database, `users/${uid}`), { lastPostedAt: now });
      await DatabaseService.processXpAction(uid, 'DAILY_LOGIN_BASE', 50); 
    } catch (error) {
      throw error;
    }
  },

  toggleLike: async (postId: string, uid: string): Promise<void> => {
      const postRef = ref(database, `posts/${postId}`);
      await runTransaction(postRef, (post) => {
          if (post) {
              if (post.likedBy && post.likedBy[uid]) {
                  post.likes = (post.likes || 1) - 1;
                  delete post.likedBy[uid];
              } else {
                  post.likes = (post.likes || 0) + 1;
                  if (!post.likedBy) post.likedBy = {};
                  post.likedBy[uid] = true;
              }
          }
          return post;
      });
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
    } catch (error) {}
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
          const resRef = push(ref(database, `user_simulation_results/${result.userId}`));
          await set(resRef, result);
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
    } catch (error) {}
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
      throw error;
    }
  }
};
