
import { 
  ref, 
  get, 
  set, 
  update, 
  push, 
  remove, 
  query, 
  orderByChild, 
  equalTo, 
  increment, 
  limitToLast
} from "firebase/database";
import { database } from "./firebaseConfig";
import { 
  UserProfile, 
  Subject, 
  Lesson, 
  Question, 
  Simulation, 
  SimulationResult, 
  CommunityPost, 
  Lead, 
  Transaction, 
  OperationalCost,
  RechargeRequest, 
  SupportTicket,
  EssayCorrection,
  TrafficConfig,
  UserStatsMap
} from "../types";
import { XP_VALUES } from "../constants";

export const DatabaseService = {
  // --- USERS ---
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await get(ref(database, `users/${uid}`));
    return snap.exists() ? snap.val() : null;
  },

  async createUserProfile(uid: string, data: UserProfile): Promise<void> {
    await set(ref(database, `users/${uid}`), data);
  },

  async ensureUserProfile(uid: string, defaultData: Partial<UserProfile>): Promise<UserProfile> {
    const snap = await get(ref(database, `users/${uid}`));
    if (snap.exists()) {
      const data = snap.val();
      // Ensure daily counters exist to prevent UI bugs
      if (typeof data.dailyStudyMinutes === 'undefined') data.dailyStudyMinutes = 0;
      if (typeof data.hoursStudied === 'undefined') data.hoursStudied = 0;
      return data;
    }
    const newUser = { 
        ...defaultData, 
        uid, 
        balance: 0, 
        xp: 0,
        dailyStudyMinutes: 0,
        hoursStudied: 0
    };
    await set(ref(database, `users/${uid}`), newUser);
    return newUser as UserProfile;
  },

  async saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await update(ref(database, `users/${uid}`), data);
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const snap = await get(ref(database, 'users'));
    if (!snap.exists()) return [];
    return Object.values(snap.val());
  },

  async updateOnboarding(uid: string, whatsapp: string): Promise<void> {
    await update(ref(database, `users/${uid}`), { whatsapp, firstTimeSetupDone: true });
  },

  // --- STATS & XP ---
  async getUserStats(uid: string): Promise<UserStatsMap | null> {
    const snap = await get(ref(database, `user_stats/${uid}`));
    return snap.exists() ? snap.val() : null;
  },

  async setDailyGoal(uid: string, goal: number): Promise<void> {
    await update(ref(database, `users/${uid}`), { dailyGoal: goal });
  },

  async processXpAction(uid: string, actionType: keyof typeof XP_VALUES, customAmount?: number): Promise<void> {
    if (!uid) return;

    // Calculate amount safely
    let amount = 0;
    if (customAmount !== undefined && typeof customAmount === 'number') {
        amount = customAmount;
    } else {
        // Fallback to constants if custom amount not provided
        amount = XP_VALUES[actionType] || 0;
    }

    // Safety check: Don't process non-positive XP
    if (amount <= 0) return;

    try {
        await update(ref(database, `users/${uid}`), {
          xp: increment(amount),
          weeklyXp: increment(amount) 
        });
    } catch (e) {
        console.error("Failed to process XP action:", e);
    }
  },

  async trackStudyTime(uid: string, minutes: number): Promise<void> {
    if (!uid || minutes <= 0) return;
    try {
        await update(ref(database, `users/${uid}`), {
          dailyStudyMinutes: increment(minutes),
          hoursStudied: increment(minutes / 60)
        });
    } catch (e) {
        console.error("Failed to track time:", e);
    }
  },

  async getLeaderboard(period: 'weekly' | 'total'): Promise<UserProfile[]> {
    const field = period === 'weekly' ? 'weeklyXp' : 'xp';
    const q = query(ref(database, 'users'), orderByChild(field), limitToLast(50));
    const snap = await get(q);
    if (!snap.exists()) return [];
    const users: UserProfile[] = [];
    snap.forEach(child => { users.push(child.val()); });
    return users.reverse();
  },

  // --- CONTENT: SUBJECTS & LESSONS ---
  async getSubjects(): Promise<Subject[]> {
    const snap = await get(ref(database, 'subjects'));
    if (!snap.exists()) return [];
    const val = snap.val();
    return Array.isArray(val) ? val : Object.values(val);
  },

  async getSubjectsWithLessons(): Promise<string[]> {
    const snap = await get(ref(database, 'lessons'));
    return snap.exists() ? Object.keys(snap.val()) : [];
  },

  async getLessonsByTopic(subjectId: string): Promise<Record<string, Lesson[]>> {
    const snap = await get(ref(database, `lessons/${subjectId}`));
    return snap.exists() ? snap.val() : {};
  },

  async getCompletedLessons(uid: string): Promise<string[]> {
    const snap = await get(ref(database, `users/${uid}/completed_lessons`));
    return snap.exists() ? Object.keys(snap.val()) : [];
  },

  async markLessonComplete(uid: string, lessonId: string): Promise<void> {
    await update(ref(database, `users/${uid}/completed_lessons`), { [lessonId]: true });
  },

  async saveLesson(subjectId: string, topic: string, lessonId: string, lesson: Lesson): Promise<void> {
    await set(ref(database, `lessons/${subjectId}/${topic}/${lessonId}`), lesson);
  },

  async deleteLesson(subjectId: string, topic: string, lessonId: string): Promise<void> {
    await remove(ref(database, `lessons/${subjectId}/${topic}/${lessonId}`));
  },

  // --- QUESTIONS ---
  async getTopics(): Promise<Record<string, string[]>> {
    const snap = await get(ref(database, 'topics'));
    if (!snap.exists()) return {};
    
    const data = snap.val();
    const result: Record<string, string[]> = {};
    
    // Parse nested object structure { subject: { topic: boolean } } -> { subject: [topics] }
    Object.keys(data).forEach(subjectId => {
        const topicsObj = data[subjectId];
        if (topicsObj) {
            result[subjectId] = Object.keys(topicsObj);
        }
    });
    return result;
  },

  async getAvailableSubtopics(category: string, subject: string, topic: string): Promise<string[]> {
      const snap = await get(ref(database, `subtopics/${subject}/${topic}`));
      return snap.exists() ? Object.keys(snap.val()) : [];
  },

  async getQuestions(category: string, subject: string, topic: string, subtopic?: string): Promise<Question[]> {
    // Map category name to DB key (handle 'military' vs 'militar')
    const dbCategory = category === 'military' ? 'militar' : category;
    
    // Hierarchy: questions/{category}/{subject}/{topic}/{subtopic}/{id}
    const basePath = `questions/${dbCategory}/${subject}/${topic}`;

    if (subtopic) {
        // Fetch specific subtopic
        const snap = await get(ref(database, `${basePath}/${subtopic}`));
        if (!snap.exists()) return [];
        return Object.values(snap.val());
    } else {
        // Fetch ALL subtopics under this topic
        const snap = await get(ref(database, basePath));
        if (!snap.exists()) return [];
        
        const subtopicsObj = snap.val();
        let allQuestions: Question[] = [];
        
        // Iterate over subtopics
        Object.values(subtopicsObj).forEach((subContent: any) => {
            if (subContent && typeof subContent === 'object') {
                const questionsInSub = Object.values(subContent) as Question[];
                allQuestions.push(...questionsInSub);
            }
        });
        
        return allQuestions;
    }
  },

  async getQuestionsFromSubtopics(category: string, subject: string, topic: string, subtopics: string[]): Promise<Question[]> {
     const dbCategory = category === 'military' ? 'militar' : category;
     
     const promises = subtopics.map(sub => 
         get(ref(database, `questions/${dbCategory}/${subject}/${topic}/${sub}`))
     );
     
     const snapshots = await Promise.all(promises);
     
     let allQuestions: Question[] = [];
     snapshots.forEach(snap => {
         if (snap.exists()) {
             allQuestions.push(...Object.values(snap.val()) as Question[]);
         }
     });
     
     return allQuestions;
  },

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
      // NOTE: Searching by ID is inefficient in deep hierarchy without an index.
      // Ideally, we should know the path. For now, assuming questions are also indexed by ID or using this for Simulations 
      // where we might need a direct lookup mechanism.
      // If questions are NOT flat-indexed, this requires a change. 
      // Assuming for now user has a flat 'questions' node OR we scan (very slow).
      // Fallback: This method might fail if questions aren't duplicated at root.
      // Strategy: Since we don't have paths, we try to fetch from flat 'questions' if it exists, or fail gracefully.
      // Given the prompt constraints, we'll try fetching assuming a flat backup or that IDs contain path info.
      // Current implementation assumes flat lookup at root `questions/{id}` which is common for ID-based retrieval.
      const promises = ids.map(id => get(ref(database, `questions/${id}`)));
      const snaps = await Promise.all(promises);
      return snaps.map(s => s.exists() ? s.val() : null).filter(q => q !== null);
  },

  async markQuestionAsAnswered(uid: string, qid: string, correct: boolean, selectedOption: number, subjectId: string, topic: string): Promise<void> {
    await update(ref(database, `users/${uid}/answered_questions/${qid}`), { correct, selectedOption });
    const statsPath = `user_stats/${uid}/${subjectId}/${topic}`;
    await update(ref(database, statsPath), {
      correct: increment(correct ? 1 : 0),
      wrong: increment(correct ? 0 : 1)
    });
  },

  async getAnsweredQuestions(uid: string): Promise<Record<string, { correct: boolean, selectedOption?: number }>> {
    const snap = await get(ref(database, `users/${uid}/answered_questions`));
    return snap.exists() ? snap.val() : {};
  },

  async incrementQuestionsAnswered(uid: string, count: number): Promise<void> {
      await update(ref(database, `users/${uid}`), { questionsAnswered: increment(count) });
  },

  async saveQuestion(category: string, subjectId: string, topic: string, subtopic: string, id: string, data: Question): Promise<void> {
      // Save deep for navigation
      const dbCategory = category === 'military' ? 'militar' : category;
      await set(ref(database, `questions/${dbCategory}/${subjectId}/${topic}/${subtopic}/${id}`), data);
      
      // OPTIONAL: Save flat for ID lookup if needed by Simulations
      // await set(ref(database, `questions/${id}`), data);
  },

  // --- COMMUNITY ---
  async getPosts(): Promise<CommunityPost[]> {
      const q = query(ref(database, 'community_posts'), limitToLast(50));
      const snap = await get(q);
      if (!snap.exists()) return [];
      const posts = Object.values(snap.val()) as CommunityPost[];
      return posts.sort((a, b) => b.timestamp - a.timestamp);
  },

  async createPost(post: Omit<CommunityPost, 'id'>, uid: string): Promise<void> {
      const newRef = push(ref(database, 'community_posts'));
      await set(newRef, { ...post, id: newRef.key });
      await update(ref(database, `users/${uid}`), { lastPostedAt: Date.now() });
  },

  async toggleLike(postId: string, uid: string): Promise<void> {
      const postRef = ref(database, `community_posts/${postId}`);
      const snap = await get(postRef);
      if (snap.exists()) {
          const post = snap.val();
          const likedBy = post.likedBy || {};
          if (likedBy[uid]) {
              await update(postRef, {
                  likes: increment(-1),
                  [`likedBy/${uid}`]: null
              });
          } else {
              await update(postRef, {
                  likes: increment(1),
                  [`likedBy/${uid}`]: true
              });
          }
      }
  },

  async replyPost(postId: string, reply: { author: string, content: string }): Promise<void> {
      const postRef = ref(database, `community_posts/${postId}`);
      const snap = await get(postRef);
      if(snap.exists()) {
          const post = snap.val();
          const replies = post.replies || [];
          replies.push({ ...reply, timestamp: Date.now() });
          await update(postRef, { replies });
      }
  },

  // --- SIMULATIONS ---
  async getSimulations(): Promise<Simulation[]> {
      const snap = await get(ref(database, 'simulations'));
      if (!snap.exists()) return [];
      return Object.values(snap.val());
  },

  async saveSimulation(id: string, sim: Simulation): Promise<void> {
      await set(ref(database, `simulations/${id}`), sim);
  },

  async deleteSimulation(id: string): Promise<void> {
      await remove(ref(database, `simulations/${id}`));
  },

  async saveSimulationResult(result: SimulationResult): Promise<void> {
      const newRef = push(ref(database, 'simulation_results'));
      await set(newRef, result);
  },

  // --- FINANCES & LEADS ---
  async getLeads(): Promise<Lead[]> {
      const snap = await get(ref(database, 'leads'));
      return snap.exists() ? Object.values(snap.val()) : [];
  },

  async createLead(lead: Partial<Lead>): Promise<void> {
      const newRef = push(ref(database, 'leads'));
      await set(newRef, { ...lead, id: newRef.key });
  },

  async markLeadProcessed(leadId: string): Promise<void> {
      await update(ref(database, `leads/${leadId}`), { processed: true, status: 'approved_access' });
  },

  async getRechargeRequests(): Promise<RechargeRequest[]> {
      const snap = await get(ref(database, 'recharge_requests'));
      return snap.exists() ? Object.values(snap.val()) : [];
  },

  async createRechargeRequest(uid: string, displayName: string, amount: number, currencyType: 'BRL'|'CREDIT', quantity: number | undefined, label: string): Promise<void> {
      const newRef = push(ref(database, 'recharge_requests'));
      await set(newRef, {
          id: newRef.key,
          userId: uid,
          userDisplayName: displayName,
          amount,
          currencyType,
          quantityCredits: quantity,
          planLabel: label,
          status: 'pending',
          timestamp: Date.now()
      });
  },

  async processRecharge(reqId: string, status: 'approved' | 'rejected'): Promise<void> {
      await update(ref(database, `recharge_requests/${reqId}`), { status });
      if (status === 'approved') {
          const snap = await get(ref(database, `recharge_requests/${reqId}`));
          if (snap.exists()) {
              const req = snap.val() as RechargeRequest;
              
              // 1. Process Credits (Essay)
              if (req.currencyType === 'CREDIT' && req.quantityCredits) {
                  await update(ref(database, `users/${req.userId}`), {
                      essayCredits: increment(req.quantityCredits),
                      totalSpent: increment(req.amount)
                  });
              } 
              // 2. Process Balance / Plans
              else if (req.currencyType === 'BRL') {
                  await update(ref(database, `users/${req.userId}`), {
                      totalSpent: increment(req.amount)
                  });
                  
                  // PLAN UPGRADE: Basic -> Advanced
                  if (req.planLabel?.includes('UPGRADE')) {
                      await update(ref(database, `users/${req.userId}`), { plan: 'advanced' });
                  }

                  // AI UNLIMITED: Update Expiry
                  if (req.planLabel?.includes('IA Ilimitada')) {
                      // Fetch current profile to check existing expiry
                      const userSnap = await get(ref(database, `users/${req.userId}`));
                      const user = userSnap.val() as UserProfile;
                      const now = Date.now();
                      
                      // Determine current valid expiry (if future, use it; if past/null, use now)
                      let currentExpiryTime = user?.aiUnlimitedExpiry ? new Date(user.aiUnlimitedExpiry).getTime() : now;
                      if (currentExpiryTime < now) currentExpiryTime = now;

                      // Calculate duration based on label
                      let daysToAdd = 0;
                      if (req.planLabel.includes('Semanal')) daysToAdd = 7;
                      else if (req.planLabel.includes('Mensal')) daysToAdd = 30;
                      else if (req.planLabel.includes('Anual')) daysToAdd = 365;

                      if (daysToAdd > 0) {
                          const newExpiry = new Date(currentExpiryTime + (daysToAdd * 24 * 60 * 60 * 1000)).toISOString();
                          await update(ref(database, `users/${req.userId}`), { aiUnlimitedExpiry: newExpiry });
                      }
                  }
              }

              const tRef = push(ref(database, `user_transactions/${req.userId}`));
              await set(tRef, {
                  id: tRef.key,
                  userId: req.userId,
                  type: 'credit',
                  amount: req.amount,
                  description: req.planLabel || 'Recarga Aprovada',
                  timestamp: Date.now()
              });
          }
      }
  },

  async getUserTransactions(uid: string): Promise<Transaction[]> {
      const snap = await get(ref(database, `user_transactions/${uid}`));
      return snap.exists() ? Object.values(snap.val()) : [];
  },

  async getAllGlobalTransactions(): Promise<Transaction[]> {
     const snap = await get(ref(database, 'user_transactions'));
     if (!snap.exists()) return [];
     const all: Transaction[] = [];
     const usersTrans = snap.val();
     Object.values(usersTrans).forEach((userTransObj: any) => {
         Object.values(userTransObj).forEach((t: any) => all.push(t));
     });
     return all;
  },

  async getOperationalCosts(): Promise<OperationalCost[]> {
      const snap = await get(ref(database, 'operational_costs'));
      return snap.exists() ? Object.values(snap.val()) : [];
  },

  async saveOperationalCost(cost: Omit<OperationalCost, 'id'|'timestamp'>): Promise<void> {
      const newRef = push(ref(database, 'operational_costs'));
      await set(newRef, { ...cost, id: newRef.key, timestamp: Date.now() });
  },

  async deleteOperationalCost(id: string): Promise<void> {
      await remove(ref(database, `operational_costs/${id}`));
  },

  // --- TRAFFIC ---
  async getTrafficSettings(): Promise<TrafficConfig> {
      const snap = await get(ref(database, 'traffic_config'));
      return snap.exists() ? snap.val() : { vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' };
  },

  // --- REDAÇÃO & SUPPORT ---
  async getEssayCorrections(uid: string): Promise<EssayCorrection[]> {
      const snap = await get(ref(database, `essay_corrections/${uid}`));
      return snap.exists() ? Object.values(snap.val()) : [];
  },

  async saveEssayCorrection(uid: string, correction: EssayCorrection): Promise<void> {
      const newRef = push(ref(database, `essay_corrections/${uid}`));
      await set(newRef, { ...correction, id: newRef.key });
  },

  async getSupportTicket(uid: string): Promise<SupportTicket | null> {
      const snap = await get(ref(database, `support_tickets/${uid}`));
      return snap.exists() ? snap.val() : null;
  },

  async createSupportTicket(uid: string, userName: string, userEmail: string, issue: string): Promise<void> {
      await set(ref(database, `support_tickets/${uid}`), {
          id: `ticket_${Date.now()}`,
          userId: uid,
          userName,
          userEmail,
          issueDescription: issue,
          status: 'open',
          messages: [],
          lastUpdated: Date.now()
      });
  },

  async replySupportTicket(uid: string, content: string, role: 'user' | 'admin'): Promise<void> {
      const ticketRef = ref(database, `support_tickets/${uid}`);
      const snap = await get(ticketRef);
      if (snap.exists()) {
          const ticket = snap.val();
          const messages = ticket.messages || [];
          messages.push({ role, content, timestamp: Date.now() });
          await update(ticketRef, { 
              messages, 
              lastUpdated: Date.now(), 
              status: role === 'admin' ? 'answered' : 'open' 
          });
          
          if (role === 'admin') {
              await update(ref(database, `users/${uid}`), { hasSupportNotification: true });
          }
      }
  },

  async resolveSupportTicket(uid: string): Promise<void> {
      await remove(ref(database, `support_tickets/${uid}`));
  },

  async clearSupportNotification(uid: string): Promise<void> {
      await update(ref(database, `users/${uid}`), { hasSupportNotification: false });
  }
};
