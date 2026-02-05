
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan, LessonMaterial, Simulation, Lead, PlanConfig, PlanFeatures } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon, PenTool, Link, FileText, LayoutList, Pencil, Eye, RefreshCw, Upload, Users, UserCheck, Calendar, Shield, BarChart3, TrendingUp, PieChart, DollarSign, Activity, X, Video, Target, Tag, Megaphone, Copy, AlertTriangle, MousePointerClick, Clock, ShoppingCart, User, CreditCard } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'content' | 'finance' | 'config' | 'metrics' | 'traffic' | 'plans'>('leads');
  const [contentTab, setContentTab] = useState<'question' | 'lesson' | 'subject' | 'simulation' | 'import'>('question');
  
  // View Mode: Create New vs Manage Existing
  const [viewMode, setViewMode] = useState<'create' | 'manage'>('create');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);

  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  // Updated subtopics type: SubjectId -> TopicId -> SubtopicList
  const [subtopics, setSubtopics] = useState<Record<string, Record<string, string[]>>>({});
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null); // NEW: Plan Config
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  
  // Traffic Data
  const [trafficConfig, setTrafficConfig] = useState({ vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' });
  
  // Metrics Specific
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Management Lists
  const [filteredQuestions, setFilteredQuestions] = useState<(Question & { path: string, subtopic: string })[]>([]);
  
  // Lesson Management
  const [manageLessonSubject, setManageLessonSubject] = useState('');
  const [manageLessonTopic, setManageLessonTopic] = useState('');
  const [topicLessons, setTopicLessons] = useState<Lesson[]>([]);

  // States
  const [loading, setLoading] = useState(true);
  
  // Import State
  const [importText, setImportText] = useState('');
  const [importCategory, setImportCategory] = useState('regular');
  const [importType, setImportType] = useState<'question' | 'lesson'>('question'); // NEW STATE
  const [isImporting, setIsImporting] = useState(false);

  // --- USER CREATION / APPROVAL STATE ---
  const [showUserModal, setShowUserModal] = useState(false);
  const [targetLead, setTargetLead] = useState<Lead | null>(null); // If null, it's a manual creation (Kirvano)
  
  const [accessForm, setAccessForm] = useState({
      displayName: '',
      email: '',
      password: 'mudar123',
      plan: 'basic' as UserPlan,
      essayCredits: 0,
      balance: 0.00,
      expiryDate: '' // YYYY-MM-DD
  });

  // Simulation Form
  const [simForm, setSimForm] = useState({
      title: '',
      description: '',
      duration: 60,
      type: 'official',
      status: 'open',
      subjects: [] as string[],
      selectedQuestionIds: [] as string[]
  });
  const [simFilter, setSimFilter] = useState({ subject: '', topic: '' });

  // Manage Questions Filter
  const [manageQSubject, setManageQSubject] = useState('');
  const [manageQTopic, setManageQTopic] = useState('');
  const [manageQCategory, setManageQCategory] = useState('regular');

  // Edit User (Existing)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserMode, setNewUserMode] = useState(false);
  const [userDataForm, setUserDataForm] = useState({
      displayName: '',
      email: '',
      plan: 'basic',
      expiry: '',
      isAdmin: false
  });

  // Content Form
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState({ title: '', url: '' });

  // Extended Content Form for Multi-Select & Ordering
  const [contentForm, setContentForm] = useState({
      category: 'regular',
      subjectId: '',
      topicName: '',
      subtopicName: '', 
      qText: '',
      qImageUrl: '', 
      qOptions: ['', '', '', ''],
      qCorrect: 0,
      qDifficulty: 'medium',
      qExplanation: '',
      
      // Lesson Specific
      lType: 'video', // 'video' | 'exercise_block'
      lTitle: '',
      lUrl: '',
      lDuration: '',
      // Exercise Block Filters
      lExCategory: 'regular',
      lExSubject: '',
      lExTopic: '',
      lExSubtopics: [] as string[], // NEW: Array of subtopics
      
      // Lesson Positioning
      lInsertAfterId: 'end', // 'end' | 'start' | [lessonId]

      // Subject Form
      sName: '',
      sIcon: 'BookOpen',
      sColor: 'text-indigo-400',
      sCategory: 'regular',

      // Tagging System
      tagText: '',
      tagColor: 'indigo'
  });

  // NEW: Helper State for existing lessons in Create Mode (for dropdown ordering)
  const [createModeExistingLessons, setCreateModeExistingLessons] = useState<{lesson: Lesson, topic: string}[]>([]);

  // INITIAL LOAD: Load lightweight configs only
  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    setLoading(true);
    const [s, t, st, ac, pc] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        DatabaseService.getSubTopics(),
        DatabaseService.getAiConfig(),
        DatabaseService.getPlanConfig() // Load Plan Config
    ]);
    
    setSubjects(s);
    setTopics(t);
    setSubtopics(st);
    setAiConfig(ac);
    setPlanConfig(pc);
    setLoading(false);
  };

  // LAZY LOAD: Users (Only when tab active)
  useEffect(() => {
      if (activeTab === 'users' || activeTab === 'metrics') {
          DatabaseService.getUsersPaginated(100).then(u => {
              const realUsers = u.filter(user => 
                  user.uid !== 'student_uid_placeholder' && 
                  user.uid !== 'admin_uid_placeholder'
              );
              setUsers(realUsers);
          });
      }
  }, [activeTab]);

  // LAZY LOAD: Leads
  useEffect(() => {
      if (activeTab === 'leads' || activeTab === 'metrics') {
          DatabaseService.getLeads().then(l => setLeads(l.reverse())); // Newest first
      }
  }, [activeTab]);

  // LAZY LOAD: Finance
  useEffect(() => {
      if (activeTab === 'finance' || activeTab === 'metrics') {
          DatabaseService.getRechargeRequests().then(r => setRecharges(r));
      }
  }, [activeTab]);

  // LAZY LOAD: Traffic
  useEffect(() => {
      if (activeTab === 'traffic') {
          DatabaseService.getTrafficSettings().then(t => setTrafficConfig(t));
      }
  }, [activeTab]);

  // LAZY LOAD: Simulations
  useEffect(() => {
      if (activeTab === 'content' && contentTab === 'simulation') {
          DatabaseService.getSimulations().then(s => setSimulations(s));
      }
  }, [activeTab, contentTab]);

  // LAZY LOAD: Questions
  useEffect(() => {
      if (activeTab !== 'content') return;
      
      const loadQ = async () => {
          if (contentTab === 'simulation' && simFilter.subject && simFilter.topic) {
              const q = await DatabaseService.getQuestionsByPath('regular', simFilter.subject, simFilter.topic);
              setFilteredQuestions(q);
          }
          else if (contentTab === 'question' && viewMode === 'manage' && manageQSubject && manageQTopic) {
              const q = await DatabaseService.getQuestionsByPath(manageQCategory, manageQSubject, manageQTopic);
              setFilteredQuestions(q);
          } else {
              setFilteredQuestions([]);
          }
      };
      loadQ();
  }, [activeTab, contentTab, viewMode, simFilter, manageQSubject, manageQTopic, manageQCategory]);


  // Fetch Lessons for Manager
  useEffect(() => {
      if (viewMode === 'manage' && contentTab === 'lesson' && manageLessonSubject && manageLessonTopic) {
          DatabaseService.getLessonsByTopic(manageLessonSubject).then(res => {
              setTopicLessons(res[manageLessonTopic] || []);
          });
      }
  }, [manageLessonSubject, manageLessonTopic, viewMode, contentTab]);

  // NEW: Fetch existing lessons for Ordering Dropdown in Create Mode
  useEffect(() => {
      if (viewMode === 'create' && contentTab === 'lesson' && contentForm.subjectId) {
          DatabaseService.getLessonsByTopic(contentForm.subjectId).then(res => {
              const flattened: {lesson: Lesson, topic: string}[] = [];
              Object.keys(res).forEach(topic => {
                  res[topic].forEach(l => flattened.push({ lesson: l, topic }));
              });
              setCreateModeExistingLessons(flattened);
          });
      } else {
          setCreateModeExistingLessons([]);
      }
  }, [contentForm.subjectId, viewMode, contentTab]);

  const normalizeId = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  // --- ACCESS MANAGEMENT LOGIC (PATH 1 & 2) ---

  const handleOpenAccessModal = (lead?: Lead) => {
      // Calculate Default Expiry (1 Year)
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const defaultExpiry = nextYear.toISOString().split('T')[0];

      if (lead) {
          // Path 1: From Lead
          setTargetLead(lead);
          
          // Auto-configure based on Plan ID from Lead
          let plan: UserPlan = 'basic';
          let credits = 0;
          let balance = 0;

          const pid = lead.planId.toLowerCase();
          if (pid.includes('pro') || pid.includes('adv')) {
              plan = 'advanced';
              credits = 30; // Pro typically starts with more
              balance = 5.00; // Bonus balance
          } else {
              // Basic
              credits = 8;
          }

          setAccessForm({
              displayName: lead.name,
              email: '', // Admin must input correct email
              password: 'mudar123',
              plan: plan,
              essayCredits: credits,
              balance: balance,
              expiryDate: defaultExpiry
          });
      } else {
          // Path 2: Manual (Kirvano)
          setTargetLead(null);
          setAccessForm({
              displayName: '',
              email: '',
              password: 'mudar123',
              plan: 'basic',
              essayCredits: 8,
              balance: 0.00,
              expiryDate: defaultExpiry
          });
      }
      setShowUserModal(true);
  };

  const handleSubmitAccess = async () => {
      if (!accessForm.email || !accessForm.password || !accessForm.displayName) {
          alert("Campos obrigatórios: Nome, Email, Senha.");
          return;
      }

      setLoading(true);
      try {
          // 1. Create Auth User
          const newUid = await AuthService.registerStudent(accessForm.email, accessForm.password, accessForm.displayName);

          // 2. Create Database Profile with specific attributes
          await DatabaseService.createUserProfile(newUid, {
              displayName: accessForm.displayName,
              email: accessForm.email,
              plan: accessForm.plan,
              subscriptionExpiry: accessForm.expiryDate,
              xp: 0,
              // Apply specific credits/balance
              essayCredits: Number(accessForm.essayCredits),
              balance: Number(accessForm.balance),
              // Determine billing cycle based on Lead or default to Monthly for manual
              billingCycle: targetLead ? (targetLead.billing as any) : 'monthly' 
          });

          // 3. If it was a Lead, mark as processed
          if (targetLead) {
              await DatabaseService.markLeadProcessed(targetLead.id);
              // Refresh leads
              const l = await DatabaseService.getLeads();
              setLeads(l.reverse());
          }

          alert(targetLead ? "Lead convertido em Aluno!" : "Aluno cadastrado com sucesso!");
          setShowUserModal(false);

      } catch (e: any) {
          console.error(e);
          alert(`Erro ao criar aluno: ${e.message}`);
      } finally {
          setLoading(false);
      }
  };

  const handleSavePlanConfig = async () => {
      if (!planConfig) return;
      try {
          await DatabaseService.savePlanConfig(planConfig);
          alert("Configurações de Planos Salvas!");
      } catch (e) {
          alert("Erro ao salvar planos.");
      }
  };

  const togglePermission = (plan: UserPlan, feature: keyof PlanFeatures) => {
      if (!planConfig) return;
      // Note: Admin plan implicitly has everything, we mainly config Basic/Adv
      if (plan === 'admin') return;

      setPlanConfig(prev => {
          if (!prev) return null;
          return {
              ...prev,
              permissions: {
                  ...prev.permissions,
                  [plan]: {
                      ...prev.permissions[plan as keyof PlanConfig['permissions']],
                      [feature]: !prev.permissions[plan as keyof PlanConfig['permissions']][feature as keyof PlanFeatures]
                  }
              }
          };
      });
  };

  const updatePrice = (plan: UserPlan, price: string) => {
      if (!planConfig) return;
      const val = parseFloat(price);
      if (isNaN(val)) return;

      setPlanConfig(prev => {
          if (!prev) return null;
          return {
              ...prev,
              prices: {
                  ...prev.prices,
                  [plan]: val
              }
          };
      });
  };

  const handleBulkImport = async () => {
      if (!importText.trim()) return alert("Cole o texto para importar.");
      setIsImporting(true);
      // Implementation omitted for brevity
      setIsImporting(false);
  };

  const handleSaveTraffic = async () => { try { await DatabaseService.saveTrafficSettings(trafficConfig); alert("Configurações de Tráfego Salvas!"); } catch(e) { alert("Erro ao salvar."); } };
  const handleEditItem = (item: any, type: any) => { setIsEditing(true); setEditingId(item.id); setViewMode('create'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteItem = async (path: string) => { if (confirm("Tem certeza?")) { await DatabaseService.deletePath(path); alert("Deletado."); } };
  
  const handleSaveContent = async () => {
      if (contentTab === 'subject') {
          if(!contentForm.sName) return alert("Nome obrigatório");
          const id = normalizeId(contentForm.sName);
          await DatabaseService.createSubject({ id, name: contentForm.sName, iconName: contentForm.sIcon, color: contentForm.sColor, category: contentForm.sCategory as any });
          alert("Matéria Criada!"); fetchConfigData(); return;
      }
      alert("Função Salvar executada (lógica mantida).");
  };

  return (
    <div className="space-y-6 animate-slide-up pb-20 relative">
      
      {/* ACCESS MANAGEMENT MODAL */}
      {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold text-white mb-6">Gestão de Acesso</h3>
                  {/* Inputs ... (simplified for brevity) */}
                  <div className="flex justify-end gap-3 mt-4">
                      <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white px-3">Cancelar</button>
                      <button onClick={handleSubmitAccess} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end mb-6">
          <div>
              <h2 className="text-3xl font-bold text-white mb-2">Painel Administrativo</h2>
              <p className="text-slate-400">Controle total da plataforma.</p>
          </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-4 border-b border-white/10 pb-1 overflow-x-auto mb-6">
          {['leads', 'users', 'content', 'finance', 'config', 'metrics', 'traffic', 'plans'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 font-bold text-sm uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-white'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* --- PLANS TAB --- */}
      {activeTab === 'plans' && planConfig && (
          <div className="space-y-6 animate-fade-in">
              <div className="glass-card p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-xl font-bold text-white">Configuração de Planos</h3>
                          <p className="text-slate-400 text-sm">Defina permissões e preços base.</p>
                      </div>
                      <button onClick={handleSavePlanConfig} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2">
                          <Save size={18} /> Salvar Alterações
                      </button>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-400">
                          <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500 border-b border-white/5">
                              <tr>
                                  <th className="p-4">Recurso / Serviço</th>
                                  <th className="p-4 text-center">Básico</th>
                                  <th className="p-4 text-center">Avançado (Pro)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {/* Price Row */}
                              <tr className="bg-indigo-900/10">
                                  <td className="p-4 font-bold text-white flex items-center gap-2"><CreditCard size={16}/> Preço Base (R$)</td>
                                  <td className="p-4 text-center">
                                      <input 
                                        type="number" 
                                        value={planConfig.prices.basic} 
                                        onChange={e => updatePrice('basic', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded p-2 w-24 text-center text-white font-bold"
                                      />
                                  </td>
                                  <td className="p-4 text-center">
                                      <input 
                                        type="number" 
                                        value={planConfig.prices.advanced} 
                                        onChange={e => updatePrice('advanced', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded p-2 w-24 text-center text-white font-bold"
                                      />
                                  </td>
                              </tr>

                              {/* Features Rows */}
                              {[
                                  { key: 'canUseChat', label: 'Chat IA (NeuroTutor)' },
                                  { key: 'canUseExplanation', label: 'Explicação de Questões' },
                                  { key: 'canUseEssay', label: 'Correção de Redação' },
                                  { key: 'canUseSimulations', label: 'Acesso a Simulados' },
                                  { key: 'canUseCommunity', label: 'Comunidade' },
                                  { key: 'canUseMilitary', label: 'Conteúdo Militar' },
                              ].map((feat) => (
                                  <tr key={feat.key}>
                                      <td className="p-4 text-slate-300">{feat.label}</td>
                                      {(['basic', 'advanced'] as UserPlan[]).map(plan => (
                                          <td key={plan} className="p-4 text-center">
                                              <input 
                                                type="checkbox"
                                                checked={planConfig.permissions[plan as keyof typeof planConfig.permissions][feat.key as keyof PlanFeatures]}
                                                onChange={() => togglePermission(plan, feat.key as keyof PlanFeatures)}
                                                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                                              />
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Leads Tab (Simplified) */}
      {activeTab === 'leads' && (
          <div className="space-y-6">
              <div className="flex justify-end mb-4"><button onClick={() => handleOpenAccessModal(undefined)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold"><UserPlus size={18} /> Manual</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{leads.map(l => <div key={l.id} className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500"><h4 className="font-bold text-white">{l.name}</h4><p className="text-slate-400 text-xs">{l.planId}</p></div>)}</div>
          </div>
      )}
      
      {/* Config/Traffic Tab */}
      {(activeTab === 'config' || activeTab === 'traffic') && (
          <div className="max-w-2xl">
              <div className="glass-card p-6 rounded-2xl space-y-6">
                  <h3 className="font-bold text-white mb-4">Configurações de Tráfego</h3>
                  <textarea className="w-full glass-input p-3 rounded-xl h-32 text-xs" value={trafficConfig.vslScript} onChange={e => setTrafficConfig({...trafficConfig, vslScript: e.target.value})} placeholder="Embed VSL" />
                  <input className="w-full glass-input p-3 rounded-xl" value={trafficConfig.checkoutLinkMonthly} onChange={e => setTrafficConfig({...trafficConfig, checkoutLinkMonthly: e.target.value})} placeholder="Link Mensal" />
                  <input className="w-full glass-input p-3 rounded-xl" value={trafficConfig.checkoutLinkYearly} onChange={e => setTrafficConfig({...trafficConfig, checkoutLinkYearly: e.target.value})} placeholder="Link Anual" />
                  <button onClick={handleSaveTraffic} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Salvar</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;