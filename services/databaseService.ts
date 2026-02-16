
import { 
  ref, get, set, update, push, remove, query, limitToLast, increment, orderByChild
} from "firebase/database";
import { database } from "./firebaseConfig";
import { UserProfile, Lead, RechargeRequest, Transaction, Subject, Lesson, CommunityPost, Simulation, SimulationResult, EssayCorrection, SupportTicket, UserStatsMap, OperationalCost, TrafficConfig, Question } from "../types";
import { SUBJECTS, XP_VALUES } from "../constants";

export const DatabaseService = {
  // --- USER PROFILE & AUTH ---
  ensureUserProfile: async (uid: string, initialData: Partial<UserProfile>): Promise<UserProfile> => {
    const userRef = ref(database, `users/${uid}`);
    const snap = await get(userRef);
    if (snap.exists()) {
      return snap.val() as UserProfile;
    }
    const profile = {
      ...initialData,
      xp: 0,
      weeklyXp: 0,
      balance: 0,
      essayCredits: 0,
      hoursStudied: 0,
      questionsAnswered: 0,
      loginStreak: 1,
      theme: 'dark',
      firstTimeSetupDone: false,
      totalSpent: 0
    };
    await set(userRef, profile);
    return profile as UserProfile;
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const snap = await get(ref(database, `users/${uid}`));
    return snap.exists() ? snap.val() as UserProfile : null;
  },

  saveUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    await update(ref(database, `users/${uid}`), data);
  },

  updateOnboarding: async (uid: string, whatsapp: string): Promise<void> => {
    await update(ref(database, `users/${uid}`), { whatsapp, firstTimeSetupDone: true });
  },

  getUsersPaginated: async (limit: number): Promise<UserProfile[]> => {
    const snap = await get(query(ref(database, 'users'), limitToLast(limit)));
    if (!snap.exists()) return [];
    return Object.values(snap.val()) as UserProfile[];
  },

  getAllUsers: async (): Promise<UserProfile[]> => {
    const snap = await get(ref(database, 'users'));
    if (!snap.exists()) return [];
    return Object.values(snap.val()) as UserProfile[];
  },

  // --- STATS & XP ---
  getUserStats: async (uid: string): Promise<UserStatsMap | null> => {
    const snap = await get(ref(database, `user_stats/${uid}`));
    return snap.exists() ? snap.val() as UserStatsMap : null;
  },

  processXpAction: async (uid: string, action: keyof typeof XP_VALUES, manualXp?: number): Promise<void> => {
    const xpToAdd = manualXp !== undefined ? manualXp : (XP_VALUES[action] || 0);
    if (xpToAdd === 0 && manualXp === undefined) return;

    await update(ref(database, `users/${uid}`), {
      xp: increment(xpToAdd),
      weeklyXp: increment(xpToAdd)
    });
  },

  incrementQuestionsAnswered: async (uid: string, count: number): Promise<void> => {
    await update(ref(database, `users/${uid}`), { questionsAnswered: increment(count) });
  },

  getLeaderboard: async (period: 'weekly' | 'total'): Promise<UserProfile[]> => {
    const field = period === 'weekly' ? 'weeklyXp' : 'xp';
    const snap = await get(query(ref(database, 'users'), orderByChild(field), limitToLast(20)));
    if (!snap.exists()) return [];
    const users = Object.values(snap.val()) as UserProfile[];
    return users.sort((a: any, b: any) => (b[field] || 0) - (a[field] || 0));
  },

  // --- CONTENT (SUBJECTS & LESSONS) ---
  getSubjects: async (): Promise<Subject[]> => {
    const snap = await get(ref(database, 'subjects'));
    return snap.exists() ? Object.values(snap.val()) : SUBJECTS;
  },

  updateSubject: async (id: string, data: Subject): Promise<void> => {
    await set(ref(database, `subjects/${id}`), data);
  },

  deleteSubject: async (id: string): Promise<void> => {
    await remove(ref(database, `subjects/${id}`));
    await remove(ref(database, `lessons/${id}`));
  },

  getSubjectsWithLessons: async (): Promise<string[]> => {
    const snap = await get(ref(database, 'lessons'));
    return snap.exists() ? Object.keys(snap.val()) : [];
  },

  getLessonsByTopic: async (subjectId: string): Promise<Record<string, Lesson[]>> => {
    const snap = await get(ref(database, `lessons/${subjectId}`));
    if (!snap.exists()) return {};
    const data = snap.val();
    const processed: Record<string, Lesson[]> = {};
    Object.keys(data).forEach(topic => {
      const lessons = data[topic];
      processed[topic] = Object.values(lessons);
    });
    return processed;
  },

  saveLesson: async (subjectId: string, topic: string, lessonId: string, data: Lesson): Promise<void> => {
    await set(ref(database, `lessons/${subjectId}/${topic}/${lessonId}`), data);
  },

  deleteLesson: async (subjectId: string, topic: string, lessonId: string): Promise<void> => {
    await remove(ref(database, `lessons/${subjectId}/${topic}/${lessonId}`));
  },

  getCompletedLessons: async (uid: string): Promise<string[]> => {
    const snap = await get(ref(database, `users/${uid}/completed_lessons`));
    return snap.exists() ? Object.keys(snap.val()) : [];
  },

  markLessonComplete: async (uid: string, lessonId: string): Promise<void> => {
    await set(ref(database, `users/${uid}/completed_lessons/${lessonId}`), true);
  },

  // --- QUESTION BANK ---
  getTopics: async (): Promise<Record<string, string[]>> => {
    const snap = await get(ref(database, 'topics'));
    if (!snap.exists()) return {};
    const data = snap.val();
    const processed: Record<string, string[]> = {};
    Object.keys(data).forEach(subId => {
        const topicsVal = data[subId];
        processed[subId] = Array.isArray(topicsVal) ? topicsVal : Object.keys(topicsVal);
    });
    return processed;
  },

  saveTopic: async (subjectId: string, topics: string[]): Promise<void> => {
    await set(ref(database, `topics/${subjectId}`), topics);
  },

  getAvailableSubtopics: async (category: string, subject: string, topic: string): Promise<string[]> => {
    const snap = await get(ref(database, `subtopics/${subject}/${topic}`));
    return snap.exists() ? Object.keys(snap.val()) : [];
  },

  getQuestions: async (category: string, subject: string, topic: string, subtopic?: string): Promise<Question[]> => {
    // Structure: questions/{category}/{subject}/{topic}/{subtopic}/{question_ID}/
    const basePath = `questions/${category}/${subject}/${topic}`;
    const path = subtopic ? `${basePath}/${subtopic}` : basePath;
    
    const snap = await get(ref(database, path));
    
    if (!snap.exists()) return [];
    
    const data = snap.val();
    
    // CASO 1: Subtópico Específico Selecionado
    // data = { q1: {...}, q2: {...} }
    if (subtopic) {
        // Garantimos que o ID está presente no objeto
        return Object.entries(data).map(([key, val]: [string, any]) => ({
            ...val,
            id: val.id || key 
        }));
    }

    // CASO 2: Apenas Tópico Selecionado (Buscar todos os subtópicos)
    // data = { SubTopicoA: { q1: ... }, SubTopicoB: { q2: ... } }
    let allQuestions: Question[] = [];
    
    Object.keys(data).forEach(subKey => {
        const subData = data[subKey];
        if (subData && typeof subData === 'object') {
            // Mapeia as questões dentro do subtópico, injetando o ID se necessário
            const questionsInSub = Object.entries(subData).map(([qid, qVal]: [string, any]) => ({
                ...qVal,
                id: qVal.id || qid,
                subtopic: subKey // Opcional: Adicionar contexto do subtópico
            }));
            allQuestions = [...allQuestions, ...questionsInSub];
        }
    });

    return allQuestions;
  },

  getQuestionsFromSubtopics: async (category: string, subject: string, topic: string, subtopics: string[]): Promise<Question[]> => {
    let allQuestions: Question[] = [];
    for (const sub of subtopics) {
      const q = await DatabaseService.getQuestions(category, subject, topic, sub);
      allQuestions = [...allQuestions, ...q];
    }
    return allQuestions;
  },

  saveQuestion: async (category: string, subject: string, topic: string, subtopic: string, qid: string, data: Question): Promise<void> => {
      await set(ref(database, `questions/${category}/${subject}/${topic}/${subtopic}/${qid}`), data);
      // Salva no flat index para simulados
      await set(ref(database, `questions_flat/${qid}`), data);
  },

  deleteQuestion: async (category: string, subject: string, topic: string, subtopic: string, qid: string): Promise<void> => {
      await remove(ref(database, `questions/${category}/${subject}/${topic}/${subtopic}/${qid}`));
      await remove(ref(database, `questions_flat/${qid}`));
  },

  markQuestionAsAnswered: async (uid: string, qid: string, correct: boolean, subjectId: string, topic: string): Promise<void> => {
    await update(ref(database, `users/${uid}/answered_questions/${qid}`), { correct });
    const statsPath = `user_stats/${uid}/${subjectId}/${topic}`;
    await update(ref(database, statsPath), {
      correct: increment(correct ? 1 : 0),
      wrong: increment(correct ? 0 : 1)
    });
  },

  getAnsweredQuestions: async (uid: string): Promise<Record<string, { correct: boolean }>> => {
    const snap = await get(ref(database, `users/${uid}/answered_questions`));
    return snap.exists() ? snap.val() : {};
  },

  // --- COMMUNITY ---
  getPosts: async (): Promise<CommunityPost[]> => {
    const snap = await get(query(ref(database, 'community_posts'), limitToLast(50)));
    if (!snap.exists()) return [];
    const posts = Object.entries(snap.val()).map(([id, p]: [string, any]) => ({ ...p, id }));
    return posts.sort((a, b) => b.timestamp - a.timestamp);
  },

  createPost: async (post: Partial<CommunityPost>, uid: string): Promise<void> => {
    // Sanitização para evitar erro de "undefined" no Firebase
    const sanitizedPost = {
        ...post,
        authorXp: post.authorXp || 0, // Garante que XP nunca é undefined
        likes: post.likes || 0
    };
    
    const newPostRef = push(ref(database, 'community_posts'));
    await set(newPostRef, sanitizedPost);
    await update(ref(database, `users/${uid}`), { lastPostedAt: Date.now() });
  },

  toggleLike: async (postId: string, uid: string): Promise<void> => {
    const postRef = ref(database, `community_posts/${postId}`);
    const snap = await get(postRef);
    if (!snap.exists()) return;
    const post = snap.val();
    const likedBy = post.likedBy || {};
    const isLiked = !!likedBy[uid];
    
    if (isLiked) {
      delete likedBy[uid];
      await update(postRef, { likes: Math.max(0, (post.likes || 0) - 1), likedBy });
    } else {
      likedBy[uid] = true;
      await update(postRef, { likes: (post.likes || 0) + 1, likedBy });
    }
  },

  replyPost: async (postId: string, reply: { author: string, content: string }): Promise<void> => {
    const repliesRef = push(ref(database, `community_posts/${postId}/replies`));
    await set(repliesRef, { ...reply, timestamp: Date.now() });
  },

  // --- SIMULATIONS ---
  getSimulations: async (): Promise<Simulation[]> => {
    const snap = await get(ref(database, 'simulations'));
    return snap.exists() ? Object.values(snap.val()) : [];
  },

  saveSimulation: async (id: string, data: Simulation): Promise<void> => {
    await set(ref(database, `simulations/${id}`), data);
  },

  deleteSimulation: async (id: string): Promise<void> => {
    await remove(ref(database, `simulations/${id}`));
  },

  getQuestionsByIds: async (ids: string[]): Promise<any[]> => {
    const snap = await get(ref(database, 'questions_flat'));
    if (!snap.exists()) return [];
    const all = snap.val();
    return ids.map(id => all[id]).filter(Boolean);
  },

  saveSimulationResult: async (result: SimulationResult): Promise<void> => {
    await push(ref(database, 'simulation_results'), result);
  },

  // --- ADMIN & FINANCE ---
  createUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
       await set(ref(database, `users/${uid}`), data);
       
       if (data.totalSpent && data.totalSpent > 0) {
           const transRef = push(ref(database, `user_transactions/${uid}`));
           await set(transRef, {
               id: transRef.key,
               userId: uid,
               userName: data.displayName,
               type: 'credit',
               amount: data.totalSpent,
               description: `Assinatura Inicial: ${data.plan}`,
               timestamp: Date.now()
           });
       }
  },

  getLeads: async (): Promise<Lead[]> => {
    const snap = await get(ref(database, 'leads'));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, l]: [string, any]) => ({ ...l, id }));
  },

  createLead: async (lead: Partial<Lead>): Promise<void> => {
    await push(ref(database, 'leads'), lead);
  },

  markLeadProcessed: async (leadId: string): Promise<void> => {
      await remove(ref(database, `leads/${leadId}`)); 
  },

  getRechargeRequests: async (): Promise<RechargeRequest[]> => {
    const snap = await get(ref(database, 'recharge_requests'));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, r]: [string, any]) => ({ ...r, id }));
  },

  createRechargeRequest: async (uid: string, name: string, amount: number, currency: 'BRL'|'CREDIT', qty?: number, label?: string): Promise<void> => {
    const req: Partial<RechargeRequest> = {
      userId: uid,
      userDisplayName: name,
      amount,
      currencyType: currency,
      quantityCredits: qty,
      status: 'pending',
      timestamp: Date.now(),
      planLabel: label
    };
    await push(ref(database, 'recharge_requests'), req);
  },

  processRecharge: async (id: string, status: 'approved' | 'rejected'): Promise<void> => {
    const reqRef = ref(database, `recharge_requests/${id}`);
    const snap = await get(reqRef);
    if (!snap.exists()) return;
    const req = snap.val() as RechargeRequest;
    
    if (status === 'approved') {
      const userRef = ref(database, `users/${req.userId}`);
      if (req.currencyType === 'BRL') {
        await update(userRef, { balance: increment(req.amount) });
      } else if (req.currencyType === 'CREDIT') {
        await update(userRef, { essayCredits: increment(req.quantityCredits || 0) });
      }
      
      await update(userRef, { totalSpent: increment(req.amount) });

      const transRef = push(ref(database, `user_transactions/${req.userId}`));
      await set(transRef, {
        id: transRef.key,
        userId: req.userId,
        userName: req.userDisplayName,
        type: 'credit',
        amount: req.amount,
        description: req.planLabel || 'Recarga de Saldo',
        timestamp: Date.now()
      });
    }
    await update(reqRef, { status });
  },

  getUserTransactions: async (uid: string): Promise<Transaction[]> => {
    const snap = await get(ref(database, `user_transactions/${uid}`));
    if (!snap.exists()) return [];
    return Object.values(snap.val()) as Transaction[];
  },

  getAllGlobalTransactions: async (): Promise<Transaction[]> => {
      const snap = await get(ref(database, 'user_transactions'));
      if (!snap.exists()) return [];
      const all: Transaction[] = [];
      const data = snap.val();
      Object.keys(data).forEach(uid => {
          Object.values(data[uid]).forEach((t: any) => all.push(t));
      });
      return all.sort((a,b) => b.timestamp - a.timestamp);
  },

  // --- OPERATIONAL COSTS ---
  saveOperationalCost: async (cost: Omit<OperationalCost, 'id' | 'timestamp'>): Promise<void> => {
      const costsRef = ref(database, 'operational_costs');
      const newCostRef = push(costsRef);
      await set(newCostRef, {
          ...cost,
          id: newCostRef.key,
          timestamp: Date.now()
      });
  },

  getOperationalCosts: async (): Promise<OperationalCost[]> => {
      const snap = await get(ref(database, 'operational_costs'));
      if (!snap.exists()) return [];
      return Object.values(snap.val()) as OperationalCost[];
  },

  deleteOperationalCost: async (id: string): Promise<void> => {
      await remove(ref(database, `operational_costs/${id}`));
  },

  // --- ESSAY CORRECTIONS ---
  getEssayCorrections: async (uid: string): Promise<EssayCorrection[]> => {
    const snap = await get(ref(database, `essay_corrections/${uid}`));
    if (!snap.exists()) return [];
    return Object.values(snap.val()) as EssayCorrection[];
  },

  saveEssayCorrection: async (uid: string, result: EssayCorrection): Promise<void> => {
    await push(ref(database, `essay_corrections/${uid}`), result);
  },

  // --- TRAFFIC & LP ---
  getTrafficSettings: async (): Promise<TrafficConfig> => {
    const snap = await get(ref(database, 'traffic_config'));
    return snap.exists() ? snap.val() : { vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' };
  },

  // --- SUPPORT ---
  getSupportTicket: async (uid: string): Promise<SupportTicket | null> => {
    const snap = await get(ref(database, `support_tickets/${uid}`));
    return snap.exists() ? snap.val() as SupportTicket : null;
  },

  createSupportTicket: async (uid: string, name: string, email: string, issue: string): Promise<void> => {
    const ticket: SupportTicket = {
      id: uid,
      userId: uid,
      userName: name,
      userEmail: email,
      issueDescription: issue,
      status: 'open',
      messages: [{ role: 'user', content: issue, timestamp: Date.now() }],
      lastUpdated: Date.now()
    };
    await set(ref(database, `support_tickets/${uid}`), ticket);
  },

  replySupportTicket: async (uid: string, content: string, role: 'user' | 'admin'): Promise<void> => {
    const ticketRef = ref(database, `support_tickets/${uid}`);
    const snap = await get(ticketRef);
    if (!snap.exists()) return;
    const ticket = snap.val() as SupportTicket;
    ticket.messages.push({ role, content, timestamp: Date.now() });
    ticket.status = role === 'admin' ? 'answered' : 'open';
    ticket.lastUpdated = Date.now();
    await set(ticketRef, ticket);
    if (role === 'admin') {
      await update(ref(database, `users/${uid}`), { hasSupportNotification: true });
    }
  },

  clearSupportNotification: async (uid: string): Promise<void> => {
    await update(ref(database, `users/${uid}`), { hasSupportNotification: false });
  },

  resolveSupportTicket: async (uid: string): Promise<void> => {
    await remove(ref(database, `support_tickets/${uid}`));
  }
};
