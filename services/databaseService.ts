
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
  UserStatsMap,
  EssayPlanType
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
      const today = new Date().toISOString().split('T')[0];
      let needsUpdate = false;
      const updates: any = {};

      if (data.lastStudyDate !== today) {
          data.dailyStudyMinutes = 0;
          data.lastStudyDate = today;
          updates.dailyStudyMinutes = 0;
          updates.lastStudyDate = today;
          needsUpdate = true;
      }

      // Ensure daily counters exist to prevent UI bugs
      if (typeof data.dailyStudyMinutes === 'undefined') {
          data.dailyStudyMinutes = 0;
          updates.dailyStudyMinutes = 0;
          needsUpdate = true;
      }
      if (typeof data.hoursStudied === 'undefined') {
          data.hoursStudied = 0;
          updates.hoursStudied = 0;
          needsUpdate = true;
      }

      if (needsUpdate) {
          await update(ref(database, `users/${uid}`), updates);
      }

      return data;
    }
    const today = new Date().toISOString().split('T')[0];
    const newUser = { 
        ...defaultData, 
        uid, 
        balance: 0, 
        xp: 0,
        dailyStudyMinutes: 0,
        hoursStudied: 0,
        lastStudyDate: today
    };
    await set(ref(database, `users/${uid}`), newUser);
    return newUser as UserProfile;
  },

  async saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    if (!uid) {
        console.error("Tentativa de salvar usuário sem UID:", data);
        throw new Error("UID inválido");
    }
    await update(ref(database, `users/${uid}`), data);
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const snap = await get(ref(database, 'users'));
    if (!snap.exists()) return [];
    
    // CORREÇÃO BUG ADMIN UNDEFINED:
    // Mapeia as chaves (UIDs) para dentro do objeto de usuário.
    // Isso previne que usuários criados sem a propriedade 'uid' explícita causem problemas no Admin.
    const usersObj = snap.val();
    return Object.keys(usersObj).map(key => ({
        ...usersObj[key],
        uid: key 
    }));
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
        
        // --- EVENTO DE NOTIFICAÇÃO (GLOBAL) ---
        // Dispara um evento para que o App.tsx exiba o alerta animado
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('xp-gained', { detail: { amount, type: actionType } });
            window.dispatchEvent(event);
        }

    } catch (e) {
        console.error("Failed to process XP action:", e);
    }
  },

  async trackStudyTime(uid: string, minutes: number): Promise<void> {
    if (!uid || minutes <= 0) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        const snap = await get(ref(database, `users/${uid}`));
        if (snap.exists()) {
            const data = snap.val();
            const updates: any = {
                hoursStudied: increment(minutes / 60)
            };
            if (data.lastStudyDate !== today) {
                updates.dailyStudyMinutes = minutes;
                updates.lastStudyDate = today;
            } else {
                updates.dailyStudyMinutes = increment(minutes);
            }
            await update(ref(database, `users/${uid}`), updates);
        }
    } catch (e) {
        console.error("Failed to track time:", e);
    }
  },

  async getLeaderboard(period: 'weekly' | 'total'): Promise<UserProfile[]> {
    try {
        const field = period === 'weekly' ? 'weeklyXp' : 'xp';
        const q = query(ref(database, 'users'), orderByChild(field), limitToLast(50));
        
        const snap = await get(q);
        if (!snap.exists()) return [];
        
        const users: UserProfile[] = [];
        snap.forEach(child => { 
            const u = child.val();
            if (typeof u[field] === 'undefined') u[field] = 0;
            // Ensure UID logic here too
            users.push({ ...u, uid: child.key }); 
        });

        return users.sort((a, b) => (b[field] || 0) - (a[field] || 0));
    } catch (e) {
        console.error("Leaderboard error:", e);
        return [];
    }
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
    const dbCategory = category === 'military' ? 'militar' : category;
    const basePath = `questions/${dbCategory}/${subject}/${topic}`;

    if (subtopic) {
        const snap = await get(ref(database, `${basePath}/${subtopic}`));
        if (!snap.exists()) return [];
        return Object.values(snap.val());
    } else {
        const snap = await get(ref(database, basePath));
        if (!snap.exists()) return [];
        
        const subtopicsObj = snap.val();
        let allQuestions: Question[] = [];
        
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
      const findQuestionDeep = async (currentPath: string, targetId: string): Promise<Question | null> => {
          const snap = await get(ref(database, currentPath));
          if (!snap.exists()) return null;
          
          const val = snap.val();
          
          if (val.id === targetId) return val as Question;
          
          if (typeof val === 'object') {
              if (val[targetId]) return val[targetId] as Question;

              const keys = Object.keys(val);
              for (const key of keys) {
                  if (typeof val[key] !== 'object') continue;
                  if (val[key].id === targetId) return val[key] as Question;
                  if (!val[key].text) {
                      const found = await findQuestionDeep(`${currentPath}/${key}`, targetId);
                      if (found) return found;
                  }
              }
          }
          return null;
      };
      
      const promises = ids.map(async (id) => {
          let q = await findQuestionDeep('questions/regular', id);
          if (q) return q;
          q = await findQuestionDeep('questions/militar', id);
          return q;
      });

      const results = await Promise.all(promises);
      return results.filter(q => q !== null) as Question[];
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
      const dbCategory = category === 'military' ? 'militar' : category;
      await set(ref(database, `questions/${dbCategory}/${subjectId}/${topic}/${subtopic}/${id}`), data);
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

  async getUserSimulationResults(uid: string): Promise<SimulationResult[]> {
      const q = query(ref(database, 'simulation_results'), orderByChild('userId'), equalTo(uid));
      const snap = await get(q);
      if (!snap.exists()) return [];
      const results: SimulationResult[] = Object.values(snap.val());
      return results.sort((a,b) => b.timestamp - a.timestamp);
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

  async deleteLead(leadId: string): Promise<void> {
      await remove(ref(database, `leads/${leadId}`));
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
      if (status === 'approved') {
          const snap = await get(ref(database, `recharge_requests/${reqId}`));
          if (snap.exists()) {
              const req = snap.val() as RechargeRequest;
              const userId = req.userId;
              
              const updates: any = {
                  totalSpent: increment(req.amount)
              };

              // --- ESSAY PLAN LOGIC ---
              if (req.planLabel?.includes('Redação')) {
                  const label = req.planLabel.toLowerCase();
                  let planType: EssayPlanType = 'basic';
                  let creditsToAdd = 0;
                  let daysToAdd = 0;

                  if (label.includes('médio') || label.includes('medio')) planType = 'medium';
                  else if (label.includes('avançado') || label.includes('advanced')) planType = 'advanced';
                  
                  const creditsPerWeek = planType === 'basic' ? 1 : planType === 'medium' ? 2 : 4;
                  
                  if (label.includes('semanal')) {
                      daysToAdd = 7;
                      creditsToAdd = creditsPerWeek * 1; 
                  } else if (label.includes('mensal')) {
                      daysToAdd = 30;
                      creditsToAdd = creditsPerWeek * 4;
                  } else if (label.includes('anual')) {
                      daysToAdd = 365;
                      creditsToAdd = creditsPerWeek * 52;
                  }

                  const userSnap = await get(ref(database, `users/${userId}`));
                  const user = userSnap.val() as UserProfile;
                  const now = Date.now();
                  let currentExpiry = user.essayPlanExpiry ? new Date(user.essayPlanExpiry).getTime() : now;
                  if (currentExpiry < now) currentExpiry = now;
                  
                  const newExpiry = new Date(currentExpiry + (daysToAdd * 24 * 60 * 60 * 1000)).toISOString();

                  updates.essayPlanType = planType;
                  updates.essayPlanExpiry = newExpiry;
                  updates.essayCredits = increment(creditsToAdd);
              } 
              // --- GENERIC CREDITS / BALANCE / OTHER UPGRADES ---
              else {
                  if (req.currencyType === 'CREDIT' && req.quantityCredits) {
                      updates.essayCredits = increment(req.quantityCredits);
                  } 
                  else if (req.currencyType === 'BRL') {
                      if (req.planLabel?.includes('UPGRADE')) {
                          updates.plan = 'advanced';
                      }

                      if (req.planLabel?.includes('IA Ilimitada')) {
                          const userSnap = await get(ref(database, `users/${userId}`));
                          const user = userSnap.val() as UserProfile;
                          const now = Date.now();
                          
                          let currentExpiryTime = user?.aiUnlimitedExpiry ? new Date(user.aiUnlimitedExpiry).getTime() : now;
                          if (currentExpiryTime < now) currentExpiryTime = now;

                          let daysToAdd = 0;
                          if (req.planLabel.includes('Semanal')) daysToAdd = 7;
                          else if (req.planLabel.includes('Mensal')) daysToAdd = 30;
                          else if (req.planLabel.includes('Anual')) daysToAdd = 365;

                          if (daysToAdd > 0) {
                              const newExpiry = new Date(currentExpiryTime + (daysToAdd * 24 * 60 * 60 * 1000)).toISOString();
                              updates.aiUnlimitedExpiry = newExpiry;
                          }
                      }
                  }
              }

              await update(ref(database, `users/${userId}`), updates);

              const tRef = push(ref(database, `user_transactions/${userId}`));
              await set(tRef, {
                  id: tRef.key,
                  userId: userId,
                  type: 'credit',
                  amount: req.amount,
                  description: req.planLabel || 'Recarga Aprovada',
                  timestamp: Date.now()
              });
          }
      }

      await remove(ref(database, `recharge_requests/${reqId}`));
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
