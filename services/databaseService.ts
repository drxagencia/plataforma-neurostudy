
import { 
  ref, 
  get, 
  set, 
  update, 
  push, 
  remove, 
  query, 
  orderByChild, 
  limitToLast,
  onValue,
  increment
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
    UserPlan,
    EssayCorrection,
    TrafficConfig,
    PlanConfig,
    SupportTicket,
    SupportMessage,
    UserStatsMap
} from "../types";
import { XP_VALUES } from "../constants";

const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) return data.map(sanitizeData);
    if (data !== null && typeof data === 'object') {
        const newObj: any = {};
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) newObj[key] = sanitizeData(data[key]);
        });
        return newObj;
    }
    return data;
};

const getCurrentWeekId = () => Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));

export const DatabaseService = {
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
              createdAt: Date.now(),
              totalSpent: 0,
              firstTimeSetupDone: false
          };
          await set(userRef, sanitizeData(newUser));
          return { uid, ...newUser } as UserProfile;
      }
      return { uid, ...snapshot.val() };
  },

  updateOnboarding: async (uid: string, whatsapp: string): Promise<void> => {
      await update(ref(database, `users/${uid}`), {
          whatsapp,
          firstTimeSetupDone: true
      });
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const snapshot = await get(ref(database, `users/${uid}`));
      return snapshot.exists() ? { uid, ...snapshot.val() } : null;
    } catch (error) { return null; }
  },

  saveUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
      await update(ref(database, `users/${uid}`), sanitizeData(data));
  },

  createUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
       await set(ref(database, `users/${uid}`), sanitizeData({ ...data, totalSpent: data.totalSpent || 0 }));
  },

  // --- FINANCE & LTV ---
  processRecharge: async (reqId: string, status: 'approved' | 'rejected'): Promise<void> => {
      const reqRef = ref(database, `recharge_requests/${reqId}`);
      const snap = await get(reqRef);
      if (!snap.exists()) return;
      
      const req = snap.val() as RechargeRequest;
      await update(reqRef, { status });
      
      if (status === 'approved') {
          const userRef = ref(database, `users/${req.userId}`);
          const updates: any = {
              totalSpent: increment(req.amount) // SOMA AO LTV
          };

          if (req.planLabel && req.planLabel.includes('UPGRADE')) {
              updates['plan'] = req.planLabel.toLowerCase().includes('adv') ? 'advanced' : 'basic';
              const expiry = new Date();
              expiry.setDate(expiry.getDate() + 30);
              updates['subscriptionExpiry'] = expiry.toISOString().split('T')[0];
          } 
          else if (req.currencyType === 'CREDIT') {
              updates['essayCredits'] = increment(req.quantityCredits || 0);
          } else {
              updates['balance'] = increment(req.amount);
          }
          
          await update(userRef, updates);
          
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

  createRechargeRequest: async (userId: string, userDisplayName: string, amount: number, currencyType: 'BRL' | 'CREDIT', quantityCredits?: number, planLabel?: string) => {
      const r = push(ref(database, 'recharge_requests'));
      const req: RechargeRequest = {
          id: r.key!,
          userId,
          userDisplayName,
          amount,
          currencyType,
          quantityCredits,
          type: currencyType === 'CREDIT' ? 'CREDIT' : 'BALANCE',
          status: 'pending',
          timestamp: Date.now(),
          planLabel
      };
      await set(r, sanitizeData(req));
  },

  markLeadProcessed: async (leadId: string, amount: number, userId: string): Promise<void> => {
      await update(ref(database, `leads/${leadId}`), { processed: true, status: 'approved_access' });
      await update(ref(database, `users/${userId}`), { totalSpent: increment(amount) }); // SOMA AO LTV
  },

  // --- GETTERS ---
  getLeads: async (): Promise<Lead[]> => {
      const snap = await get(ref(database, 'leads'));
      return snap.exists() ? Object.values(snap.val()) : [];
  },
  getUsersPaginated: async (limitCount: number): Promise<UserProfile[]> => {
      const snap = await get(query(ref(database, 'users'), limitToLast(limitCount)));
      return snap.exists() ? Object.values(snap.val()) : [];
  },
  getRechargeRequests: async () => {
      const snap = await get(ref(database, 'recharge_requests'));
      return snap.exists() ? Object.values(snap.val()) : [];
  },
  getSubjects: async (): Promise<Subject[]> => {
      const snapshot = await get(ref(database, 'subjects'));
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
  },
  getSubjectsWithLessons: async (): Promise<string[]> => {
      const snapshot = await get(ref(database, 'lessons'));
      return snapshot.exists() ? Object.keys(snapshot.val()) : [];
  },
  getLessonsByTopic: async (subjectId: string): Promise<Record<string, Lesson[]>> => {
      const snapshot = await get(ref(database, `lessons/${subjectId}`));
      if (!snapshot.exists()) return {};
      const data = snapshot.val();
      const result: Record<string, Lesson[]> = {};
      Object.keys(data).forEach(topic => {
          result[topic] = Object.keys(data[topic]).map(k => ({ ...data[topic][k], id: k }));
      });
      return result;
  },
  getTopics: async (): Promise<Record<string, string[]>> => {
      const snapshot = await get(ref(database, 'topics'));
      return snapshot.exists() ? snapshot.val() : {};
  },
  getQuestions: async (cat: string, sub: string, top: string, subTopic?: string) => {
      let path = `questions/${cat}/${sub}/${top}`;
      if (subTopic) path += `/${subTopic}`;
      const snap = await get(ref(database, path));
      if (!snap.exists()) return [];
      const data = snap.val();
      const list: Question[] = [];
      Object.keys(data).forEach(sk => {
          if (data[sk].text) list.push({ ...data[sk], id: sk });
          else Object.keys(data[sk]).forEach(k => list.push({ ...data[sk][k], id: k }));
      });
      return list;
  },

  // Fix: Added missing getQuestionsFromSubtopics method
  getQuestionsFromSubtopics: async (cat: string, sub: string, top: string, subTopics: string[]) => {
      const results: Question[] = [];
      for (const st of subTopics) {
          const snap = await get(ref(database, `questions/${cat}/${sub}/${top}/${st}`));
          if (snap.exists()) {
              const data = snap.val();
              Object.keys(data).forEach(k => results.push({ ...data[k], id: k }));
          }
      }
      return results;
  },

  getAvailableSubtopics: async (cat: string, sub: string, top: string) => {
      const snap = await get(ref(database, `questions/${cat}/${sub}/${top}`));
      return snap.exists() ? Object.keys(snap.val()) : [];
  },
  getAllSupportTickets: async (): Promise<SupportTicket[]> => {
      const snap = await get(ref(database, 'support_tickets'));
      return snap.exists() ? Object.values(snap.val()) : [];
  },
  getSupportTicket: async (uid: string) => {
      const snap = await get(ref(database, `support_tickets/${uid}`));
      return snap.exists() ? snap.val() as SupportTicket : null;
  },

  // Fix: Added missing createSupportTicket method
  createSupportTicket: async (uid: string, userName: string, userEmail: string, issueDescription: string) => {
      const ticket: SupportTicket = {
          id: uid,
          userId: uid,
          userName,
          userEmail,
          issueDescription,
          status: 'open',
          messages: [],
          lastUpdated: Date.now()
      };
      await set(ref(database, `support_tickets/${uid}`), sanitizeData(ticket));
  },

  // Fix: Added missing resolveSupportTicket method
  resolveSupportTicket: async (uid: string) => {
      await remove(ref(database, `support_tickets/${uid}`));
  },

  replySupportTicket: async (uid: string, content: string, role: string) => {
      const ticketRef = ref(database, `support_tickets/${uid}`);
      const snap = await get(ticketRef);
      if (snap.exists()) {
          const t = snap.val();
          const msgs = [...(t.messages || []), { role, content, timestamp: Date.now() }];
          await update(ticketRef, { messages: msgs, lastUpdated: Date.now(), status: role === 'admin' ? 'answered' : 'open' });
      }
  },

  // Fix: Added missing clearSupportNotification method
  clearSupportNotification: async (uid: string) => {
      await update(ref(database, `users/${uid}`), { hasSupportNotification: false });
  },

  processXpAction: async (uid: string, action: string, amountOverride?: number) => {
      const xp = amountOverride !== undefined ? amountOverride : (XP_VALUES[action as keyof typeof XP_VALUES] || 0);
      if (xp > 0) await update(ref(database, `users/${uid}`), { xp: increment(xp) });
  },
  markLessonComplete: async (uid: string, lid: string) => update(ref(database, `users/${uid}/completedLessons`), { [lid]: true }),
  getCompletedLessons: async (uid: string) => {
      const snap = await get(ref(database, `users/${uid}/completedLessons`));
      return snap.exists() ? Object.keys(snap.val()) : [];
  },
  getAnsweredQuestions: async (uid: string) => {
      const snap = await get(ref(database, `users/${uid}/answeredQuestions`));
      return snap.exists() ? snap.val() : {};
  },

  // Fix: Added missing incrementQuestionsAnswered method
  incrementQuestionsAnswered: async (uid: string, amount: number) => {
      await update(ref(database, `users/${uid}`), { questionsAnswered: increment(amount) });
  },

  markQuestionAsAnswered: async (uid: string, qid: string, cor: boolean, sub?: string, top?: string) => {
      const up: any = { [`users/${uid}/answeredQuestions/${qid}`]: { correct: cor, timestamp: Date.now() } };
      if (sub && top) up[`user_stats/${uid}/${sub}/${top}/${cor ? 'correct' : 'wrong'}`] = increment(1);
      await update(ref(database), up);
  },
  getLeaderboard: async (p: string) => {
      const snap = await get(ref(database, 'users'));
      if (!snap.exists()) return [];
      const users = Object.values(snap.val()) as UserProfile[];
      return users.sort((a, b) => (p === 'weekly' ? (b.weeklyXp || 0) - (a.weeklyXp || 0) : (b.xp || 0) - (a.xp || 0))).slice(0, 50);
  },

  // Fix: Added missing getPosts method
  getPosts: async (): Promise<CommunityPost[]> => {
      const snap = await get(ref(database, 'community_posts'));
      if (!snap.exists()) return [];
      return Object.values(snap.val()).reverse() as CommunityPost[];
  },

  // Fix: Added missing createPost method
  createPost: async (post: Partial<CommunityPost>, uid: string) => {
      const userRef = ref(database, `users/${uid}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
          const user = userSnap.val();
          const lastPostedAt = user.lastPostedAt || 0;
          const cooldown = 24 * 60 * 60 * 1000;
          if (Date.now() - lastPostedAt < cooldown) {
              throw new Error("Aguarde 24h para postar novamente.");
          }
      }

      const postRef = push(ref(database, 'community_posts'));
      await set(postRef, sanitizeData({ ...post, id: postRef.key, likedBy: {} }));
      await update(userRef, { lastPostedAt: Date.now() });
      await DatabaseService.processXpAction(uid, 'AI_CHAT_MESSAGE');
  },

  // Fix: Added missing toggleLike method
  toggleLike: async (postId: string, uid: string) => {
      const postRef = ref(database, `community_posts/${postId}`);
      const snap = await get(postRef);
      if (!snap.exists()) return;
      
      const post = snap.val();
      const likedBy = post.likedBy || {};
      const isLiked = !!likedBy[uid];
      
      if (isLiked) {
          delete likedBy[uid];
          await update(postRef, { likes: Math.max(0, post.likes - 1), likedBy });
      } else {
          likedBy[uid] = true;
          await update(postRef, { likes: (post.likes || 0) + 1, likedBy });
          await DatabaseService.processXpAction(uid, 'LIKE_COMMENT');
      }
  },

  // Fix: Added missing replyPost method
  replyPost: async (postId: string, reply: { author: string; content: string }) => {
      const postRef = ref(database, `community_posts/${postId}`);
      const snap = await get(postRef);
      if (snap.exists()) {
          const post = snap.val();
          const replies = [...(post.replies || []), { ...reply, timestamp: Date.now() }];
          await update(postRef, { replies: sanitizeData(replies) });
      }
  },

  getEssayCorrections: async (uid: string) => {
      const snap = await get(ref(database, `user_essays/${uid}`));
      return snap.exists() ? Object.values(snap.val()) : [];
  },
  saveEssayCorrection: async (uid: string, c: EssayCorrection) => {
      const r = push(ref(database, `user_essays/${uid}`));
      await set(r, sanitizeData({ ...c, id: r.key }));
  },
  getUserTransactions: async (uid: string) => {
      const snap = await get(ref(database, `user_transactions/${uid}`));
      return snap.exists() ? Object.values(snap.val()).reverse() : [];
  },
  createLead: async (l: any) => {
      const r = push(ref(database, 'leads'));
      await set(r, sanitizeData({ ...l, id: r.key, status: l.status || 'pending_pix', processed: false }));
  },
  updatePath: async (p: string, d: any) => update(ref(database, p), sanitizeData(d)),
  getUserStats: async (uid: string) => {
      const snap = await get(ref(database, `user_stats/${uid}`));
      return snap.exists() ? snap.val() : {};
  },
  getSimulations: async () => {
      const snap = await get(ref(database, 'simulations'));
      return snap.exists() ? Object.values(snap.val()) : [];
  },
  getQuestionsByIds: async (ids: string[]) => {
      const snap = await get(ref(database, 'questions'));
      if (!snap.exists()) return [];
      const all = snap.val();
      const res: Question[] = [];
      const setIds = new Set(ids);
      Object.values(all).forEach((cat: any) => {
          Object.values(cat).forEach((sub: any) => {
              Object.values(sub).forEach((top: any) => {
                  Object.values(top).forEach((st: any) => {
                      Object.keys(st).forEach(k => { if(setIds.has(k)) res.push({...st[k], id: k}); });
                  });
              });
          });
      });
      return res;
  },
  saveSimulationResult: async (res: SimulationResult) => {
      const r = push(ref(database, `user_simulations/${res.userId}`));
      await set(r, sanitizeData(res));
      await update(ref(database, `users/${res.userId}`), { xp: increment(150 + res.score * 2) });
  },
  getTrafficSettings: async () => {
      const snap = await get(ref(database, 'config/traffic'));
      return snap.exists() ? snap.val() : { vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' };
  }
};
