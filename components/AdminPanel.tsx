
import React, { useState, useEffect } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan, LessonMaterial, Simulation } from '../types';
import { DatabaseService } from '../services/databaseService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon, PenTool, Link, FileText, LayoutList, Pencil, Eye, RefreshCw } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'content' | 'finance' | 'config'>('users');
  const [contentTab, setContentTab] = useState<'question' | 'lesson' | 'subject' | 'simulation'>('question');
  
  // View Mode: Create New vs Manage Existing
  const [viewMode, setViewMode] = useState<'create' | 'manage'>('create');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);

  // Data
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [subtopics, setSubtopics] = useState<Record<string, string[]>>({});
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  
  // Management Lists
  // NOTE: filteredQuestions now only loads when needed to prevent bandwidth explosion
  const [filteredQuestions, setFilteredQuestions] = useState<(Question & { path: string, subtopic: string })[]>([]);
  
  // Lesson Management
  const [manageLessonSubject, setManageLessonSubject] = useState('');
  const [manageLessonTopic, setManageLessonTopic] = useState('');
  const [topicLessons, setTopicLessons] = useState<Lesson[]>([]);

  // States
  const [loading, setLoading] = useState(true);
  
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

  // Edit User
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

  const [contentForm, setContentForm] = useState({
      subjectId: '',
      topicName: '',
      subtopicName: '', 
      qText: '',
      qImageUrl: '', 
      qOptions: ['', '', '', ''],
      qCorrect: 0,
      qDifficulty: 'medium',
      qExplanation: '',
      lTitle: '',
      lUrl: '',
      lDuration: '',
      // Subject Form
      sName: '',
      sIcon: 'BookOpen',
      sColor: 'text-indigo-400'
  });

  // INITIAL LOAD: Load lightweight configs only
  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    setLoading(true);
    const [s, t, st, ac] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        DatabaseService.getSubTopics(),
        DatabaseService.getAiConfig()
    ]);
    
    setSubjects(s);
    setTopics(t);
    setSubtopics(st);
    setAiConfig(ac);
    setLoading(false);
  };

  // LAZY LOAD: Users (Only when tab active)
  useEffect(() => {
      if (activeTab === 'users') {
          DatabaseService.getUsersPaginated(50).then(u => {
              const realUsers = u.filter(user => 
                  user.uid !== 'student_uid_placeholder' && 
                  user.uid !== 'admin_uid_placeholder'
              );
              setUsers(realUsers);
          });
      }
  }, [activeTab]);

  // LAZY LOAD: Finance
  useEffect(() => {
      if (activeTab === 'finance') {
          DatabaseService.getRechargeRequests().then(r => setRecharges(r));
      }
  }, [activeTab]);

  // LAZY LOAD: Simulations
  useEffect(() => {
      if (activeTab === 'content' && contentTab === 'simulation') {
          DatabaseService.getSimulations().then(s => setSimulations(s));
      }
  }, [activeTab, contentTab]);

  // LAZY LOAD: Questions (Specific Filters Only)
  // Logic: When in Sim Creator or Manager, we load based on subject/topic filters
  useEffect(() => {
      if (activeTab !== 'content') return;
      
      const loadQ = async () => {
          // Case 1: Simulation Creator Filter
          if (contentTab === 'simulation' && simFilter.subject && simFilter.topic) {
              const q = await DatabaseService.getQuestionsByPath(simFilter.subject, simFilter.topic);
              setFilteredQuestions(q);
          }
          // Case 2: Manage Questions Filter
          else if (contentTab === 'question' && viewMode === 'manage' && manageQSubject && manageQTopic) {
              const q = await DatabaseService.getQuestionsByPath(manageQSubject, manageQTopic);
              setFilteredQuestions(q);
          } else {
              setFilteredQuestions([]);
          }
      };
      loadQ();
  }, [activeTab, contentTab, viewMode, simFilter, manageQSubject, manageQTopic]);


  // Fetch Lessons for Manager
  useEffect(() => {
      if (viewMode === 'manage' && contentTab === 'lesson' && manageLessonSubject && manageLessonTopic) {
          DatabaseService.getLessonsByTopic(manageLessonSubject).then(res => {
              setTopicLessons(res[manageLessonTopic] || []);
          });
      }
  }, [manageLessonSubject, manageLessonTopic, viewMode, contentTab]);

  // --- ACTIONS ---

  const handleEditItem = (item: any, type: 'question' | 'lesson' | 'simulation' | 'subject') => {
      setIsEditing(true);
      setEditingId(item.id);
      setViewMode('create'); // Switch to form view

      if (type === 'question') {
          setContentForm({
              ...contentForm,
              subjectId: item.subjectId,
              topicName: item.topic,
              subtopicName: item.subtopic,
              qText: item.text,
              qImageUrl: item.imageUrl || '',
              qOptions: item.options,
              qCorrect: item.correctAnswer,
              qDifficulty: item.difficulty,
              qExplanation: item.explanation || ''
          });
          setEditingPath(item.path);
      } else if (type === 'lesson') {
          setContentForm({
              ...contentForm,
              subjectId: manageLessonSubject, // Context from manager select
              topicName: manageLessonTopic,
              lTitle: item.title,
              lUrl: item.videoUrl,
              lDuration: item.duration
          });
          setMaterials(item.materials || []);
          // Reconstruct path for lesson: lessons/subject/topic/ID
          setEditingPath(`lessons/${manageLessonSubject}/${manageLessonTopic}/${item.id}`);
      } else if (type === 'simulation') {
          setSimForm({
              title: item.title,
              description: item.description,
              duration: item.durationMinutes,
              type: item.type,
              status: item.status,
              subjects: item.subjects || [],
              selectedQuestionIds: item.questionIds || []
          });
          setEditingPath(`simulations/${item.id}`);
      }
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = async (path: string) => {
      if (confirm("Tem certeza que deseja DELETAR este item? Essa ação não pode ser desfeita.")) {
          await DatabaseService.deletePath(path);
          alert("Item deletado.");
          // Refresh depends on context, simple reload of data trigger
          if (contentTab === 'question') {
               const q = await DatabaseService.getQuestionsByPath(manageQSubject, manageQTopic);
               setFilteredQuestions(q);
          } else if (contentTab === 'simulation') {
             const s = await DatabaseService.getSimulations();
             setSimulations(s);
          } else if (contentTab === 'lesson') {
             const res = await DatabaseService.getLessonsByTopic(manageLessonSubject);
             setTopicLessons(res[manageLessonTopic] || []);
          }
      }
  };

  const handleSaveContent = async () => {
      // 1. UPDATE MODE
      if (isEditing && editingPath) {
          try {
             let updateData: any = {};
             
             if (contentTab === 'question') {
                updateData = {
                    text: contentForm.qText,
                    imageUrl: contentForm.qImageUrl,
                    options: contentForm.qOptions,
                    correctAnswer: contentForm.qCorrect,
                    difficulty: contentForm.qDifficulty,
                    explanation: contentForm.qExplanation,
                    subjectId: contentForm.subjectId,
                    topic: contentForm.topicName,
                };
             } else if (contentTab === 'lesson') {
                updateData = {
                    title: contentForm.lTitle,
                    videoUrl: contentForm.lUrl,
                    duration: contentForm.lDuration,
                    materials: materials
                };
             } else if (contentTab === 'simulation') {
                updateData = {
                    title: simForm.title,
                    description: simForm.description,
                    durationMinutes: Number(simForm.duration),
                    type: simForm.type,
                    status: simForm.status,
                    subjects: simForm.subjects,
                    questionIds: simForm.selectedQuestionIds,
                    questionCount: simForm.selectedQuestionIds.length
                };
             }

             await DatabaseService.updatePath(editingPath, updateData);
             alert("Item atualizado com sucesso!");
             setIsEditing(false);
             setEditingId(null);
             setEditingPath(null);
             resetForms();
          } catch (e) {
              console.error(e);
              alert("Erro ao atualizar.");
          }
          return;
      }

      // 2. CREATE MODE (Existing Logic)
      if (contentTab === 'subject') {
          if(!contentForm.sName) return alert("Nome obrigatório");
          const id = contentForm.sName.toLowerCase().replace(/\s+/g, '-');
          await DatabaseService.createSubject({
              id,
              name: contentForm.sName,
              iconName: contentForm.sIcon,
              color: contentForm.sColor
          });
          alert("Matéria Criada!");
          fetchConfigData(); // Reload subjects
          return;
      }

      if (contentTab === 'simulation') {
          if (!simForm.title || !simForm.description) return alert("Preencha título e descrição");
          if (simForm.selectedQuestionIds.length === 0) return alert("Adicione pelo menos uma questão");

          await DatabaseService.createSimulation({
              title: simForm.title,
              description: simForm.description,
              durationMinutes: Number(simForm.duration),
              type: simForm.type as any,
              status: simForm.status as any,
              subjects: simForm.subjects, 
              questionIds: simForm.selectedQuestionIds,
              questionCount: simForm.selectedQuestionIds.length
          } as any);
          
          alert("Simulado Criado com Sucesso!");
          resetForms();
          return;
      }

      if (!contentForm.subjectId || !contentForm.topicName) {
          alert("Selecione Matéria e Tópico");
          return;
      }
      try {
          if (contentTab === 'question') {
              if (!contentForm.qText || !contentForm.subtopicName) {
                  alert("Preencha o Enunciado e o Subtópico para manter a organização.");
                  return;
              }
              const newQuestion: Question = {
                  text: contentForm.qText,
                  imageUrl: contentForm.qImageUrl || "", 
                  options: contentForm.qOptions.filter(o => o.trim() !== ''),
                  correctAnswer: contentForm.qCorrect,
                  difficulty: contentForm.qDifficulty as any,
                  explanation: contentForm.qExplanation,
                  subjectId: contentForm.subjectId,
                  topic: contentForm.topicName
              };
              
              await DatabaseService.createQuestion(contentForm.subjectId, contentForm.topicName, contentForm.subtopicName, newQuestion);
              alert("Questão criada com sucesso e estrutura atualizada!");
          } else {
              if (!contentForm.lTitle) return;
              const newLesson: Lesson = {
                  title: contentForm.lTitle,
                  videoUrl: contentForm.lUrl,
                  duration: contentForm.lDuration,
                  materials: materials 
              };
              await DatabaseService.createLesson(contentForm.subjectId, contentForm.topicName, newLesson);
              alert("Aula criada com sucesso!");
              setMaterials([]);
          }
          resetForms();
      } catch (e) {
          console.error(e);
          alert("Erro ao salvar conteúdo.");
      }
  };

  const resetForms = () => {
      setSimForm({ title: '', description: '', duration: 60, type: 'official', status: 'open', subjects: [], selectedQuestionIds: [] });
      setContentForm(prev => ({...prev, qText: '', qImageUrl: '', lTitle: '', lUrl: '', lDuration: '', qOptions: ['', '', '', ''], qExplanation: ''}));
      setMaterials([]);
  };

  const addMaterial = () => {
      if (currentMaterial.title && currentMaterial.url) {
          setMaterials([...materials, { ...currentMaterial }]);
          setCurrentMaterial({ title: '', url: '' });
      }
  };
  const removeMaterial = (index: number) => {
      setMaterials(materials.filter((_, i) => i !== index));
  };
  const toggleQuestionInSim = (qId: string) => {
      setSimForm(prev => {
          const exists = prev.selectedQuestionIds.includes(qId);
          if (exists) return { ...prev, selectedQuestionIds: prev.selectedQuestionIds.filter(id => id !== qId) };
          return { ...prev, selectedQuestionIds: [...prev.selectedQuestionIds, qId] };
      });
  };
  const handleSaveUser = async (uid: string | null) => {
    if (!uid && newUserMode) {
        const newUid = `user_${Date.now()}`;
        await DatabaseService.createUserProfile(newUid, {
            displayName: userDataForm.displayName,
            email: userDataForm.email,
            isAdmin: userDataForm.isAdmin,
            plan: userDataForm.plan as UserPlan,
            subscriptionExpiry: userDataForm.expiry,
            xp: 0,
            photoURL: ''
        });
        setNewUserMode(false);
    } else if (uid) {
        await DatabaseService.updateUserPlan(uid, userDataForm.plan as UserPlan, userDataForm.expiry);
        setEditingUserId(null);
    }
  };
  const handleProcessRecharge = async (id: string, status: 'approved' | 'rejected') => {
      if (!confirm(`Tem certeza que deseja marcar como ${status}?`)) return;
      await DatabaseService.processRecharge(id, status);
      const r = await DatabaseService.getRechargeRequests();
      setRecharges(r);
  };


  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-slide-up pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Painel Administrativo</h2>
          <p className="text-slate-400">Controle total sobre usuários, finanças e conteúdo.</p>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
            {[
                { id: 'users', label: 'Usuários', icon: UserPlus },
                { id: 'content', label: 'Conteúdo', icon: BookOpen },
                { id: 'finance', label: 'Financeiro', icon: Wallet },
                { id: 'config', label: 'Config. IA', icon: SettingsIcon }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>
      </header>

      {/* --- CONTENT TAB --- */}
      {activeTab === 'content' && (
          <div className="space-y-6">
              {/* Type Selector */}
              <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
                  <button onClick={() => {setContentTab('question'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'question' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><FilePlus size={18} /> Questões</button>
                  <button onClick={() => {setContentTab('lesson'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'lesson' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><Layers size={18} /> Aulas</button>
                  <button onClick={() => {setContentTab('subject'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'subject' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><PenTool size={18} /> Matérias</button>
                  <button onClick={() => {setContentTab('simulation'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'simulation' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><LayoutList size={18} /> Simulados</button>
              </div>

              {/* Toggle Create vs Manage */}
              {contentTab !== 'subject' && (
                  <div className="flex justify-center mb-6">
                      <div className="bg-slate-900 border border-white/10 p-1 rounded-lg flex">
                          <button onClick={() => {setViewMode('create'); resetForms(); setIsEditing(false);}} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                             {isEditing ? 'Editando Item' : 'Criar Novo'}
                          </button>
                          <button onClick={() => {setViewMode('manage'); setIsEditing(false); resetForms();}} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'manage' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                              Gerenciar Existentes
                          </button>
                      </div>
                  </div>
              )}

              {/* --- VIEW MODE: CREATE / EDIT --- */}
              {viewMode === 'create' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                      <div className="lg:col-span-2 space-y-6">
                          <div className={`glass-card p-6 rounded-2xl ${isEditing ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : ''}`}>
                             {isEditing && (
                                 <div className="bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-lg mb-6 flex items-center justify-between">
                                     <span className="font-bold flex items-center gap-2"><Pencil size={16}/> Modo de Edição</span>
                                     <button onClick={() => {setIsEditing(false); setEditingId(null); resetForms();}} className="text-xs hover:text-white underline">Cancelar</button>
                                 </div>
                             )}

                             {contentTab === 'simulation' && (
                                 <div className="space-y-6">
                                     <div className="space-y-4">
                                         <input className="w-full glass-input p-3 rounded-lg" placeholder="Título do Simulado" value={simForm.title} onChange={e => setSimForm({...simForm, title: e.target.value})} />
                                         <textarea className="w-full glass-input p-3 rounded-lg" placeholder="Descrição" value={simForm.description} onChange={e => setSimForm({...simForm, description: e.target.value})} />
                                         <div className="flex gap-4">
                                             <input type="number" className="flex-1 glass-input p-3 rounded-lg" placeholder="Duração (min)" value={simForm.duration} onChange={e => setSimForm({...simForm, duration: Number(e.target.value)})} />
                                             <select className="flex-1 glass-input p-3 rounded-lg" value={simForm.status} onChange={e => setSimForm({...simForm, status: e.target.value})}>
                                                 <option value="open">Aberto</option>
                                                 <option value="coming_soon">Em Breve</option>
                                                 <option value="closed">Fechado</option>
                                             </select>
                                             <select className="flex-1 glass-input p-3 rounded-lg" value={simForm.type} onChange={e => setSimForm({...simForm, type: e.target.value})}>
                                                 <option value="official">Oficial</option>
                                                 <option value="training">Treino</option>
                                             </select>
                                         </div>
                                     </div>

                                     <div className="border-t border-white/5 pt-4">
                                         <h4 className="font-bold text-white mb-2">Selecionar Questões</h4>
                                         <p className="text-xs text-slate-400 mb-4">Filtre para carregar as questões disponíveis.</p>
                                         
                                         <div className="flex gap-2 mb-4">
                                             <select className="glass-input p-2 rounded-lg text-sm" value={simFilter.subject} onChange={e => setSimFilter({...simFilter, subject: e.target.value})}>
                                                 <option value="">Selecione Matéria</option>
                                                 {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                             </select>
                                             <select className="glass-input p-2 rounded-lg text-sm" value={simFilter.topic} onChange={e => setSimFilter({...simFilter, topic: e.target.value})}>
                                                 <option value="">Selecione Tópico</option>
                                                 {simFilter.subject && topics[simFilter.subject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                             </select>
                                         </div>

                                         <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 p-1">
                                             {filteredQuestions.map(q => (
                                                 <div 
                                                     key={q.id} 
                                                     onClick={() => q.id && toggleQuestionInSim(q.id)}
                                                     className={`p-3 rounded-lg border cursor-pointer transition-all ${simForm.selectedQuestionIds.includes(q.id!) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900 border-white/5 hover:border-white/20'}`}
                                                 >
                                                     <p className="text-sm text-white line-clamp-2">{q.text}</p>
                                                     <div className="flex gap-2 text-[10px] text-slate-400 mt-1">
                                                         <span className="bg-white/5 px-1 rounded">{q.topic}</span>
                                                         <span className="bg-white/5 px-1 rounded">{q.difficulty}</span>
                                                     </div>
                                                 </div>
                                             ))}
                                             {filteredQuestions.length === 0 && <p className="text-slate-500 text-sm">Selecione filtros acima para carregar questões.</p>}
                                         </div>
                                         <p className="text-right text-xs text-indigo-400 mt-2">Selecionadas: {simForm.selectedQuestionIds.length}</p>
                                     </div>
                                 </div>
                             )}

                             {contentTab !== 'subject' && contentTab !== 'simulation' && (
                                  <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400">Matéria</label>
                                        <select className="w-full glass-input p-3 rounded-lg" value={contentForm.subjectId} onChange={(e) => setContentForm({...contentForm, subjectId: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400">Tópico</label>
                                        <input 
                                            className="w-full glass-input p-3 rounded-lg" 
                                            placeholder="Ex: Cinemática" 
                                            value={contentForm.topicName} 
                                            onChange={(e) => setContentForm({...contentForm, topicName: e.target.value})} 
                                            list="topics-list" 
                                        />
                                        <datalist id="topics-list">{contentForm.subjectId && topics[contentForm.subjectId]?.map(t => <option key={t} value={t} />)}</datalist>
                                    </div>
                                  </div>
                              )}

                              {contentTab === 'subject' && (
                                  <div className="space-y-4 animate-fade-in">
                                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Nome da Matéria (ex: Biologia)" value={contentForm.sName} onChange={e => setContentForm({...contentForm, sName: e.target.value})} />
                                      <select className="w-full glass-input p-3 rounded-lg" value={contentForm.sColor} onChange={e => setContentForm({...contentForm, sColor: e.target.value})}>
                                          <option value="text-blue-400">Azul</option>
                                          <option value="text-red-400">Vermelho</option>
                                          <option value="text-green-400">Verde</option>
                                          <option value="text-yellow-400">Amarelo</option>
                                          <option value="text-purple-400">Roxo</option>
                                      </select>
                                  </div>
                              )}

                              {contentTab === 'question' && (
                                  <div className="space-y-4 animate-fade-in">
                                      <div className="space-y-1">
                                          <label className="text-xs text-slate-400">Subtópico</label>
                                          <input 
                                            className="w-full glass-input p-3 rounded-lg" 
                                            placeholder="Ex: Movimento Uniforme" 
                                            value={contentForm.subtopicName} 
                                            onChange={(e) => setContentForm({...contentForm, subtopicName: e.target.value})} 
                                            list="subtopics-list"
                                          />
                                          <datalist id="subtopics-list">{contentForm.topicName && subtopics[contentForm.topicName]?.map(st => <option key={st} value={st} />)}</datalist>
                                          <p className="text-[10px] text-slate-500">Subtópicos organizam as questões. Se não existir, será criado.</p>
                                      </div>

                                      <textarea className="w-full glass-input p-4 rounded-xl min-h-[100px]" placeholder="Enunciado da questão..." value={contentForm.qText} onChange={e => setContentForm({...contentForm, qText: e.target.value})} />
                                      <input className="w-full glass-input p-3 rounded-lg" placeholder="URL da Imagem (Opcional)" value={contentForm.qImageUrl} onChange={e => setContentForm({...contentForm, qImageUrl: e.target.value})} />
                                      
                                      <div className="space-y-2">
                                          <label className="text-xs text-slate-400">Alternativas</label>
                                          {contentForm.qOptions.map((opt, idx) => (
                                              <div key={idx} className="flex gap-2 items-center">
                                                  <input type="radio" name="correct" checked={contentForm.qCorrect === idx} onChange={() => setContentForm({...contentForm, qCorrect: idx})} />
                                                  <input className="flex-1 glass-input p-2 rounded-lg" placeholder={`Alternativa ${idx + 1}`} value={opt} onChange={(e) => { const newOpts = [...contentForm.qOptions]; newOpts[idx] = e.target.value; setContentForm({...contentForm, qOptions: newOpts}); }} />
                                              </div>
                                          ))}
                                      </div>

                                      <textarea className="w-full glass-input p-3 rounded-lg" placeholder="Explicação da resposta" value={contentForm.qExplanation} onChange={e => setContentForm({...contentForm, qExplanation: e.target.value})} />
                                  </div>
                              )}

                              {contentTab === 'lesson' && (
                                  <div className="space-y-4 animate-fade-in">
                                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Título da Aula" value={contentForm.lTitle} onChange={e => setContentForm({...contentForm, lTitle: e.target.value})} />
                                      <input className="w-full glass-input p-3 rounded-lg" placeholder="URL do Vídeo (YouTube)" value={contentForm.lUrl} onChange={e => setContentForm({...contentForm, lUrl: e.target.value})} />
                                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Duração (ex: 15:00)" value={contentForm.lDuration} onChange={e => setContentForm({...contentForm, lDuration: e.target.value})} />
                                      
                                      <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-3">
                                          <label className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2"><FileText size={14}/> Materiais de Apoio (Opcional)</label>
                                          
                                          {materials.map((mat, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm bg-slate-800 p-2 rounded-lg">
                                                  <Link size={14} className="text-indigo-400"/>
                                                  <span className="flex-1 truncate text-slate-300">{mat.title}</span>
                                                  <button onClick={() => removeMaterial(idx)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14}/></button>
                                              </div>
                                          ))}

                                          <div className="flex gap-2">
                                              <input 
                                                  className="flex-1 glass-input p-2 rounded-lg text-sm" 
                                                  placeholder="Título do Material (ex: PDF de Resumo)" 
                                                  value={currentMaterial.title}
                                                  onChange={e => setCurrentMaterial({...currentMaterial, title: e.target.value})}
                                              />
                                              <input 
                                                  className="flex-1 glass-input p-2 rounded-lg text-sm" 
                                                  placeholder="URL (Drive, Dropbox...)" 
                                                  value={currentMaterial.url}
                                                  onChange={e => setCurrentMaterial({...currentMaterial, url: e.target.value})}
                                              />
                                              <button 
                                                  onClick={addMaterial}
                                                  disabled={!currentMaterial.title || !currentMaterial.url}
                                                  className="p-2 bg-indigo-600 rounded-lg text-white disabled:opacity-50 hover:bg-indigo-500"
                                              >
                                                  <Plus size={18}/>
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                              
                              <button onClick={handleSaveContent} className={`w-full py-3 text-white font-bold rounded-xl transition-all ${isEditing ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                                  {isEditing ? 'Atualizar Item' : `Criar ${contentTab === 'lesson' ? 'Aula' : contentTab === 'question' ? 'Questão' : contentTab === 'simulation' ? 'Simulado' : 'Matéria'}`}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* --- VIEW MODE: MANAGE (LISTS) --- */}
              {viewMode === 'manage' && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Questions Manager */}
                      {contentTab === 'question' && (
                          <div className="glass-card p-6 rounded-2xl">
                              <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                                  <RefreshCw size={16} /> Para editar questões, selecione a matéria e tópico abaixo para carregar.
                              </div>
                              <div className="flex gap-4 mb-6">
                                  <select className="glass-input p-3 rounded-lg flex-1" value={manageQSubject} onChange={e => setManageQSubject(e.target.value)}>
                                      <option value="">Selecione Matéria</option>
                                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                  <select className="glass-input p-3 rounded-lg flex-1" value={manageQTopic} onChange={e => setManageQTopic(e.target.value)}>
                                      <option value="">Selecione Tópico</option>
                                      {manageQSubject && topics[manageQSubject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                              </div>

                              <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2">
                                  {filteredQuestions.map(q => (
                                      <div key={q.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-xl flex items-center justify-between hover:bg-slate-900/80 transition-colors">
                                          <div className="flex-1 min-w-0 pr-4">
                                              <p className="text-white text-sm truncate font-medium">{q.text}</p>
                                              <p className="text-xs text-slate-500 mt-1">{q.subjectId} • {q.topic} • {q.difficulty}</p>
                                          </div>
                                          <div className="flex gap-2">
                                              <button onClick={() => handleEditItem(q, 'question')} className="p-2 hover:bg-yellow-500/10 text-slate-400 hover:text-yellow-500 rounded-lg transition-colors"><Pencil size={18} /></button>
                                              <button onClick={() => handleDeleteItem(q.path)} className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                          </div>
                                      </div>
                                  ))}
                                  {filteredQuestions.length === 0 && <p className="text-center text-slate-500 py-8">Nenhuma questão carregada. Selecione os filtros.</p>}
                              </div>
                          </div>
                      )}

                      {/* Simulation Manager */}
                      {contentTab === 'simulation' && (
                          <div className="glass-card p-6 rounded-2xl">
                              <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2">
                                  {simulations.map(sim => (
                                      <div key={sim.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-xl flex items-center justify-between hover:bg-slate-900/80 transition-colors">
                                          <div className="flex-1 min-w-0 pr-4">
                                              <p className="text-white font-bold text-sm truncate">{sim.title}</p>
                                              <div className="flex gap-2 mt-1">
                                                 <span className={`text-[10px] px-2 rounded-full uppercase font-bold ${sim.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{sim.status}</span>
                                                 <span className="text-[10px] text-slate-500">{sim.questionIds?.length || 0} questões</span>
                                              </div>
                                          </div>
                                          <div className="flex gap-2">
                                              <button onClick={() => handleEditItem(sim, 'simulation')} className="p-2 hover:bg-yellow-500/10 text-slate-400 hover:text-yellow-500 rounded-lg transition-colors"><Pencil size={18} /></button>
                                              <button onClick={() => handleDeleteItem(`simulations/${sim.id}`)} className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* Lesson Manager */}
                      {contentTab === 'lesson' && (
                          <div className="glass-card p-6 rounded-2xl space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                  <select className="glass-input p-3 rounded-lg" value={manageLessonSubject} onChange={e => setManageLessonSubject(e.target.value)}>
                                      <option value="">Selecione Matéria</option>
                                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                  <select className="glass-input p-3 rounded-lg" value={manageLessonTopic} onChange={e => setManageLessonTopic(e.target.value)} disabled={!manageLessonSubject}>
                                      <option value="">Selecione Tópico</option>
                                      {manageLessonSubject && topics[manageLessonSubject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                              </div>

                              {manageLessonTopic && (
                                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                                      {topicLessons.map(l => (
                                          <div key={l.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-xl flex items-center justify-between hover:bg-slate-900/80 transition-colors">
                                              <div className="flex-1 min-w-0 pr-4">
                                                  <p className="text-white text-sm font-bold truncate">{l.title}</p>
                                                  <p className="text-xs text-slate-500 mt-1">Vídeo: {l.videoUrl}</p>
                                              </div>
                                              <div className="flex gap-2">
                                                  <button onClick={() => handleEditItem(l, 'lesson')} className="p-2 hover:bg-yellow-500/10 text-slate-400 hover:text-yellow-500 rounded-lg transition-colors"><Pencil size={18} /></button>
                                                  <button onClick={() => handleDeleteItem(`lessons/${manageLessonSubject}/${manageLessonTopic}/${l.id}`)} className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                              </div>
                                          </div>
                                      ))}
                                      {topicLessons.length === 0 && <p className="text-center text-slate-500">Nenhuma aula neste tópico.</p>}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}

      {/* --- FINANCE TAB --- */}
      {activeTab === 'finance' && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Solicitações de Recarga (PIX)</h3>
              <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                          <tr>
                              <th className="p-4 text-slate-400">Usuário</th>
                              <th className="p-4 text-slate-400">Valor</th>
                              <th className="p-4 text-slate-400">Data</th>
                              <th className="p-4 text-slate-400">Status</th>
                              <th className="p-4 text-slate-400 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {recharges.map(req => (
                              <tr key={req.id} className="hover:bg-white/5">
                                  <td className="p-4 text-white font-medium">{req.userDisplayName}</td>
                                  <td className="p-4 font-mono text-lg text-emerald-400">R$ {req.amount.toFixed(2)}</td>
                                  <td className="p-4 text-sm text-slate-500">{new Date(req.timestamp).toLocaleDateString()} {new Date(req.timestamp).toLocaleTimeString()}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                          req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                      }`}>{req.status}</span>
                                  </td>
                                  <td className="p-4 text-right">
                                      {req.status === 'pending' && (
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => handleProcessRecharge(req.id, 'approved')} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2 rounded transition-colors" title="Aprovar">
                                                  <CheckCircle size={18} />
                                              </button>
                                              <button onClick={() => handleProcessRecharge(req.id, 'rejected')} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded transition-colors" title="Rejeitar">
                                                  <XCircle size={18} />
                                              </button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                          {recharges.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma solicitação pendente.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
