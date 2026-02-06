
import { 
  ref, 
  get, 
  set, 
  update, 
  push, 
  remove, 
  query, 
  orderByChild, 
  limitToLast
} from "firebase/database";
import { database } from "./firebaseConfig";
import { 
    Subject, 
    Lesson, 
    Question, 
    UserProfile, 
    CommunityPost, 
    Simulation, 
    SimulationResult,
    Lead,
    RechargeRequest, 
    Transaction,
    AiConfig,
    UserPlan,
    EssayCorrection,
    TrafficConfig,
    PlanConfig
} from "../types";
import { XP_VALUES } from "../constants";

// HELPER: Validate not base64
const isBase64Image = (str?: string) => {
    if (!str) return false;
    return str.trim().startsWith('data:image');
};

// HELPER: Remove undefined keys (Firebase rejects undefined)
const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    }
    if (data !== null && typeof data === 'object') {
        const newObj: any = {};
        Object.keys(data).forEach(key => {
            const val = data[key];
            if (val !== undefined) {
                newObj[key] = sanitizeData(val);
            }
        });
        return newObj;
    }
    return data;
};

// HELPER: Get current week ID
const getCurrentWeekId = () => {
    return Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
};

export const DatabaseService = {
  // --- SUBJECTS & LESSONS ---
  getSubjects: async (): Promise<Subject[]> => {
    try {
      const snapshot = await get(ref(database, 'subjects'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data);
      }
      return [];
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return [];
    }
  },

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
              const result: Record<string, Lesson[]> = {};
              
              Object.keys(data).forEach(topic => {
                  const lessonsObj = data[topic];
                  // Map the Firebase Key to the ID property explicitly
                  const lessonsArr = Object.keys(lessonsObj).map(key => ({
                      ...lessonsObj[key],
                      id: key
                  })) as Lesson[];
                  
                  result[topic] = lessonsArr.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              });
              return result;
          }
          return {};
      } catch (e) {
          console.error(e);
          return {};
      }
  },

  createSubject: async (subject: Subject): Promise<void> => {
      await set(ref(database, `subjects/${subject.id}`), sanitizeData(subject));
  },

  createLesson: async (subjectId: string, topic: string, lesson: Lesson): Promise<void> => {
      const newRef = push(ref(database, `lessons/${subjectId}/${topic}`));
      await set(newRef, sanitizeData({ ...lesson, id: newRef.key }));
      // Ensure topic exists in index
      await update(ref(database, `topics/${subjectId}`), { [topic]: true });
  },

  createLessonWithOrder: async (subjectId: string, topic: string, lesson: Lesson, targetIndex: number): Promise<void> => {
      const topicRef = ref(database, `lessons/${subjectId}/${topic}`);
      const snapshot = await get(topicRef);
      
      let lessons: any[] = [];
      if (snapshot.exists()) {
          const data = snapshot.val();
          lessons = Object.keys(data).map(key => ({
              ...data[key],
              id: key
          })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      }

      const newRef = push(topicRef);
      const newLessonWithId = { ...lesson, id: newRef.key };

      if (targetIndex === -1 || targetIndex >= lessons.length) {
          lessons.push(newLessonWithId);
      } else {
          lessons.splice(targetIndex, 0, newLessonWithId);
      }

      const updates: any = {};
      lessons.forEach((l, idx) => {
          updates[`${l.id}/order`] = idx;
          if (l.id === newRef.key) {
              updates[`${l.id}`] = sanitizeData({ ...l, order: idx });
          }
      });

      await update(topicRef, updates);
      await update(ref(database, `topics/${subjectId}`), { [topic]: true });
  },

  // --- QUESTIONS ---
  
  // Updated: Tries to fetch from specific subtopic node first for optimization
  getQuestions: async (category: string, subjectId: string, topic: string, subtopic?: string): Promise<Question[]> => {
      try {
          let path = `questions/${category}/${subjectId}/${topic}`;
          
          // Optimization: If subtopic is known, fetch ONLY that node
          if (subtopic) {
              path = `questions/${category}/${subjectId}/${topic}/${subtopic}`;
          }

          const snapshot = await get(ref(database, path));
          
          if (snapshot.exists()) {
              const data = snapshot.val();
              let questions: Question[] = [];
              
              if (subtopic) {
                  // Direct list of questions
                  questions = Object.values(data) as Question[];
              } else {
                  // It's a map of subtopics -> questions
                  Object.keys(data).forEach(subKey => {
                      const subItem = data[subKey];
                      // Handle legacy structure where questions might be direct or nested
                      if (subItem.text) {
                          // Legacy direct question (unlikely with new structure but safe to keep)
                          questions.push(subItem);
                      } else {
                          // Standard: subItem is a map of questions
                          const subQuestions = Object.values(subItem) as Question[];
                          questions = questions.concat(subQuestions);
                      }
                  });
              }
              return questions;
          }
          return [];
      } catch (e) {
          console.error("Error fetching questions:", e);
          return [];
      }
  },

  getQuestionsFromSubtopics: async (category: string, subjectId: string, topic: string, subtopics: string[]): Promise<Question[]> => {
      try {
           const allQuestions: Question[] = [];
           // Parallel fetch for selected subtopics to minimize data
           const promises = subtopics.map(sub => 
               get(ref(database, `questions/${category}/${subjectId}/${topic}/${sub}`))
           );
           
           const snapshots = await Promise.all(promises);
           
           snapshots.forEach(snap => {
               if (snap.exists()) {
                   const qs = Object.values(snap.val()) as Question[];
                   allQuestions.push(...qs);
               }
           });
           
           return allQuestions;
      } catch (e) {
          return [];
      }
  },

  createQuestion: async (category: string, subjectId: string, topic: string, subtopic: string, question: Question): Promise<void> => {
      if (isBase64Image(question.imageUrl)) {
          throw new Error("Imagens devem ser URLs externas (não cole imagens direto).");
      }

      const path = `questions/${category}/${subjectId}/${topic}/${subtopic}`;
      const newRef = push(ref(database, path));
      await set(newRef, sanitizeData({ ...question, id: newRef.key, subjectId, topic, subtopic }));
      
      // Update Indices
      await update(ref(database, `topics/${subjectId}`), { [topic]: true }); 
      // NEW HIERARCHY: subtopics are nested under subjectId -> topicId
      await update(ref(database, `subtopics/${subjectId}/${topic}`), { [subtopic]: true }); 
  },
  
  getTopics: async (): Promise<Record<string, string[]>> => {
      const snap = await get(ref(database, 'topics'));
      if(snap.exists()) {
          const data = snap.val();
          const result: Record<string, string[]> = {};
          Object.keys(data).forEach(subj => {
              result[subj] = Object.keys(data[subj]);
          });
          return result;
      }
      return {};
  },

  // Updated to return nested structure Record<SubjectId, Record<TopicId, SubtopicList>>
  getSubTopics: async (): Promise<Record<string, Record<string, string[]>>> => {
      const snap = await get(ref(database, 'subtopics'));
      if(snap.exists()) {
          const data = snap.val();
          const result: Record<string, Record<string, string[]>> = {};
          
          // Data structure: subtopics -> subjectId -> topicId -> { subtopicName: true }
          Object.keys(data).forEach(subjectId => {
              result[subjectId] = {};
              const topicsMap = data[subjectId];
              
              Object.keys(topicsMap).forEach(topicId => {
                  result[subjectId][topicId] = Object.keys(topicsMap[topicId]);
              });
          });
          return result;
      }
      return {};
  },

  getQuestionsByPath: async (category: string, subjectId: string, topic: string): Promise<(Question & { path: string, subtopic: string })[]> => {
      const list: (Question & { path: string, subtopic: string })[] = [];
      const snap = await get(ref(database, `questions/${category}/${subjectId}/${topic}`));
      if (snap.exists()) {
          const data = snap.val();
          Object.keys(data).forEach(subtopic => {
              if (data[subtopic]) {
                  const qs = data[subtopic];
                  Object.keys(qs).forEach(qId => {
                      if(typeof qs[qId] === 'object') {
                        list.push({ ...qs[qId], path: `questions/${category}/${subjectId}/${topic}/${subtopic}/${qId}`, subtopic });
                      }
                  });
              }
          });
      }
      return list;
  },
  
  getQuestionsByIds: async (ids: string[]): Promise<Question[]> => {
      if (!ids || ids.length === 0) return [];
      // Simulation logic often needs a direct fetch. 
      // If we don't know the path, this is hard in RTDB without a global index.
      // For now, returning empty or we need to change Simulation structure to store paths.
      // Assuming for this update we focus on the hierarchical browsing.
      return [];
  },

  // --- USER PROFILE ---
  
  ensureUserProfile: async (uid: string, defaultData: Partial<UserProfile>): Promise<UserProfile> => {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
          const newUser = {
              ...defaultData,
              xp: 0,
              weeklyXp: 0,
              lastXpWeek: getCurrentWeekId(),
              balance: 0,
              plan: defaultData.plan || 'basic',
              createdAt: Date.now()
          };
          await set(userRef, sanitizeData(newUser));
          return { uid, ...newUser } as UserProfile;
      }
      
      const existing = snapshot.val();
      
      // Cleanup legacy heavy fields if they exist
      if (existing.essays || existing.essay_images) {
          await update(userRef, { essays: null, essay_images: null });
          delete existing.essays;
          delete existing.essay_images;
      }

      // SECURITY: If we detect a Base64 photoURL in the profile, wipe it.
      if (isBase64Image(existing.photoURL)) {
          const cleanPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(existing.displayName || 'User')}&background=random`;
          await update(userRef, { photoURL: cleanPhoto });
          existing.photoURL = cleanPhoto;
      }

      // SAFETY: Robust update logic
      const updates: any = {};
      let needsUpdate = false;

      // 1. Check Plan - Only default to basic if strictly undefined/null/empty
      if (!existing.plan) {
          updates.plan = defaultData.plan || 'basic';
          needsUpdate = true;
      }

      // 2. Check Balance
      if (existing.balance === undefined) {
          updates.balance = 0;
          needsUpdate = true;
      }

      if (needsUpdate) {
           const updated = { ...existing, ...updates };
           await update(userRef, sanitizeData(updates));
           return { uid, ...updated };
      }

      return { uid, ...existing };
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const snapshot = await get(ref(database, `users/${uid}`));
      if (snapshot.exists()) {
        return { uid, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  saveUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
      if (isBase64Image(data.photoURL)) {
          data.photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'User')}`;
      }
      await update(ref(database, `users/${uid}`), sanitizeData(data));
  },

  createUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
       await set(ref(database, `users/${uid}`), sanitizeData(data));
  },

  updateUserPlan: async (uid: string, plan: UserPlan, expiry: string): Promise<void> => {
      await update(ref(database, `users/${uid}`), {
        plan: plan,
        subscriptionExpiry: expiry
      });
  },

  getUsersPaginated: async (limit: number): Promise<UserProfile[]> => {
      const q = query(ref(database, 'users'), limitToLast(limit));
      const snap = await get(q);
      if (snap.exists()) {
          return Object.values(snap.val());
      }
      return [];
  },

  // --- XP & GAMIFICATION ---
  processXpAction: async (uid: string, actionType: string, customAmount?: number): Promise<void> => {
      let xpAmount = 0;
      
      // Allow custom amount override if provided (useful for dynamic XP like essay scores)
      if (customAmount !== undefined) {
          xpAmount = customAmount;
      } else {
          xpAmount = XP_VALUES[actionType as keyof typeof XP_VALUES] || 0;
      }

      if (!xpAmount || xpAmount <= 0) return;
      
      const userRef = ref(database, `users/${uid}`);
      const snap = await get(userRef);
      if (snap.exists()) {
          const userData = snap.val();
          const currentXp = userData.xp || 0;
          
          // Weekly Logic
          const currentWeekId = getCurrentWeekId();
          let weeklyXp = userData.weeklyXp || 0;
          const lastXpWeek = userData.lastXpWeek || 0;

          if (currentWeekId !== lastXpWeek) {
              weeklyXp = 0; // Reset for new week
          }

          await update(userRef, { 
              xp: currentXp + xpAmount,
              weeklyXp: weeklyXp + xpAmount,
              lastXpWeek: currentWeekId
          });
          
          if (DatabaseService._xpCallback) DatabaseService._xpCallback(xpAmount, actionType);
      }
  },
  
  _xpCallback: null as ((amount: number, reason: string) => void) | null,
  onXpEarned: (callback: (amount: number, reason: string) => void) => {
      DatabaseService._xpCallback = callback;
      return () => { DatabaseService._xpCallback = null; };
  },

  getCompletedLessons: async (uid: string): Promise<string[]> => {
      const snap = await get(ref(database, `users/${uid}/completedLessons`));
      if (snap.exists()) return Object.keys(snap.val());
      return [];
  },

  markLessonComplete: async (uid: string, lessonId: string): Promise<void> => {
      await update(ref(database, `users/${uid}/completedLessons`), { [lessonId]: true });
      const userRef = ref(database, `users/${uid}`);
      const snap = await get(userRef);
      const hours = snap.val()?.hoursStudied || 0;
      await update(userRef, { hoursStudied: hours + 0.5 });
  },
  
  getAnsweredQuestions: async (uid: string): Promise<Record<string, {correct: boolean}>> => {
      const snap = await get(ref(database, `users/${uid}/answeredQuestions`));
      if (snap.exists()) return snap.val();
      return {};
  },

  markQuestionAsAnswered: async (uid: string, questionId: string, correct: boolean): Promise<void> => {
      await update(ref(database, `users/${uid}/answeredQuestions/${questionId}`), { correct, timestamp: Date.now() });
  },

  incrementQuestionsAnswered: async (uid: string, count: number): Promise<void> => {
       const userRef = ref(database, `users/${uid}`);
       const snap = await get(userRef);
       const current = snap.val()?.questionsAnswered || 0;
       await update(userRef, { questionsAnswered: current + count });
  },

  getLeaderboard: async (period: 'total' | 'weekly' = 'total'): Promise<UserProfile[]> => {
      const q = query(ref(database, 'users'));
      const snap = await get(q);
      
      if (snap.exists()) {
          const users = Object.values(snap.val()) as UserProfile[];
          users.forEach(u => {
              if (isBase64Image(u.photoURL)) {
                  u.photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`;
              }
          });

          if (period === 'weekly') {
              return users.sort((a, b) => (b.weeklyXp || 0) - (a.weeklyXp || 0)).slice(0, 50);
          }
          return users.sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 50);
      }
      return [];
  },

  // --- COMMUNITY ---
  getPosts: async (): Promise<CommunityPost[]> => {
      const q = query(ref(database, 'community_posts'), limitToLast(50));
      const snap = await get(q);
      if (snap.exists()) {
          const posts = Object.values(snap.val()) as CommunityPost[];
          posts.forEach(p => {
              if (isBase64Image(p.authorAvatar)) {
                  p.authorAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.authorName)}&background=random`;
              }
          });
          return posts.sort((a, b) => b.timestamp - a.timestamp);
      }
      return [];
  },

  createPost: async (post: Partial<CommunityPost>, uid: string): Promise<void> => {
      if (isBase64Image(post.authorAvatar)) {
          post.authorAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'User')}`;
      }

      const userRef = ref(database, `users/${uid}`);
      const userSnap = await get(userRef);
      const lastPosted = userSnap.val()?.lastPostedAt || 0;
      
      const oneDay = 24 * 60 * 60 * 1000;
      if (Date.now() - lastPosted < oneDay) {
          throw new Error("Você já postou nas últimas 24 horas.");
      }

      const newRef = push(ref(database, 'community_posts'));
      await set(newRef, sanitizeData({ ...post, id: newRef.key }));
      await update(userRef, { lastPostedAt: Date.now() });
  },

  toggleLike: async (postId: string, uid: string): Promise<void> => {
      const postRef = ref(database, `community_posts/${postId}`);
      const snap = await get(postRef);
      if (snap.exists()) {
          const post = snap.val();
          const likes = post.likes || 0;
          const likedBy = post.likedBy || {};
          
          if (likedBy[uid]) {
              await update(postRef, { likes: likes - 1, [`likedBy/${uid}`]: null });
          } else {
              await update(postRef, { likes: likes + 1, [`likedBy/${uid}`]: true });
              DatabaseService.processXpAction(uid, 'LIKE_COMMENT');
          }
      }
  },

  replyPost: async (postId: string, reply: { author: string, content: string }): Promise<void> => {
      const postRef = ref(database, `community_posts/${postId}/replies`);
      const snap = await get(postRef);
      const replies = snap.exists() ? snap.val() : [];
      const newReplies = [...replies, { ...reply, timestamp: Date.now() }];
      await set(postRef, sanitizeData(newReplies));
  },

  // --- SIMULATIONS ---
  getSimulations: async (): Promise<Simulation[]> => {
      const snap = await get(ref(database, 'simulations'));
      if (snap.exists()) return Object.values(snap.val());
      return [];
  },

  createSimulation: async (sim: Simulation): Promise<void> => {
      const newRef = push(ref(database, 'simulations'));
      await set(newRef, sanitizeData({ ...sim, id: newRef.key }));
  },

  saveSimulationResult: async (result: SimulationResult): Promise<void> => {
      const newRef = push(ref(database, `user_simulations/${result.userId}`));
      await set(newRef, sanitizeData(result));
      
      const xpBase = XP_VALUES.SIMULATION_FINISH;
      const xpBonus = result.score * 2;
      const userRef = ref(database, `users/${result.userId}`);
      const snap = await get(userRef);
      const currentXp = snap.val()?.xp || 0;
      await update(userRef, { xp: currentXp + xpBase + xpBonus });
  },

  // --- ADMIN & MISC ---
  getLeads: async (): Promise<Lead[]> => {
      const snap = await get(ref(database, 'leads'));
      if (snap.exists()) return Object.values(snap.val());
      return [];
  },

  createLead: async (lead: Partial<Lead>): Promise<void> => {
      const newRef = push(ref(database, 'leads'));
      await set(newRef, sanitizeData({ ...lead, id: newRef.key, status: lead.status || 'pending_pix', processed: false }));
  },

  markLeadProcessed: async (leadId: string): Promise<void> => {
      await update(ref(database, `leads/${leadId}`), { processed: true, status: 'approved_access' });
  },

  getRechargeRequests: async (): Promise<RechargeRequest[]> => {
      const snap = await get(ref(database, 'recharge_requests'));
      if (snap.exists()) return Object.values(snap.val());
      return [];
  },
  
  createRechargeRequest: async (uid: string, name: string, amount: number, currencyType: 'BRL'|'CREDIT', quantityCredits?: number, planLabel?: string): Promise<void> => {
      const newRef = push(ref(database, 'recharge_requests'));
      const req: RechargeRequest = {
          id: newRef.key!,
          userId: uid,
          userDisplayName: name, // This can now be the Payer's name provided by input
          amount,
          currencyType,
          quantityCredits,
          type: currencyType === 'CREDIT' ? 'CREDIT' : 'BALANCE',
          status: 'pending',
          timestamp: Date.now(),
          planLabel
      };
      await set(newRef, sanitizeData(req));
  },

  processRecharge: async (reqId: string, status: 'approved' | 'rejected'): Promise<void> => {
      const reqRef = ref(database, `recharge_requests/${reqId}`);
      const snap = await get(reqRef);
      if (!snap.exists()) return;
      
      const req = snap.val() as RechargeRequest;
      await update(reqRef, { status });
      
      if (status === 'approved') {
          const userRef = ref(database, `users/${req.userId}`);
          const userSnap = await get(userRef);
          const userData = userSnap.val();

          // SPECIAL LOGIC: Handle Plan Upgrade
          if (req.planLabel && req.planLabel.includes('UPGRADE')) {
              let newPlan: UserPlan = 'basic';
              const labelLower = req.planLabel.toLowerCase();
              if (labelLower.includes('advanced') || labelLower.includes('pro')) newPlan = 'advanced';
              
              await update(userRef, { plan: newPlan });
          } 
          // Standard Recharge
          else if (req.currencyType === 'CREDIT') {
              const current = userData?.essayCredits || 0;
              await update(userRef, { essayCredits: current + (req.quantityCredits || 0) });
          } else {
              const current = userData?.balance || 0;
              await update(userRef, { balance: current + req.amount });
          }
          
          const transRef = push(ref(database, `user_transactions/${req.userId}`));
          await set(transRef, {
              id: transRef.key,
              type: 'credit',
              amount: req.amount,
              description: req.planLabel || `Recarga ${req.currencyType === 'CREDIT' ? 'Créditos' : 'Saldo'}`,
              timestamp: Date.now(),
              currencyType: req.currencyType
          });
      }
  },

  getAiConfig: async (): Promise<AiConfig> => {
      const snap = await get(ref(database, 'config/ai'));
      if (snap.exists()) return snap.val();
      return { intermediateLimits: { canUseChat: false, canUseExplanation: true } };
  },

  getPlanConfig: async (): Promise<PlanConfig> => {
      const snap = await get(ref(database, 'config/plans'));
      if (snap.exists()) return snap.val();
      return {
          permissions: {
              basic: { canUseChat: false, canUseExplanation: true, canUseEssay: false, canUseSimulations: false, canUseCommunity: true, canUseMilitary: false },
              advanced: { canUseChat: true, canUseExplanation: true, canUseEssay: true, canUseSimulations: true, canUseCommunity: true, canUseMilitary: true },
          },
          prices: {
              basic: 29.90,
              advanced: 79.90
          }
      };
  },

  savePlanConfig: async (config: PlanConfig): Promise<void> => {
      await update(ref(database, 'config/plans'), config);
  },

  getTrafficSettings: async (): Promise<TrafficConfig> => {
      try {
          const snapshot = await get(ref(database, 'config/traffic'));
          if (snapshot.exists()) {
              return snapshot.val();
          }
          return { vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' };
      } catch (e) {
          return { vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' };
      }
  },

  saveTrafficSettings: async (settings: TrafficConfig): Promise<void> => {
      await update(ref(database, 'config/traffic'), settings);
  },

  deletePath: async (path: string): Promise<void> => {
      await remove(ref(database, path));
  },

  updatePath: async (path: string, data: any): Promise<void> => {
      if (isBase64Image(data.imageUrl) || isBase64Image(data.photoURL)) {
          throw new Error("Imagens Base64 bloqueadas.");
      }
      await update(ref(database, path), sanitizeData(data));
  },

  // --- ESSAY HANDLING (METADATA ONLY) ---
  
  getEssayCorrections: async (uid: string): Promise<EssayCorrection[]> => {
      const snap = await get(ref(database, `user_essays/${uid}`));
      let essays: EssayCorrection[] = [];
      if (snap.exists()) {
          essays = Object.values(snap.val());
      } 
      return essays;
  },

  saveEssayCorrection: async (uid: string, correction: EssayCorrection): Promise<void> => {
      const newRef = push(ref(database, `user_essays/${uid}`)); 
      const essayId = newRef.key;
      
      if (!essayId) throw new Error("ID gen failed");

      const cleanCorrection = { 
          ...correction, 
          id: essayId, 
          imageUrl: null 
      };
      
      await set(newRef, sanitizeData(cleanCorrection));
  },

  getUserTransactions: async (uid: string): Promise<Transaction[]> => {
      const snap = await get(ref(database, `user_transactions/${uid}`));
      if (snap.exists()) return (Object.values(snap.val()) as Transaction[]).reverse();
      return [];
  }
};
