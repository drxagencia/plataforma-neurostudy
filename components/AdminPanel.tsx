
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan, LessonMaterial, Simulation, Lead, PlanConfig, PlanFeatures, LessonTag, SupportTicket } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon, PenTool, Link, FileText, LayoutList, Pencil, Eye, RefreshCw, Upload, Users, UserCheck, Calendar, Shield, BarChart3, TrendingUp, PieChart, DollarSign, Activity, X, Video, Target, Tag, Megaphone, Copy, AlertTriangle, MousePointerClick, Clock, ShoppingCart, User, CreditCard, ChevronRight, ArrowRight, ListPlus, LifeBuoy, MessageSquare, Send } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'content' | 'finance' | 'config' | 'traffic' | 'support'>('leads');
  const [contentSubTab, setContentSubTab] = useState<'lessons' | 'simulations'>('lessons');
  
  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [trafficConfig, setTrafficConfig] = useState({ vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' });
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]); // New
  
  // Content Management State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [topicLessons, setTopicLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isNewLesson, setIsNewLesson] = useState(false);
  
  // Dynamic Subtopics for Editor
  const [editorSubtopics, setEditorSubtopics] = useState<string[]>([]);

  // Simulation Management State
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [editingSim, setEditingSim] = useState<Simulation | null>(null);
  const [simQuestionPicker, setSimQuestionPicker] = useState<{subject: string, topic: string, available: Question[]}>({ subject: '', topic: '', available: [] });

  // Support Reply State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [supportReply, setSupportReply] = useState('');

  // Lead Modal
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState<{
    name: string;
    contact: string;
    planId: string;
    billing: 'monthly' | 'yearly';
    paymentMethod: string;
  }>({ name: '', contact: '', planId: 'plan_basic', billing: 'monthly', paymentMethod: 'manual' });

  // User Creation
  const [showUserModal, setShowUserModal] = useState(false);
  const [targetLead, setTargetLead] = useState<Lead | null>(null); 
  const [accessForm, setAccessForm] = useState({ displayName: '', email: '', password: 'mudar123', plan: 'basic' as UserPlan, essayCredits: 0, balance: 0.00, expiryDate: '' });

  const [loading, setLoading] = useState(false);

  // INITIAL LOAD
  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    const [s, t] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
    ]);
    setSubjects(s);
    setTopics(t);
  };

  // --- TAB LOADING LOGIC ---
  useEffect(() => {
      if (activeTab === 'users') DatabaseService.getUsersPaginated(100).then(u => setUsers(u.filter(x => x.uid !== 'student_uid_placeholder')));
      if (activeTab === 'leads') DatabaseService.getLeads().then(l => setLeads(l.reverse()));
      if (activeTab === 'finance') DatabaseService.getRechargeRequests().then(r => setRecharges(r.reverse()));
      if (activeTab === 'traffic') DatabaseService.getTrafficSettings().then(setTrafficConfig);
      if (activeTab === 'support') DatabaseService.getAllSupportTickets().then(t => setSupportTickets(t.sort((a,b) => b.lastUpdated - a.lastUpdated)));
      if (activeTab === 'content') {
          if (contentSubTab === 'simulations') DatabaseService.getSimulations().then(setSimulations);
      }
  }, [activeTab, contentSubTab]);

  // Load Lessons when Topic Selected
  useEffect(() => {
      if (selectedSubjectId && selectedTopicId) {
          DatabaseService.getLessonsByTopic(selectedSubjectId).then(data => {
              setTopicLessons(data[selectedTopicId] || []);
          });
      }
  }, [selectedSubjectId, selectedTopicId]);

  // Fetch Subtopics dynamically for Editor
  useEffect(() => {
      const fetchEditorSubtopics = async () => {
          if (editingLesson && editingLesson.type === 'exercise_block' && editingLesson.exerciseFilters) {
              const { category, subject, topic } = editingLesson.exerciseFilters;
              if (category && subject && topic) {
                  const subs = await DatabaseService.getAvailableSubtopics(category, subject, topic);
                  setEditorSubtopics(subs);
              } else {
                  setEditorSubtopics([]);
              }
          }
      };
      fetchEditorSubtopics();
  }, [editingLesson?.exerciseFilters?.category, editingLesson?.exerciseFilters?.subject, editingLesson?.exerciseFilters?.topic]);


  // --- CONTENT: LESSONS LOGIC ---
  const handleEditLesson = (lesson: Lesson) => {
      setEditingLesson({ ...lesson });
      setIsNewLesson(false);
  };

  const handleNewLesson = (type: 'video' | 'exercise_block') => {
      setEditingLesson({
          title: '',
          type: type,
          videoUrl: '',
          duration: '10:00',
          materials: [],
          tag: { text: '', color: 'blue' },
          exerciseFilters: type === 'exercise_block' ? { category: 'regular', subject: selectedSubjectId, topic: selectedTopicId, subtopics: [] } : undefined
      });
      setIsNewLesson(true);
  };

  const handleSaveLesson = async () => {
      if (!editingLesson || !selectedSubjectId || !selectedTopicId) return;
      
      // Calculate order (append to end if new)
      const order = isNewLesson ? topicLessons.length : (editingLesson as any).order;
      const lessonToSave = { ...editingLesson, order };

      if (isNewLesson) {
          await DatabaseService.createLesson(selectedSubjectId, selectedTopicId, lessonToSave);
      } else {
          // Update existing: Need to find the key. The Lesson object from DB has 'id' which is the key.
          if (editingLesson.id) {
             const path = `lessons/${selectedSubjectId}/${selectedTopicId}/${editingLesson.id}`;
             await DatabaseService.updatePath(path, lessonToSave);
          }
      }
      
      // Refresh
      const data = await DatabaseService.getLessonsByTopic(selectedSubjectId);
      setTopicLessons(data[selectedTopicId] || []);
      setEditingLesson(null);
  };

  const addMaterial = () => {
      if (!editingLesson) return;
      const mats = editingLesson.materials || [];
      setEditingLesson({ ...editingLesson, materials: [...mats, { title: 'Novo Material', url: '' }] });
  };

  const updateMaterial = (idx: number, field: 'title'|'url', value: string) => {
      if (!editingLesson?.materials) return;
      const newMats = [...editingLesson.materials];
      newMats[idx] = { ...newMats[idx], [field]: value };
      setEditingLesson({ ...editingLesson, materials: newMats });
  };

  const removeMaterial = (idx: number) => {
      if (!editingLesson?.materials) return;
      const newMats = editingLesson.materials.filter((_, i) => i !== idx);
      setEditingLesson({ ...editingLesson, materials: newMats });
  };

  // --- CONTENT: SIMULATIONS LOGIC ---
  const handleLoadQuestionsForSim = async () => {
      if (!simQuestionPicker.subject || !simQuestionPicker.topic) return;
      const qs = await DatabaseService.getQuestions('regular', simQuestionPicker.subject, simQuestionPicker.topic);
      setSimQuestionPicker(prev => ({ ...prev, available: qs }));
  };

  const handleAddQuestionToSim = (qId: string) => {
      if (!editingSim || !qId) return;
      const currentIds = editingSim.questionIds || [];
      if (!currentIds.includes(qId)) {
          setEditingSim({ ...editingSim, questionIds: [...currentIds, qId] });
      }
  };

  const handleRemoveQuestionFromSim = (qId: string) => {
      if (!editingSim?.questionIds) return;
      setEditingSim({ ...editingSim, questionIds: editingSim.questionIds.filter(id => id !== qId) });
  };

  const handleSaveSimulation = async () => {
      if (!editingSim) return;
      if (editingSim.id) {
          await DatabaseService.updatePath(`simulations/${editingSim.id}`, editingSim);
      } else {
          await DatabaseService.createSimulation(editingSim);
      }
      const s = await DatabaseService.getSimulations();
      setSimulations(s);
      setEditingSim(null);
  };

  // --- COMMON ADMIN LOGIC (Leads, Users, Finance) matches previous robust version ---
  const handleCreateLead = async () => {
      if (!leadForm.name) return;
      await DatabaseService.createLead({ ...leadForm, timestamp: new Date().toISOString(), status: 'pending_pix' });
      setShowLeadModal(false);
      DatabaseService.getLeads().then(l => setLeads(l.reverse()));
  };

  const handleFinanceAction = async (id: string, action: 'approved' | 'rejected') => {
      if (!confirm("Confirmar ação?")) return;
      await DatabaseService.processRecharge(id, action);
      DatabaseService.getRechargeRequests().then(r => setRecharges(r.reverse()));
  };

  const handleOpenAccessModal = (lead?: Lead) => {
      const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
      const defaultExpiry = nextYear.toISOString().split('T')[0];
      setTargetLead(lead || null);
      if (lead) {
          const isAdv = lead.planId.toLowerCase().includes('adv') || lead.planId.includes('pro');
          setAccessForm({ displayName: lead.name, email: '', password: 'mudar123', plan: isAdv ? 'advanced' : 'basic', essayCredits: isAdv ? 30 : 8, balance: isAdv ? 5.00 : 0, expiryDate: defaultExpiry });
      } else {
          setAccessForm({ displayName: '', email: '', password: 'mudar123', plan: 'basic', essayCredits: 8, balance: 0, expiryDate: defaultExpiry });
      }
      setShowUserModal(true);
  };

  const handleSubmitAccess = async () => {
      setLoading(true);
      try {
          const uid = await AuthService.registerStudent(accessForm.email, accessForm.password, accessForm.displayName);
          await DatabaseService.createUserProfile(uid, {
              ...accessForm,
              uid,
              xp: 0,
              billingCycle: targetLead ? (targetLead.billing as any) : 'monthly'
          });
          if (targetLead) await DatabaseService.markLeadProcessed(targetLead.id);
          alert("Aluno criado!");
          setShowUserModal(false);
          DatabaseService.getUsersPaginated(100).then(setUsers);
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  // --- SUPPORT LOGIC ---
  const handleSupportReply = async () => {
      if (!selectedTicket || !supportReply.trim()) return;
      
      await DatabaseService.replySupportTicket(selectedTicket.userId, supportReply, 'admin');
      setSupportReply('');
      setSelectedTicket(null);
      // Refresh tickets
      DatabaseService.getAllSupportTickets().then(t => setSupportTickets(t.sort((a,b) => b.lastUpdated - a.lastUpdated)));
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      
      {/* --- HEADER & TABS --- */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
          <div>
              <h2 className="text-3xl font-bold text-white mb-2">Painel Administrativo</h2>
              <p className="text-slate-400">Gestão centralizada da NeuroStudy.</p>
          </div>
          <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-white/10 overflow-x-auto">
              {['leads', 'users', 'content', 'finance', 'support', 'traffic'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      {/* ================= CONTENT TAB ================= */}
      {activeTab === 'content' && (
          <div className="space-y-6">
              {/* Sub Navigation */}
              <div className="flex gap-4 border-b border-white/10 pb-4">
                  <button onClick={() => setContentSubTab('lessons')} className={`flex items-center gap-2 text-sm font-bold ${contentSubTab === 'lessons' ? 'text-indigo-400' : 'text-slate-500'}`}>
                      <BookOpen size={18} /> Aulas & Playlists
                  </button>
                  <button onClick={() => setContentSubTab('simulations')} className={`flex items-center gap-2 text-sm font-bold ${contentSubTab === 'simulations' ? 'text-indigo-400' : 'text-slate-500'}`}>
                      <FileText size={18} /> Simulados & Provas
                  </button>
              </div>

              {/* === LESSONS MANAGEMENT === */}
              {contentSubTab === 'lessons' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Navigation Tree */}
                      <div className="glass-card p-6 rounded-2xl h-fit">
                          <h3 className="font-bold text-white mb-4">Navegação</h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Matéria</label>
                                  <select className="w-full glass-input p-2 rounded-lg" value={selectedSubjectId} onChange={e => { setSelectedSubjectId(e.target.value); setSelectedTopicId(''); }}>
                                      <option value="">Selecione...</option>
                                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                              </div>
                              {selectedSubjectId && (
                                  <div className="animate-in fade-in">
                                      <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Tópico</label>
                                      <select className="w-full glass-input p-2 rounded-lg" value={selectedTopicId} onChange={e => setSelectedTopicId(e.target.value)}>
                                          <option value="">Selecione...</option>
                                          {topics[selectedSubjectId]?.map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Right: Lesson List & Editor */}
                      <div className="lg:col-span-2 space-y-6">
                          {selectedSubjectId && selectedTopicId ? (
                              <>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white">{selectedTopicId}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleNewLesson('video')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-500">
                                            <Video size={14} /> Nova Aula
                                        </button>
                                        <button onClick={() => handleNewLesson('exercise_block')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-500">
                                            <ListPlus size={14} /> Novo Bloco de Questões
                                        </button>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="space-y-2">
                                    {topicLessons.map((lesson, idx) => (
                                        <div key={idx} className="glass-card p-4 rounded-xl flex justify-between items-center group hover:bg-slate-800/50 transition-all border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${lesson.type === 'exercise_block' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                    {lesson.type === 'exercise_block' ? 'Q' : idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{lesson.title}</p>
                                                    <div className="flex gap-2 text-[10px] text-slate-400 uppercase mt-1">
                                                        <span>{lesson.duration}</span>
                                                        {lesson.tag && <span className={`text-${lesson.tag.color}-400`}>• {lesson.tag.text}</span>}
                                                        {lesson.materials && lesson.materials.length > 0 && <span className="text-yellow-400">• {lesson.materials.length} Materiais</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleEditLesson(lesson)} className="p-2 bg-slate-800 hover:bg-white text-slate-400 hover:text-black rounded-lg transition-colors">
                                                <Pencil size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {topicLessons.length === 0 && <p className="text-slate-500 text-center py-8">Nenhuma aula neste tópico.</p>}
                                </div>
                              </>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                                  Selecione uma matéria e tópico para gerenciar.
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {/* === SIMULATIONS MANAGEMENT === */}
              {contentSubTab === 'simulations' && (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold text-white">Simulados Cadastrados</h3>
                          <button onClick={() => setEditingSim({ id: '', title: '', description: '', durationMinutes: 90, type: 'training', status: 'open', questionIds: [] })} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2">
                              <Plus size={18} /> Novo Simulado
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {simulations.map(sim => (
                              <div key={sim.id} className="glass-card p-5 rounded-xl border border-white/5 relative group">
                                  <h4 className="font-bold text-white mb-1">{sim.title}</h4>
                                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{sim.description}</p>
                                  <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-500">
                                      <span className="bg-slate-800 px-2 py-1 rounded">{sim.questionIds?.length || 0} Questões</span>
                                      <span className="bg-slate-800 px-2 py-1 rounded">{sim.durationMinutes} min</span>
                                  </div>
                                  <button onClick={() => setEditingSim(sim)} className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-white hover:text-black rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                      <Pencil size={14} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- MODAL: LESSON EDITOR --- */}
      {editingLesson && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white">{isNewLesson ? 'Nova Aula' : 'Editar Aula'}</h3>
                      <button onClick={() => setEditingLesson(null)}><X className="text-slate-400 hover:text-white" /></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs text-slate-400 font-bold uppercase">Título</label>
                              <input className="w-full glass-input p-2 rounded-lg mt-1" value={editingLesson.title} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} />
                          </div>
                          <div>
                              <label className="text-xs text-slate-400 font-bold uppercase">Duração (MM:SS)</label>
                              <input className="w-full glass-input p-2 rounded-lg mt-1" value={editingLesson.duration} onChange={e => setEditingLesson({...editingLesson, duration: e.target.value})} />
                          </div>
                      </div>

                      {editingLesson.type === 'video' ? (
                          <div>
                              <label className="text-xs text-slate-400 font-bold uppercase">URL do Vídeo (YouTube)</label>
                              <input className="w-full glass-input p-2 rounded-lg mt-1" value={editingLesson.videoUrl} onChange={e => setEditingLesson({...editingLesson, videoUrl: e.target.value})} placeholder="https://youtube.com/..." />
                          </div>
                      ) : (
                          <div className="p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/20">
                              <p className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2"><ListPlus size={16}/> Configuração do Bloco de Questões</p>
                              
                              <div className="mb-3">
                                  <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Categoria</label>
                                  <select 
                                    className="w-full glass-input p-2 rounded-lg text-xs"
                                    value={editingLesson.exerciseFilters?.category || 'regular'}
                                    onChange={e => setEditingLesson({
                                        ...editingLesson, 
                                        exerciseFilters: { 
                                            ...editingLesson.exerciseFilters!, 
                                            category: e.target.value,
                                            // Reset subtopics when category changes as path changes
                                            subtopics: []
                                        }
                                    })}
                                  >
                                      <option value="regular">Regular</option>
                                      <option value="military">Militar</option>
                                  </select>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                  {/* Just reusing current selections for simplicity, could add independent dropdowns */}
                                  <div className="text-xs text-slate-400">Matéria: <span className="text-white">{selectedSubjectId}</span></div>
                                  <div className="text-xs text-slate-400">Tópico: <span className="text-white">{selectedTopicId}</span></div>
                              </div>
                              
                              {/* Subtopic Selector */}
                              <div>
                                  <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Subtópico Específico</label>
                                  <select 
                                    className="w-full glass-input p-2 rounded-lg text-xs" 
                                    value={editingLesson.exerciseFilters?.subtopics?.[0] || ''} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEditingLesson({
                                            ...editingLesson, 
                                            exerciseFilters: { 
                                                ...editingLesson.exerciseFilters!, 
                                                subtopics: val ? [val] : []
                                            }
                                        });
                                    }}
                                  >
                                      <option value="">Todos os Subtópicos</option>
                                      {editorSubtopics.map(st => (
                                          <option key={st} value={st}>{st}</option>
                                      ))}
                                  </select>
                              </div>

                              <p className="text-[10px] text-slate-500 mt-2">O sistema buscará questões automaticamente baseadas nestes filtros.</p>
                          </div>
                      )}

                      {/* Materials */}
                      <div className="pt-4 border-t border-white/5">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-xs text-slate-400 font-bold uppercase">Materiais Complementares</label>
                              <button onClick={addMaterial} className="text-xs text-indigo-400 hover:text-white flex items-center gap-1"><Plus size={12}/> Adicionar</button>
                          </div>
                          <div className="space-y-2">
                              {editingLesson.materials?.map((mat, idx) => (
                                  <div key={idx} className="flex gap-2">
                                      <input className="flex-1 glass-input p-2 rounded-lg text-xs" placeholder="Título" value={mat.title} onChange={e => updateMaterial(idx, 'title', e.target.value)} />
                                      <input className="flex-1 glass-input p-2 rounded-lg text-xs" placeholder="URL" value={mat.url} onChange={e => updateMaterial(idx, 'url', e.target.value)} />
                                      <button onClick={() => removeMaterial(idx)} className="p-2 text-red-400 hover:bg-red-900/20 rounded"><Trash2 size={14}/></button>
                                  </div>
                              ))}
                              {(!editingLesson.materials || editingLesson.materials.length === 0) && <p className="text-xs text-slate-600">Nenhum material.</p>}
                          </div>
                      </div>

                      {/* Tag */}
                      <div className="pt-4 border-t border-white/5">
                          <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Tag Visual</label>
                          <div className="flex gap-2">
                              <input className="flex-1 glass-input p-2 rounded-lg" placeholder="Ex: Importante, Revisão" value={editingLesson.tag?.text || ''} onChange={e => setEditingLesson({...editingLesson, tag: { ...editingLesson.tag!, text: e.target.value }})} />
                              <select className="glass-input p-2 rounded-lg" value={editingLesson.tag?.color || 'blue'} onChange={e => setEditingLesson({...editingLesson, tag: { ...editingLesson.tag!, color: e.target.value }})}>
                                  <option value="blue">Azul</option>
                                  <option value="red">Vermelho</option>
                                  <option value="yellow">Amarelo</option>
                                  <option value="emerald">Verde</option>
                                  <option value="purple">Roxo</option>
                              </select>
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                      <button onClick={handleSaveLesson} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2">
                          <Save size={18} /> Salvar Aula
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: SIMULATION EDITOR (OPTIMIZED UX) --- */}
      {editingSim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                      <h3 className="text-xl font-bold text-white">{editingSim.id ? 'Editar Simulado' : 'Novo Simulado'}</h3>
                      <button onClick={() => setEditingSim(null)}><X className="text-slate-400 hover:text-white" /></button>
                  </div>

                  <div className="flex-1 flex gap-6 overflow-hidden">
                      {/* Left: Metadata & Questions List */}
                      <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                          <div className="space-y-3">
                              <input className="w-full glass-input p-3 rounded-xl font-bold" placeholder="Título do Simulado" value={editingSim.title} onChange={e => setEditingSim({...editingSim, title: e.target.value})} />
                              <textarea className="w-full glass-input p-3 rounded-xl text-sm h-20 resize-none" placeholder="Descrição..." value={editingSim.description} onChange={e => setEditingSim({...editingSim, description: e.target.value})} />
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-[10px] text-slate-400 uppercase font-bold">Minutos</label>
                                      <input type="number" className="w-full glass-input p-2 rounded-lg" value={editingSim.durationMinutes} onChange={e => setEditingSim({...editingSim, durationMinutes: parseInt(e.target.value)})} />
                                  </div>
                                  <div>
                                      <label className="text-[10px] text-slate-400 uppercase font-bold">Status</label>
                                      <select className="w-full glass-input p-2 rounded-lg" value={editingSim.status} onChange={e => setEditingSim({...editingSim, status: e.target.value as any})}>
                                          <option value="open">Aberto</option>
                                          <option value="closed">Fechado</option>
                                          <option value="coming_soon">Em Breve</option>
                                      </select>
                                  </div>
                              </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-white/10 flex-1">
                              <h4 className="font-bold text-white text-sm mb-2 flex justify-between items-center">
                                  Questões Selecionadas <span className="bg-indigo-600 px-2 rounded-full text-xs">{editingSim.questionIds?.length || 0}</span>
                              </h4>
                              <div className="space-y-2">
                                  {editingSim.questionIds?.map((qid, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-800 rounded-lg text-xs border border-white/5">
                                          <span className="font-mono text-slate-400">{qid}</span>
                                          <button onClick={() => handleRemoveQuestionFromSim(qid)} className="text-red-400 hover:text-white"><X size={14}/></button>
                                      </div>
                                  ))}
                                  {(!editingSim.questionIds || editingSim.questionIds.length === 0) && <p className="text-slate-600 text-xs italic">Nenhuma questão adicionada.</p>}
                              </div>
                          </div>
                      </div>

                      {/* Right: Question Picker (The Optimizer) */}
                      <div className="w-2/3 bg-slate-950/50 rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                          <div className="p-4 bg-slate-900 border-b border-white/5 flex gap-3 items-end">
                              <div className="flex-1">
                                  <label className="text-[10px] text-slate-400 uppercase font-bold">Matéria</label>
                                  <select className="w-full glass-input p-2 rounded-lg text-sm" value={simQuestionPicker.subject} onChange={e => setSimQuestionPicker({...simQuestionPicker, subject: e.target.value, topic: ''})}>
                                      <option value="">Filtrar...</option>
                                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                              </div>
                              <div className="flex-1">
                                  <label className="text-[10px] text-slate-400 uppercase font-bold">Assunto</label>
                                  <select className="w-full glass-input p-2 rounded-lg text-sm" value={simQuestionPicker.topic} onChange={e => setSimQuestionPicker({...simQuestionPicker, topic: e.target.value})}>
                                      <option value="">Filtrar...</option>
                                      {topics[simQuestionPicker.subject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                              </div>
                              <button onClick={handleLoadQuestionsForSim} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"><Search size={20}/></button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                              {simQuestionPicker.available.map(q => {
                                  const isAdded = editingSim.questionIds?.includes(q.id!);
                                  return (
                                      <div key={q.id} className={`p-4 rounded-xl border transition-all ${isAdded ? 'bg-emerald-900/10 border-emerald-500/30 opacity-50' : 'bg-slate-900 border-white/5 hover:border-indigo-500/50'}`}>
                                          <div className="flex justify-between gap-4">
                                              <div className="flex-1">
                                                  <p className="text-xs text-slate-400 font-mono mb-1">{q.id} • {q.difficulty}</p>
                                                  <p className="text-sm text-slate-200 line-clamp-2">{q.text}</p>
                                              </div>
                                              <button 
                                                onClick={() => !isAdded && handleAddQuestionToSim(q.id!)}
                                                disabled={isAdded}
                                                className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1 ${isAdded ? 'text-emerald-500 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                                              >
                                                  {isAdded ? <CheckCircle size={14}/> : <Plus size={14}/>}
                                                  {isAdded ? 'Adicionado' : 'Adicionar'}
                                              </button>
                                          </div>
                                      </div>
                                  );
                              })}
                              {simQuestionPicker.available.length === 0 && <p className="text-center text-slate-500 mt-10">Use os filtros acima para encontrar questões.</p>}
                          </div>
                      </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button onClick={handleSaveSimulation} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2">
                          <Save size={20} /> Salvar Simulado
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- LEAD & USER MODALS (Reused) --- */}
      {showLeadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
              <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-sm border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Novo Lead</h3>
                  <input className="w-full glass-input p-3 rounded-lg mb-2" placeholder="Nome" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} />
                  <input className="w-full glass-input p-3 rounded-lg mb-4" placeholder="Contato" value={leadForm.contact} onChange={e => setLeadForm({...leadForm, contact: e.target.value})} />
                  <div className="flex justify-end gap-2"><button onClick={() => setShowLeadModal(false)} className="text-slate-400 px-3">Cancelar</button><button onClick={handleCreateLead} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Criar</button></div>
              </div>
          </div>
      )}

      {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
              <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Aprovar Acesso</h3>
                  <input className="w-full glass-input p-3 rounded-lg mb-2" value={accessForm.displayName} onChange={e => setAccessForm({...accessForm, displayName: e.target.value})} placeholder="Nome" />
                  <input className="w-full glass-input p-3 rounded-lg mb-2" value={accessForm.email} onChange={e => setAccessForm({...accessForm, email: e.target.value})} placeholder="Email" />
                  <div className="flex gap-2 mb-4"><select className="glass-input p-3 rounded-lg flex-1" value={accessForm.plan} onChange={e => setAccessForm({...accessForm, plan: e.target.value as any})}><option value="basic">Básico</option><option value="advanced">Advanced</option></select><input type="number" className="glass-input p-3 rounded-lg w-24" value={accessForm.essayCredits} onChange={e => setAccessForm({...accessForm, essayCredits: +e.target.value})} placeholder="Créditos" /></div>
                  <div className="flex justify-end gap-2"><button onClick={() => setShowUserModal(false)} className="text-slate-400 px-3">Cancelar</button><button onClick={handleSubmitAccess} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">{loading ? <Loader2 className="animate-spin"/> : "Criar Aluno"}</button></div>
              </div>
          </div>
      )}

      {/* --- SUPPORT TAB --- */}
      {activeTab === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
              {/* Ticket List */}
              <div className="glass-card rounded-2xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-slate-900/50">
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <LifeBuoy size={18} className="text-indigo-400"/> Tickets de Suporte
                      </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {supportTickets.map(ticket => (
                          <div 
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900 border-white/5 hover:bg-slate-800'}`}
                          >
                              <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-white text-sm">{ticket.userName}</span>
                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${ticket.status === 'open' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                      {ticket.status}
                                  </span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-1">{ticket.issueDescription}</p>
                              <span className="text-[10px] text-slate-600 mt-2 block">{new Date(ticket.lastUpdated).toLocaleString()}</span>
                          </div>
                      ))}
                      {supportTickets.length === 0 && <p className="text-center text-slate-500 p-4">Nenhum ticket aberto.</p>}
                  </div>
              </div>

              {/* Chat View */}
              <div className="glass-card rounded-2xl flex flex-col overflow-hidden relative">
                  {selectedTicket ? (
                      <>
                          <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                              <div>
                                  <h4 className="font-bold text-white">{selectedTicket.userName}</h4>
                                  <p className="text-xs text-slate-400">{selectedTicket.userEmail}</p>
                              </div>
                              <span className="text-xs font-mono text-indigo-400">ID: {selectedTicket.id.substring(0,6)}</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar">
                              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-yellow-200 text-xs">
                                  <strong>Problema Original:</strong> {selectedTicket.issueDescription}
                              </div>
                              {selectedTicket.messages.map((msg, idx) => (
                                  <div key={idx} className={`flex gap-3 ${msg.role === 'admin' ? 'flex-row-reverse' : ''}`}>
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'admin' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                          {msg.role === 'admin' ? <Shield size={16}/> : <User size={16}/>}
                                      </div>
                                      <div className={`p-3 rounded-xl max-w-[80%] text-sm ${msg.role === 'admin' ? 'bg-emerald-900/40 text-emerald-100 border border-emerald-500/30' : 'bg-slate-800 text-slate-200'}`}>
                                          {msg.content}
                                          <span className="text-[9px] opacity-50 block mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          <div className="p-4 border-t border-white/5 bg-slate-900 relative">
                              <input 
                                className="w-full glass-input p-3 pr-12 rounded-xl text-sm"
                                placeholder="Responder usuário..."
                                value={supportReply}
                                onChange={e => setSupportReply(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSupportReply()}
                              />
                              <button 
                                onClick={handleSupportReply} 
                                disabled={!supportReply.trim()}
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white disabled:opacity-50"
                              >
                                  <Send size={18}/>
                              </button>
                          </div>
                      </>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <MessageSquare size={48} className="mb-4 opacity-50" />
                          <p>Selecione um ticket para responder.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- OTHER TABS (Leads, Users, Finance) --- */}
      {/* ... Keeping existing tabs logic minimal for brevity as focus is Content ... */}
      {activeTab === 'leads' && (
          <div className="space-y-4">
              <button onClick={() => setShowLeadModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 w-fit"><UserPlus size={18}/> Novo Lead</button>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.map(l => (
                      <div key={l.id} className={`glass-card p-4 rounded-xl border-l-4 ${l.processed ? 'border-emerald-500 opacity-60' : 'border-yellow-500'}`}>
                          <div className="flex justify-between"><h4 className="font-bold text-white">{l.name}</h4>{l.processed ? <CheckCircle className="text-emerald-500" size={16}/> : <button onClick={() => handleOpenAccessModal(l)} className="text-indigo-400 hover:underline text-xs font-bold">Aprovar</button>}</div>
                          <p className="text-xs text-slate-400">{l.contact} • {l.planId}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'finance' && (
          <div className="space-y-4">
              {recharges.map(r => (
                  <div key={r.id} className="glass-card p-4 rounded-xl flex justify-between items-center">
                      <div><p className="font-bold text-white">R$ {r.amount} - {r.userDisplayName}</p><p className="text-xs text-slate-400">{r.planLabel || 'Recarga'}</p></div>
                      {r.status === 'pending' ? (
                          <div className="flex gap-2"><button onClick={() => handleFinanceAction(r.id, 'rejected')} className="p-2 bg-red-900/50 text-red-400 rounded"><X size={16}/></button><button onClick={() => handleFinanceAction(r.id, 'approved')} className="p-2 bg-emerald-600 text-white rounded"><CheckCircle size={16}/></button></div>
                      ) : <span className={`text-xs font-bold uppercase ${r.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>{r.status}</span>}
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'users' && (
          <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-900 font-bold text-slate-500"><tr><th className="p-4">Nome</th><th className="p-4">Plano</th><th className="p-4">XP</th></tr></thead>
                  <tbody>{users.map(u => <tr key={u.uid} className="border-t border-white/5">
                      <td className="p-4 text-white">{u.displayName}</td><td className="p-4 uppercase">{u.plan}</td><td className="p-4">{u.xp}</td>
                  </tr>)}</tbody>
              </table>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;
