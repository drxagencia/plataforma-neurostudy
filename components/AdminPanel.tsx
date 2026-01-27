
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan, LessonMaterial, Simulation, Lead } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon, PenTool, Link, FileText, LayoutList, Pencil, Eye, RefreshCw, Upload, Users, UserCheck, Calendar, Shield, BarChart3, TrendingUp, PieChart, DollarSign, Activity, X } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'content' | 'finance' | 'config' | 'metrics'>('leads');
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
  const [subtopics, setSubtopics] = useState<Record<string, string[]>>({});
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  
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
  const [isImporting, setIsImporting] = useState(false);

  // Lead Approval State
  const [approvingLead, setApprovingLead] = useState<Lead | null>(null);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('mudar123'); // Default password

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
      sCategory: 'regular'
  });

  // NEW: Helper State for existing lessons in Create Mode (for dropdown ordering)
  const [createModeExistingLessons, setCreateModeExistingLessons] = useState<Lesson[]>([]);

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
          DatabaseService.getLeads().then(l => setLeads(l));
      }
  }, [activeTab]);

  // LAZY LOAD: Finance
  useEffect(() => {
      if (activeTab === 'finance' || activeTab === 'metrics') {
          DatabaseService.getRechargeRequests().then(r => setRecharges(r));
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
      if (viewMode === 'create' && contentTab === 'lesson' && contentForm.subjectId && contentForm.topicName) {
          DatabaseService.getLessonsByTopic(contentForm.subjectId).then(res => {
              setCreateModeExistingLessons(res[contentForm.topicName] || []);
          });
      } else {
          setCreateModeExistingLessons([]);
      }
  }, [contentForm.subjectId, contentForm.topicName, viewMode, contentTab]);

  // --- ACTIONS ---

  const normalizeId = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  // Leads Approval Logic
  const handleOpenApproveModal = (lead: Lead) => {
      setApprovingLead(lead);
      setNewStudentEmail(''); 
      setNewStudentPassword('mudar123');
  };

  const handleApproveLead = async () => {
      if (!approvingLead || !newStudentEmail || !newStudentPassword) {
          alert("Preencha o email e senha para criar a conta.");
          return;
      }

      setLoading(true);
      try {
          const newUid = await AuthService.registerStudent(newStudentEmail, newStudentPassword, approvingLead.name);

          let userPlan: UserPlan = 'basic';
          const pid = approvingLead.planId.toLowerCase();
          if (pid.includes('adv') || pid.includes('pro')) userPlan = 'advanced';
          else if (pid.includes('int') || pid.includes('med')) userPlan = 'intermediate';

          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);

          await DatabaseService.createUserProfile(newUid, {
              displayName: approvingLead.name,
              email: newStudentEmail,
              plan: userPlan,
              subscriptionExpiry: expiryDate.toISOString().split('T')[0],
              xp: 0,
              balance: 0,
              essayCredits: 0
          });

          await DatabaseService.markLeadProcessed(approvingLead.id);

          alert(`Aluno ${approvingLead.name} aprovado com sucesso!`);
          setApprovingLead(null);
          
          const l = await DatabaseService.getLeads();
          setLeads(l);

      } catch (e: any) {
          console.error(e);
          alert(`Erro ao aprovar: ${e.message}`);
      } finally {
          setLoading(false);
      }
  };


  const handleImportQuestions = async () => {
      if (!importText.trim()) return alert("Cole o texto para importar.");
      setIsImporting(true);

      const lines = importText.split('\n').filter(l => l.trim().length > 0);
      let successCount = 0;
      let errorCount = 0;

      for (const line of lines) {
          try {
              const parts = line.split(':');
              if (parts.length < 11) {
                  console.error("Invalid line format:", line);
                  errorCount++;
                  continue;
              }

              const subjectId = normalizeId(parts[0]); 
              const topic = parts[1].trim(); 
              const subtopic = parts[2].trim(); 
              
              const correctAnswerRaw = parts[parts.length - 1].trim();
              const explanation = parts[parts.length - 2].trim();
              const alt4 = parts[parts.length - 3].trim();
              const alt3 = parts[parts.length - 4].trim();
              const alt2 = parts[parts.length - 5].trim();
              const alt1 = parts[parts.length - 6].trim();
              const imageUrl = parts[parts.length - 7].trim();
              
              const textParts = parts.slice(3, parts.length - 7);
              const text = textParts.join(':').trim();

              const q: Question = {
                  text,
                  imageUrl: imageUrl === 'NULL' || imageUrl === '' ? undefined : imageUrl,
                  options: [alt1, alt2, alt3, alt4],
                  correctAnswer: parseInt(correctAnswerRaw) || 0,
                  difficulty: 'medium', 
                  explanation: explanation === 'NULL' ? '' : explanation,
                  subjectId,
                  topic
              };

              await DatabaseService.createQuestion(importCategory, subjectId, topic, subtopic, q);
              successCount++;
          } catch (e) {
              console.error(e);
              errorCount++;
          }
      }

      alert(`Importação concluída!\nSucesso: ${successCount}\nErros: ${errorCount}`);
      setImportText('');
      setIsImporting(false);
  };

  const handleEditItem = (item: any, type: 'question' | 'lesson' | 'simulation' | 'subject') => {
      setIsEditing(true);
      setEditingId(item.id);
      setViewMode('create'); 

      if (type === 'question') {
          setContentForm({
              ...contentForm,
              category: manageQCategory, 
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
              subjectId: manageLessonSubject, 
              topicName: manageLessonTopic,
              lTitle: item.title,
              lUrl: item.videoUrl || '',
              lDuration: item.duration || '',
              lType: item.type || 'video',
              lExCategory: item.exerciseFilters?.category || 'regular',
              lExSubject: item.exerciseFilters?.subject || '',
              lExTopic: item.exerciseFilters?.topic || '',
              lExSubtopics: item.exerciseFilters?.subtopics || [] // Load existing subtopics
          });
          setMaterials(item.materials || []);
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
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = async (path: string) => {
      if (confirm("Tem certeza que deseja DELETAR este item? Essa ação não pode ser desfeita.")) {
          await DatabaseService.deletePath(path);
          alert("Item deletado.");
          if (contentTab === 'question') {
               const q = await DatabaseService.getQuestionsByPath(manageQCategory, manageQSubject, manageQTopic);
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
                    type: contentForm.lType,
                    // Conditional fields based on type
                    videoUrl: contentForm.lType === 'video' ? contentForm.lUrl : null,
                    duration: contentForm.lType === 'video' ? contentForm.lDuration : null,
                    materials: contentForm.lType === 'video' ? materials : null,
                    exerciseFilters: contentForm.lType === 'exercise_block' ? {
                        category: contentForm.lExCategory,
                        subject: contentForm.lExSubject,
                        topic: contentForm.lExTopic,
                        subtopics: contentForm.lExSubtopics // Save array
                    } : null
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

      // 2. CREATE MODE
      if (contentTab === 'subject') {
          if(!contentForm.sName) return alert("Nome obrigatório");
          const id = normalizeId(contentForm.sName);
          await DatabaseService.createSubject({
              id,
              name: contentForm.sName,
              iconName: contentForm.sIcon,
              color: contentForm.sColor,
              category: contentForm.sCategory as 'regular' | 'military'
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
              
              await DatabaseService.createQuestion(contentForm.category, contentForm.subjectId, contentForm.topicName, contentForm.subtopicName, newQuestion);
              alert("Questão criada com sucesso e estrutura atualizada!");
          } else {
              // CREATE LESSON (WITH ORDERING)
              if (!contentForm.lTitle) return;
              
              const newLesson: Lesson = {
                  title: contentForm.lTitle,
                  type: contentForm.lType as 'video' | 'exercise_block',
                  videoUrl: contentForm.lType === 'video' ? contentForm.lUrl : undefined,
                  duration: contentForm.lType === 'video' ? contentForm.lDuration : undefined,
                  materials: contentForm.lType === 'video' ? materials : undefined,
                  exerciseFilters: contentForm.lType === 'exercise_block' ? {
                      category: contentForm.lExCategory,
                      subject: contentForm.lExSubject,
                      topic: contentForm.lExTopic,
                      subtopics: contentForm.lExSubtopics // Save array
                  } : undefined
              };

              // Determine Order Position
              let targetIndex = -1; // -1 means append to end (default)
              if (contentForm.lInsertAfterId !== 'end') {
                  if (contentForm.lInsertAfterId === 'start') {
                      targetIndex = 0;
                  } else {
                      // Find index of the selected ID
                      const prevIndex = createModeExistingLessons.findIndex(l => l.id === contentForm.lInsertAfterId);
                      if (prevIndex !== -1) {
                          targetIndex = prevIndex + 1;
                      }
                  }
              }

              // Use new method that handles insertion and shifting
              await DatabaseService.createLessonWithOrder(contentForm.subjectId, contentForm.topicName, newLesson, targetIndex);
              
              alert("Aula criada com sucesso!");
              setMaterials([]);
              // Refresh dropdown list
              DatabaseService.getLessonsByTopic(contentForm.subjectId).then(res => setCreateModeExistingLessons(res[contentForm.topicName] || []));
          }
          resetForms();
      } catch (e) {
          console.error(e);
          alert("Erro ao salvar conteúdo.");
      }
  };

  const resetForms = () => {
      setSimForm({ title: '', description: '', duration: 60, type: 'official', status: 'open', subjects: [], selectedQuestionIds: [] });
      setContentForm(prev => ({
          ...prev, 
          qText: '', qImageUrl: '', lTitle: '', lUrl: '', lDuration: '', 
          qOptions: ['', '', '', ''], qExplanation: '', lType: 'video',
          lExSubtopics: [], lInsertAfterId: 'end'
      }));
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

  // Helper for toggle subtopics
  const toggleSubtopic = (sub: string) => {
      setContentForm(prev => {
          const exists = prev.lExSubtopics.includes(sub);
          if (exists) return { ...prev, lExSubtopics: prev.lExSubtopics.filter(s => s !== sub) };
          return { ...prev, lExSubtopics: [...prev.lExSubtopics, sub] };
      });
  };

  // User Management
  const handleEditUser = (user: UserProfile) => {
      setEditingUserId(user.uid);
      setNewUserMode(false);
      setUserDataForm({
          displayName: user.displayName,
          email: user.email,
          plan: user.plan,
          expiry: user.subscriptionExpiry,
          isAdmin: user.isAdmin || false
      });
  };

  const handleSaveUser = async () => {
    try {
        if (editingUserId) {
            await DatabaseService.updateUserPlan(editingUserId, userDataForm.plan as UserPlan, userDataForm.expiry);
            alert("Usuário atualizado!");
        } else if (newUserMode) {
            alert("Use a aba 'Novos Alunos' para criar contas com senha.");
        }
        setEditingUserId(null);
        setNewUserMode(false);
        // Refresh users
        const u = await DatabaseService.getUsersPaginated(50);
        setUsers(u);
    } catch(e) {
        alert("Erro ao salvar.");
    }
  };

  const handleProcessRecharge = async (id: string, status: 'approved' | 'rejected') => {
      if (!confirm(`Tem certeza que deseja marcar como ${status}?`)) return;
      await DatabaseService.processRecharge(id, status);
      const r = await DatabaseService.getRechargeRequests();
      setRecharges(r);
  };

  // --- METRICS CALCULATION LOGIC ---
  const metrics = useMemo(() => {
      if (!users.length && !leads.length) return null;

      const totalUsers = users.length;
      
      const planDistribution = { basic: 0, intermediate: 0, advanced: 0, admin: 0 };
      
      let essayUsersCount = 0;
      let aiRechargeUsersCount = 0;

      users.forEach(u => {
          if (planDistribution[u.plan] !== undefined) planDistribution[u.plan]++;
          if ((u as any).essays && Object.keys((u as any).essays).length > 0) essayUsersCount++;
          if (u.balance > 0) aiRechargeUsersCount++; 
      });

      const monthlyRevenue = { subscriptions: 0, essayCredits: 0, aiRecharges: 0, total: 0 };

      let monthlySubs = 0;
      let annualSubs = 0;
      let pixCount = 0;
      let cardCount = 0;

      leads.forEach(l => {
          const leadDate = new Date(l.timestamp);
          const leadMonth = leadDate.toISOString().slice(0, 7); 
          
          if (l.amount > 100) annualSubs++; 
          else monthlySubs++;

          if (l.paymentMethod?.toLowerCase().includes('pix')) pixCount++;
          else cardCount++;

          if (leadMonth === selectedMonth && (l.status === 'paid' || l.status === 'approved_access')) {
              monthlyRevenue.subscriptions += l.amount;
              monthlyRevenue.total += l.amount;
          }
      });

      recharges.forEach(r => {
          const rDate = new Date(r.timestamp);
          const rMonth = rDate.toISOString().slice(0, 7);

          if (rMonth === selectedMonth && r.status === 'approved') {
              if (r.type === 'CREDIT') {
                  monthlyRevenue.essayCredits += r.amount; 
              } else {
                  monthlyRevenue.aiRecharges += r.amount;
              }
              monthlyRevenue.total += r.amount;
          }
      });

      return {
          planDistribution,
          subscriptions: {
              monthly: monthlySubs,
              annual: annualSubs,
              monthlyPercent: ((monthlySubs / (monthlySubs + annualSubs || 1)) * 100).toFixed(1),
              annualPercent: ((annualSubs / (monthlySubs + annualSubs || 1)) * 100).toFixed(1)
          },
          payments: {
              pixPercent: ((pixCount / (pixCount + cardCount || 1)) * 100).toFixed(1),
              cardPercent: ((cardCount / (pixCount + cardCount || 1)) * 100).toFixed(1)
          },
          usage: {
              essayPercent: ((essayUsersCount / totalUsers || 1) * 100).toFixed(1),
              aiRechargePercent: ((aiRechargeUsersCount / totalUsers || 1) * 100).toFixed(1),
          },
          revenue: monthlyRevenue
      };
  }, [users, leads, recharges, selectedMonth]);


  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-slide-up pb-20 relative">
      
      {/* ... (Approving Lead and Edit User Modals preserved) ... */}
      {approvingLead && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                  <h3 className="text-2xl font-bold text-white mb-4">Aprovar Aluno</h3>
                  
                  <div className="space-y-4 mb-6">
                      <div className="bg-slate-800 p-4 rounded-xl border border-white/5">
                          <p className="text-slate-400 text-xs uppercase font-bold">Aluno</p>
                          <p className="text-white font-medium text-lg">{approvingLead.name}</p>
                          <div className="flex gap-4 mt-2">
                              <p className="text-slate-400 text-xs">Plano: <span className="text-indigo-400 font-bold uppercase">{approvingLead.planId}</span></p>
                              <p className="text-slate-400 text-xs">Valor: <span className="text-emerald-400 font-bold">R$ {approvingLead.amount}</span></p>
                          </div>
                      </div>

                      <div>
                          <label className="text-slate-400 text-xs font-bold uppercase mb-1 block">Email de Login</label>
                          <input 
                            type="email" 
                            className="w-full glass-input p-3 rounded-xl focus:border-indigo-500 transition-colors"
                            placeholder="email@aluno.com"
                            value={newStudentEmail}
                            onChange={(e) => setNewStudentEmail(e.target.value)}
                          />
                      </div>

                      <div>
                          <label className="text-slate-400 text-xs font-bold uppercase mb-1 block">Senha Provisória</label>
                          <input 
                            type="text" 
                            className="w-full glass-input p-3 rounded-xl focus:border-indigo-500 transition-colors"
                            value={newStudentPassword}
                            onChange={(e) => setNewStudentPassword(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button 
                        onClick={() => setApprovingLead(null)}
                        className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 font-bold"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleApproveLead}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                      >
                          {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Criar Acesso'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {(editingUserId || newUserMode) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                  <h3 className="text-2xl font-bold text-white mb-4">{newUserMode ? 'Criar Usuário' : 'Editar Usuário'}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-slate-400 font-bold uppercase">Nome</label>
                          <input className="w-full glass-input p-3 rounded-xl mt-1" value={userDataForm.displayName} onChange={e => setUserDataForm({...userDataForm, displayName: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs text-slate-400 font-bold uppercase">Plano</label>
                          <select className="w-full glass-input p-3 rounded-xl mt-1" value={userDataForm.plan} onChange={e => setUserDataForm({...userDataForm, plan: e.target.value as any})}>
                              <option value="basic">Básico (Gratuito)</option>
                              <option value="intermediate">Intermediário</option>
                              <option value="advanced">Avançado (Pro)</option>
                              <option value="admin">Administrador</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-400 font-bold uppercase">Vencimento Assinatura</label>
                          <input type="date" className="w-full glass-input p-3 rounded-xl mt-1" value={userDataForm.expiry} onChange={e => setUserDataForm({...userDataForm, expiry: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button onClick={() => {setEditingUserId(null); setNewUserMode(false);}} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 font-bold">Cancelar</button>
                      <button onClick={handleSaveUser} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Painel Administrativo</h2>
          <p className="text-slate-400">Controle total sobre usuários, finanças e conteúdo.</p>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
            {[
                { id: 'leads', label: 'Novos Alunos', icon: UserCheck },
                { id: 'users', label: 'Gerenciar Usuários', icon: Users },
                { id: 'metrics', label: 'Métricas', icon: BarChart3 },
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

      {/* --- METRICS TAB --- */}
      {activeTab === 'metrics' && metrics && (
          <div className="space-y-8 animate-fade-in">
              {/* ... (Metrics UI preserved) ... */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-card p-6 rounded-2xl border border-white/5 bg-indigo-900/10">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs text-indigo-300 font-bold uppercase">Receita Total ({selectedMonth})</p>
                          <DollarSign size={16} className="text-indigo-400" />
                      </div>
                      <p className="text-3xl font-bold text-white">R$ {metrics.revenue.total.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                          <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-lg text-xs p-1 text-slate-300"
                          />
                      </div>
                  </div>
                  {/* ... other metric cards ... */}
              </div>
              {/* ... charts ... */}
          </div>
      )}

      {/* --- LEADS TAB --- */}
      {activeTab === 'leads' && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="text-emerald-400" /> Aprovação de Alunos (Landing Page)
              </h3>
              
              <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                          <tr>
                              <th className="p-4 text-slate-400">Nome</th>
                              <th className="p-4 text-slate-400">Plano</th>
                              <th className="p-4 text-slate-400">Contato</th>
                              <th className="p-4 text-slate-400">Status</th>
                              <th className="p-4 text-slate-400">Data</th>
                              <th className="p-4 text-slate-400 text-right">Ação</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {leads.map(lead => (
                              <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                                  <td className="p-4 font-medium text-white">{lead.name}</td>
                                  <td className="p-4">
                                      <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs font-bold uppercase">{lead.planId}</span>
                                  </td>
                                  <td className="p-4 text-slate-400 text-sm">{lead.contact}</td>
                                  <td className="p-4">
                                      {lead.processed ? (
                                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Aprovado</span>
                                      ) : (
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${lead.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                            {lead.status === 'pending_pix' ? 'Pendente' : lead.status}
                                        </span>
                                      )}
                                  </td>
                                  <td className="p-4 text-slate-500 text-xs">
                                      {new Date(lead.timestamp).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-right">
                                      {!lead.processed && (
                                          <button 
                                            onClick={() => handleOpenApproveModal(lead)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                                          >
                                              Criar Acesso
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                          {leads.length === 0 && (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-500">Nenhum novo aluno encontrado.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="text-indigo-400" /> Base de Usuários
                  </h3>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                  {/* ... User Table Preserved ... */}
                  <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                          <tr>
                              <th className="p-4 text-slate-400">Usuário</th>
                              <th className="p-4 text-slate-400">Email</th>
                              <th className="p-4 text-slate-400">Plano Atual</th>
                              <th className="p-4 text-slate-400">Vencimento</th>
                              <th className="p-4 text-slate-400 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {users.map(u => (
                              <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                                  <td className="p-4 flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                          {u.displayName?.charAt(0) || 'U'}
                                      </div>
                                      <span className="text-white font-medium">{u.displayName}</span>
                                  </td>
                                  <td className="p-4 text-slate-400 text-sm">{u.email}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                          u.plan === 'admin' ? 'bg-red-500/20 text-red-400' :
                                          u.plan === 'advanced' ? 'bg-emerald-500/20 text-emerald-400' :
                                          u.plan === 'intermediate' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'
                                      }`}>
                                          {u.plan}
                                      </span>
                                  </td>
                                  <td className="p-4 text-slate-400 text-sm flex items-center gap-2">
                                      <Calendar size={14} />
                                      {u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td className="p-4 text-right">
                                      <button 
                                        onClick={() => handleEditUser(u)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors"
                                        title="Editar Assinatura"
                                      >
                                          <Pencil size={16} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- CONTENT TAB --- */}
      {activeTab === 'content' && (
          <div className="space-y-6">
              {/* Type Selector */}
              <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
                  <button onClick={() => {setContentTab('question'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'question' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><FilePlus size={18} /> Questões</button>
                  <button onClick={() => {setContentTab('lesson'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'lesson' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><Layers size={18} /> Aulas</button>
                  <button onClick={() => {setContentTab('subject'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'subject' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><PenTool size={18} /> Matérias</button>
                  <button onClick={() => {setContentTab('simulation'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'simulation' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><LayoutList size={18} /> Simulados</button>
                  <button onClick={() => {setContentTab('import'); setViewMode('create'); setIsEditing(false);}} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors whitespace-nowrap ${contentTab === 'import' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><Upload size={18} /> Importar</button>
              </div>

              {/* Toggle Create vs Manage */}
              {contentTab !== 'subject' && contentTab !== 'import' && (
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

              {/* --- IMPORT TAB --- */}
              {contentTab === 'import' && (
                  <div className="glass-card p-6 rounded-2xl animate-fade-in">
                      <h3 className="text-xl font-bold text-white mb-4">Importação em Massa</h3>
                      <div className="space-y-4">
                          {/* ... Import Form ... */}
                          <div>
                              <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Categoria de Destino</label>
                              <select 
                                  className="w-full glass-input p-3 rounded-xl"
                                  value={importCategory}
                                  onChange={e => setImportCategory(e.target.value)}
                              >
                                  <option value="regular">Regular / ENEM</option>
                                  <option value="military">Militar</option>
                              </select>
                          </div>
                          
                          <div>
                              <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Cole as questões abaixo</label>
                              <p className="text-[10px] text-slate-500 mb-2">Formato: MATERIA:SUBMATERIA:TOPICO:ENUNCIADO:IMAGEM:ALT1:ALT2:ALT3:ALT4:EXPLAIN:CORRECTANSWER(0-3)</p>
                              <textarea 
                                  className="w-full glass-input p-4 rounded-xl min-h-[300px] font-mono text-xs"
                                  placeholder="COLE AQUI..."
                                  value={importText}
                                  onChange={e => setImportText(e.target.value)}
                              />
                          </div>

                          <button 
                              onClick={handleImportQuestions}
                              disabled={isImporting || !importText.trim()}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl"
                          >
                              {isImporting ? <Loader2 className="animate-spin mx-auto"/> : 'Processar Importação'}
                          </button>
                      </div>
                  </div>
              )}

              {/* --- VIEW MODE: CREATE / EDIT --- */}
              {viewMode === 'create' && contentTab !== 'import' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                      <div className="lg:col-span-2 space-y-6">
                          <div className={`glass-card p-6 rounded-2xl ${isEditing ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : ''}`}>
                             
                             {contentTab === 'subject' && (
                                  <div className="space-y-4 animate-fade-in">
                                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Nome da Matéria (ex: Biologia)" value={contentForm.sName} onChange={e => setContentForm({...contentForm, sName: e.target.value})} />
                                      <select className="w-full glass-input p-3 rounded-lg" value={contentForm.sColor} onChange={e => setContentForm({...contentForm, sColor: e.target.value})}>
                                          <option value="text-blue-400">Azul</option>
                                          <option value="text-red-400">Vermelho</option>
                                          <option value="text-green-400">Verde</option>
                                          <option value="text-yellow-400">Amarelo</option>
                                          <option value="text-purple-400">Roxo</option>
                                          <option value="text-emerald-400">Esmeralda</option>
                                      </select>
                                      <div className="space-y-2">
                                          <label className="text-xs text-slate-400">Categoria</label>
                                          <select className="w-full glass-input p-3 rounded-lg" value={contentForm.sCategory} onChange={e => setContentForm({...contentForm, sCategory: e.target.value})}>
                                              <option value="regular">Regular (Escola/ENEM)</option>
                                              <option value="military">Militar (ESA, ESPCEX...)</option>
                                          </select>
                                      </div>
                                  </div>
                              )}
                              
                              {contentTab !== 'subject' && (
                                  <div className="space-y-4">
                                      {/* ... Simulation Form ... */}
                                      {contentTab === 'simulation' && (
                                         <div className="space-y-6">
                                             <div className="space-y-4">
                                                 <input className="w-full glass-input p-3 rounded-lg" placeholder="Título do Simulado" value={simForm.title} onChange={e => setSimForm({...simForm, title: e.target.value})} />
                                                 <textarea className="w-full glass-input p-3 rounded-lg" placeholder="Descrição" value={simForm.description} onChange={e => setSimForm({...simForm, description: e.target.value})} />
                                                 {/* ... rest of sim form ... */}
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
                                                         </div>
                                                     ))}
                                                 </div>
                                                 <p className="text-right text-xs text-indigo-400 mt-2">Selecionadas: {simForm.selectedQuestionIds.length}</p>
                                             </div>
                                         </div>
                                     )}

                                     {contentTab === 'question' && (
                                        <div className="space-y-4">
                                            {/* ... Question Form Fields ... */}
                                            <div className="mb-4">
                                                <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Categoria</label>
                                                <select className="w-full glass-input p-3 rounded-lg" value={contentForm.category} onChange={e => setContentForm({...contentForm, category: e.target.value})}>
                                                    <option value="regular">Regular / ENEM</option>
                                                    <option value="military">Militar</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <select className="w-full glass-input p-3 rounded-lg" value={contentForm.subjectId} onChange={(e) => setContentForm({...contentForm, subjectId: e.target.value})}>
                                                    <option value="">Matéria</option>
                                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                                <input className="w-full glass-input p-3 rounded-lg" placeholder="Tópico" value={contentForm.topicName} onChange={e => setContentForm({...contentForm, topicName: e.target.value})} list="topics-list" />
                                            </div>
                                            <input className="w-full glass-input p-3 rounded-lg" placeholder="Subtópico" value={contentForm.subtopicName} onChange={e => setContentForm({...contentForm, subtopicName: e.target.value})} list="subtopics-list" />
                                            
                                            <textarea className="w-full glass-input p-4 rounded-xl min-h-[100px]" placeholder="Enunciado..." value={contentForm.qText} onChange={e => setContentForm({...contentForm, qText: e.target.value})} />
                                            <input className="w-full glass-input p-3 rounded-lg" placeholder="URL Imagem" value={contentForm.qImageUrl} onChange={e => setContentForm({...contentForm, qImageUrl: e.target.value})} />
                                            
                                            {contentForm.qOptions.map((opt, idx) => (
                                              <div key={idx} className="flex gap-2 items-center">
                                                  <input type="radio" name="correct" checked={contentForm.qCorrect === idx} onChange={() => setContentForm({...contentForm, qCorrect: idx})} />
                                                  <input className="flex-1 glass-input p-2 rounded-lg" placeholder={`Alternativa ${idx + 1}`} value={opt} onChange={(e) => { const newOpts = [...contentForm.qOptions]; newOpts[idx] = e.target.value; setContentForm({...contentForm, qOptions: newOpts}); }} />
                                              </div>
                                            ))}
                                            <textarea className="w-full glass-input p-3 rounded-lg" placeholder="Explicação" value={contentForm.qExplanation} onChange={e => setContentForm({...contentForm, qExplanation: e.target.value})} />
                                        </div>
                                     )}

                                     {contentTab === 'lesson' && (
                                         <div className="space-y-4">
                                             <div className="grid grid-cols-2 gap-4">
                                                <select className="w-full glass-input p-3 rounded-lg" value={contentForm.subjectId} onChange={(e) => setContentForm({...contentForm, subjectId: e.target.value})}>
                                                    <option value="">Matéria</option>
                                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                                <input className="w-full glass-input p-3 rounded-lg" placeholder="Tópico" value={contentForm.topicName} onChange={e => setContentForm({...contentForm, topicName: e.target.value})} list="topics-list" />
                                             </div>
                                             
                                             <input className="w-full glass-input p-3 rounded-lg" placeholder="Título Aula" value={contentForm.lTitle} onChange={e => setContentForm({...contentForm, lTitle: e.target.value})} />
                                             
                                             {/* Type Switcher */}
                                             <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                                 <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Tipo de Conteúdo</label>
                                                 <div className="flex gap-2">
                                                     <button 
                                                        onClick={() => setContentForm({...contentForm, lType: 'video'})}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${contentForm.lType !== 'exercise_block' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                                     >
                                                         Vídeo Aula
                                                     </button>
                                                     <button 
                                                        onClick={() => setContentForm({...contentForm, lType: 'exercise_block'})}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${contentForm.lType === 'exercise_block' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                                     >
                                                         Bloco de Exercícios
                                                     </button>
                                                 </div>
                                             </div>

                                             {contentForm.lType !== 'exercise_block' ? (
                                                 <>
                                                     <input className="w-full glass-input p-3 rounded-lg" placeholder="URL YouTube" value={contentForm.lUrl} onChange={e => setContentForm({...contentForm, lUrl: e.target.value})} />
                                                     <input className="w-full glass-input p-3 rounded-lg" placeholder="Duração" value={contentForm.lDuration} onChange={e => setContentForm({...contentForm, lDuration: e.target.value})} />
                                                 </>
                                             ) : (
                                                 <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 space-y-3">
                                                     <p className="text-xs text-indigo-300">Este bloco redirecionará o aluno para o Banco de Questões com os filtros abaixo.</p>
                                                     
                                                     <select className="w-full glass-input p-3 rounded-lg" value={contentForm.lExCategory} onChange={e => setContentForm({...contentForm, lExCategory: e.target.value})}>
                                                        <option value="regular">Regular</option>
                                                        <option value="military">Militar</option>
                                                     </select>

                                                     <select className="w-full glass-input p-3 rounded-lg" value={contentForm.lExSubject} onChange={e => setContentForm({...contentForm, lExSubject: e.target.value})}>
                                                         <option value="">Matéria dos Exercícios</option>
                                                         {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                     </select>

                                                     <select className="w-full glass-input p-3 rounded-lg" value={contentForm.lExTopic} onChange={e => setContentForm({...contentForm, lExTopic: e.target.value})}>
                                                         <option value="">Tópico dos Exercícios</option>
                                                         {contentForm.lExSubject && topics[contentForm.lExSubject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                                     </select>

                                                     {/* Multi-Select Subtopics */}
                                                     <div>
                                                         <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Sub-Tópicos (Multi-seleção)</label>
                                                         <div className="flex flex-wrap gap-2 mb-2">
                                                             {contentForm.lExSubtopics.map(sub => (
                                                                 <span key={sub} className="bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                                     {sub}
                                                                     <button onClick={() => toggleSubtopic(sub)}><X size={12}/></button>
                                                                 </span>
                                                             ))}
                                                         </div>
                                                         
                                                         <div className="max-h-32 overflow-y-auto custom-scrollbar bg-slate-950 p-2 rounded-lg border border-white/5">
                                                             {contentForm.lExTopic && subtopics[contentForm.lExTopic]?.map(sub => (
                                                                 <div key={sub} onClick={() => toggleSubtopic(sub)} className={`p-2 rounded cursor-pointer text-xs flex items-center gap-2 ${contentForm.lExSubtopics.includes(sub) ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                                                                     <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${contentForm.lExSubtopics.includes(sub) ? 'bg-white border-white' : 'border-slate-500'}`}>
                                                                         {contentForm.lExSubtopics.includes(sub) && <div className="w-2 h-2 bg-indigo-600 rounded-[1px]" />}
                                                                     </div>
                                                                     {sub}
                                                                 </div>
                                                             ))}
                                                             {!contentForm.lExTopic && <p className="text-slate-500 text-xs">Selecione um tópico primeiro.</p>}
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}

                                             {/* Positioning Dropdown */}
                                             {!isEditing && (
                                                 <div>
                                                     <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Posição na Playlist</label>
                                                     <select 
                                                        className="w-full glass-input p-3 rounded-lg" 
                                                        value={contentForm.lInsertAfterId} 
                                                        onChange={e => setContentForm({...contentForm, lInsertAfterId: e.target.value})}
                                                        disabled={!contentForm.topicName}
                                                     >
                                                         <option value="end">Ao final (Padrão)</option>
                                                         <option value="start">No Início (Primeira Aula)</option>
                                                         {createModeExistingLessons.map((l, idx) => (
                                                             <option key={l.id} value={l.id}>Após: {idx + 1}. {l.title}</option>
                                                         ))}
                                                     </select>
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                  </div>
                              )}
                              
                              <button onClick={handleSaveContent} className={`w-full py-3 text-white font-bold rounded-xl transition-all mt-4 ${isEditing ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                                  {isEditing ? 'Atualizar Item' : `Criar ${contentTab === 'lesson' ? 'Aula' : contentTab === 'question' ? 'Questão' : contentTab === 'simulation' ? 'Simulado' : 'Matéria'}`}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* ... Manage Views Preserved ... */}
              {viewMode === 'manage' && (
                   <div className="space-y-6 animate-fade-in">
                         <div className="glass-card p-6 rounded-2xl">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                 {contentTab === 'question' && (
                                     <select className="glass-input p-2 rounded-lg" value={manageQCategory} onChange={e => setManageQCategory(e.target.value)}>
                                        <option value="regular">Regular</option>
                                        <option value="military">Militar</option>
                                     </select>
                                 )}
                                 <select className="glass-input p-2 rounded-lg" value={manageQSubject} onChange={e => setManageQSubject(e.target.value)}>
                                     <option value="">Matéria</option>
                                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                 </select>
                                 <select className="glass-input p-2 rounded-lg" value={manageQTopic} onChange={e => setManageQTopic(e.target.value)}>
                                     <option value="">Tópico</option>
                                     {manageQSubject && topics[manageQSubject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                             </div>

                             {contentTab === 'question' && (
                                <div className="space-y-2">
                                    {filteredQuestions.map(q => (
                                        <div key={q.id} className="p-3 bg-slate-900 rounded-lg flex justify-between items-center group">
                                            <span className="truncate flex-1 pr-4">{q.text}</span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditItem(q, 'question')} className="p-1 hover:bg-white/10 rounded"><Pencil size={16}/></button>
                                                <button onClick={() => handleDeleteItem(q.path)} className="p-1 hover:bg-red-900/50 text-red-400 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             )}
                         </div>
                   </div>
              )}
          </div>
      )}

      {/* ... Finance Tab Preserved ... */}
      {activeTab === 'finance' && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Solicitações de Recarga</h3>
              <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                          <tr>
                              <th className="p-4 text-slate-400">Usuário</th>
                              <th className="p-4 text-slate-400">Tipo</th>
                              <th className="p-4 text-slate-400">Valor/Qtd</th>
                              <th className="p-4 text-slate-400">Status</th>
                              <th className="p-4 text-slate-400 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {recharges.map(req => (
                              <tr key={req.id} className="hover:bg-white/5">
                                  <td className="p-4 text-white font-medium">{req.userDisplayName}</td>
                                  <td className="p-4 text-xs font-bold uppercase">{req.type === 'CREDIT' ? 'Créd. Redação' : 'Saldo IA'}</td>
                                  <td className="p-4 font-mono text-lg text-emerald-400">
                                      {req.type === 'CREDIT' ? `${req.quantityCredits} un` : `R$ ${req.amount.toFixed(2)}`}
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                          req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                      }`}>{req.status}</span>
                                  </td>
                                  <td className="p-4 text-right">
                                      {req.status === 'pending' && (
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => handleProcessRecharge(req.id, 'approved')} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2 rounded transition-colors">
                                                  <CheckCircle size={18} />
                                              </button>
                                              <button onClick={() => handleProcessRecharge(req.id, 'rejected')} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded transition-colors">
                                                  <XCircle size={18} />
                                              </button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
