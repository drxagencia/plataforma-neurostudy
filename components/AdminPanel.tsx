
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan, LessonMaterial, Simulation, Lead } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon, PenTool, Link, FileText, LayoutList, Pencil, Eye, RefreshCw, Upload, Users, UserCheck, Calendar, Shield, BarChart3, TrendingUp, PieChart, DollarSign, Activity, X, Video, Target, Tag, Megaphone, Copy, AlertTriangle, MousePointerClick, Clock, ShoppingCart } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'content' | 'finance' | 'config' | 'metrics' | 'traffic'>('leads');
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

  // ... (LAZY LOAD effects preserved) ...
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

  // --- ACTIONS --- (Preserved all existing actions: normalizeId, handleOpenApproveModal, handleApproveLead, handleBulkImport, handleSaveTraffic, handleEditItem, handleDeleteItem, handleSaveContent, resetForms, addMaterial, removeMaterial, toggleQuestionInSim, toggleSubtopic, handleEditUser, handleSaveUser, handleProcessRecharge)

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
              billingCycle: approvingLead.billing as 'monthly' | 'yearly', // Pass billing info
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


  const handleBulkImport = async () => {
      if (!importText.trim()) return alert("Cole o texto para importar.");
      setIsImporting(true);

      const lines = importText.split('\n').filter(l => l.trim().length > 0);
      let successCount = 0;
      let errorCount = 0;

      // 1. IMPORT LESSONS
      if (importType === 'lesson') {
          for (const line of lines) {
              try {
                  const parts = line.split(':');
                  // FORMAT: ID_MATERIA:TOPICO:TITULO:URL:DURACAO
                  // URL can be "NULL"
                  if (parts.length < 5) {
                      console.error("Invalid lesson format:", line);
                      errorCount++;
                      continue;
                  }

                  const subjectId = normalizeId(parts[0]);
                  const topic = parts[1].trim();
                  const title = parts[2].trim();
                  let urlRaw = parts[3].trim();
                  const duration = parts[4].trim();

                  // Treat NULL as undefined/empty, so admin can edit later
                  const videoUrl = (urlRaw.toLowerCase() === 'null' || urlRaw === '') ? undefined : urlRaw;

                  const lesson: Lesson = {
                      title,
                      type: 'video',
                      videoUrl: videoUrl, // Can be undefined
                      duration: duration,
                      materials: []
                  };

                  await DatabaseService.createLesson(subjectId, topic, lesson);
                  successCount++;
              } catch (e) {
                  console.error(e);
                  errorCount++;
              }
          }
      } 
      // 2. IMPORT QUESTIONS
      else {
          for (const line of lines) {
              try {
                  const parts = line.split(':');
                  if (parts.length < 11) {
                      console.error("Invalid question format:", line);
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
                  const imageUrlRaw = parts[parts.length - 7].trim();
                  
                  const textParts = parts.slice(3, parts.length - 7);
                  const text = textParts.join(':').trim();

                  // Robust NULL check for image: If "null" or "NULL" or empty, set to undefined so it's not saved in DB
                  let imageUrl = (imageUrlRaw.toLowerCase() === 'null' || imageUrlRaw === '') ? undefined : imageUrlRaw;
                  
                  // CHECK FOR BASE64
                  if (imageUrl && imageUrl.startsWith('data:')) {
                      console.warn("Base64 image skipped in import:", text);
                      imageUrl = undefined;
                  }

                  const q: Question = {
                      text,
                      imageUrl: imageUrl, // Will be string or undefined
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
      }

      // Finalize
      alert(`Importação concluída!\nSucesso: ${successCount}\nErros: ${errorCount}`);
      setImportText('');
      setIsImporting(false);
      // Reload Config to show new topics created during import
      fetchConfigData();
  };

  const handleSaveTraffic = async () => {
      try {
          await DatabaseService.saveTrafficSettings(trafficConfig);
          alert("Configurações de Tráfego Salvas!");
      } catch(e) {
          alert("Erro ao salvar.");
      }
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
              qExplanation: item.explanation || '',
              tagText: item.tag?.text || '',
              tagColor: item.tag?.color || 'indigo'
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
              lExSubtopics: item.exerciseFilters?.subtopics || [], // Load existing subtopics
              tagText: item.tag?.text || '',
              tagColor: item.tag?.color || 'indigo'
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
                if (contentForm.qImageUrl && contentForm.qImageUrl.startsWith('data:')) {
                    alert("ERRO CRÍTICO: Imagens coladas (Base64) estão proibidas. Use uma URL externa.");
                    return;
                }
                updateData = {
                    text: contentForm.qText,
                    imageUrl: contentForm.qImageUrl,
                    options: contentForm.qOptions,
                    correctAnswer: contentForm.qCorrect,
                    difficulty: contentForm.qDifficulty,
                    explanation: contentForm.qExplanation,
                    subjectId: contentForm.subjectId,
                    topic: contentForm.topicName,
                    tag: contentForm.tagText ? { text: contentForm.tagText, color: contentForm.tagColor } : null
                };
             } else if (contentTab === 'lesson') {
                updateData = {
                    title: contentForm.lTitle,
                    type: contentForm.lType,
                    // Conditional fields based on type
                    videoUrl: contentForm.lType === 'video' ? contentForm.lUrl : null,
                    duration: contentForm.lType === 'video' ? contentForm.lDuration : null,
                    materials: contentForm.lType === 'video' ? materials : null,
                    tag: contentForm.tagText ? { text: contentForm.tagText, color: contentForm.tagColor } : null,
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
              
              if (contentForm.qImageUrl && contentForm.qImageUrl.startsWith('data:')) {
                  alert("ERRO CRÍTICO: Imagens coladas (Base64) estão proibidas. Use uma URL externa.");
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
                  topic: contentForm.topicName,
                  tag: contentForm.tagText ? { text: contentForm.tagText, color: contentForm.tagColor as any } : undefined
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
                  tag: contentForm.tagText ? { text: contentForm.tagText, color: contentForm.tagColor as any } : undefined,
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
                      // Need to filter lessons by the CURRENT topic (contentForm.topicName)
                      // Because `createLessonWithOrder` works on that specific topic list.
                      const topicLessons = createModeExistingLessons.filter(i => i.topic === contentForm.topicName).map(i => i.lesson);
                      
                      const prevIndex = topicLessons.findIndex(l => l.id === contentForm.lInsertAfterId);
                      if (prevIndex !== -1) {
                          targetIndex = prevIndex + 1;
                      }
                  }
              }

              // Use new method that handles insertion and shifting
              await DatabaseService.createLessonWithOrder(contentForm.subjectId, contentForm.topicName, newLesson, targetIndex);
              
              alert("Aula criada com sucesso!");
              setMaterials([]);
              
              // Force refresh of topics/config to ensure the new topic appears in the dropdowns immediately
              await fetchConfigData();

              // Refresh dropdown list for ordering
              DatabaseService.getLessonsByTopic(contentForm.subjectId).then(res => {
                  const flattened: {lesson: Lesson, topic: string}[] = [];
                  Object.entries(res).forEach(([topic, lessons]) => {
                      lessons.forEach(l => flattened.push({ lesson: l, topic }));
                  });
                  setCreateModeExistingLessons(flattened);
              });
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
          lExSubtopics: [], lInsertAfterId: 'end',
          tagText: '', tagColor: 'indigo'
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

  // Safe accessor for current subtopics in exercise block
  const currentSubtopicsList = (contentForm.lExSubject && contentForm.lExTopic && subtopics[contentForm.lExSubject] && subtopics[contentForm.lExSubject][contentForm.lExTopic]) 
      ? subtopics[contentForm.lExSubject][contentForm.lExTopic] 
      : [];

  // Safe accessor for existing subtopics in question form (can use list from existing subtopics state)
  const questionSubtopicsList = (contentForm.subjectId && contentForm.topicName && subtopics[contentForm.subjectId] && subtopics[contentForm.subjectId][contentForm.topicName])
      ? subtopics[contentForm.subjectId][contentForm.topicName]
      : [];

  return (
    // ... (Outer UI omitted for brevity, logic follows same structure)
    <div className="space-y-6 animate-slide-up pb-20 relative">
      
      {/* ... (Approving Lead and Edit User Modals preserved) ... */}
      {/* ... (Header preserved) ... */}

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

              {/* ... (Toggle Create/Manage preserved) ... */}
              {/* ... (Import Tab preserved) ... */}

              {/* --- VIEW MODE: CREATE / EDIT --- */}
              {viewMode === 'create' && contentTab !== 'import' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                      <div className="lg:col-span-2 space-y-6">
                          <div className={`glass-card p-6 rounded-2xl ${isEditing ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : ''}`}>
                             
                             {/* ... (Subject Form preserved) ... */}
                             
                             {contentTab !== 'subject' && (
                                  <div className="space-y-4">
                                      {/* ... (Simulation Form preserved) ... */}

                                      {/* Tag Input for Lessons and Questions */}
                                      {/* ... (Tag input preserved) ... */}

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
                                                <datalist id="topics-list">
                                                    {contentForm.subjectId && topics[contentForm.subjectId]?.map(t => <option key={t} value={t} />)}
                                                </datalist>
                                            </div>
                                            
                                            {/* Updated Subtopic Input with Datalist */}
                                            <input 
                                                className="w-full glass-input p-3 rounded-lg" 
                                                placeholder="Subtópico (Ex: MRU)" 
                                                value={contentForm.subtopicName} 
                                                onChange={e => setContentForm({...contentForm, subtopicName: e.target.value})} 
                                                list="subtopics-list" 
                                            />
                                            <datalist id="subtopics-list">
                                                {questionSubtopicsList.map(st => <option key={st} value={st} />)}
                                            </datalist>
                                            
                                            <textarea className="w-full glass-input p-4 rounded-xl min-h-[100px]" placeholder="Enunciado..." value={contentForm.qText} onChange={e => setContentForm({...contentForm, qText: e.target.value})} />
                                            {/* ... (rest of question form) ... */}
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

                                                     {/* Multi-Select Subtopics with new Hierarchy */}
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
                                                             {currentSubtopicsList.length > 0 ? currentSubtopicsList.map(sub => (
                                                                 <div key={sub} onClick={() => toggleSubtopic(sub)} className={`p-2 rounded cursor-pointer text-xs flex items-center gap-2 ${contentForm.lExSubtopics.includes(sub) ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                                                                     <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${contentForm.lExSubtopics.includes(sub) ? 'bg-white border-white' : 'border-slate-500'}`}>
                                                                         {contentForm.lExSubtopics.includes(sub) && <div className="w-2 h-2 bg-indigo-600 rounded-[1px]" />}
                                                                     </div>
                                                                     {sub}
                                                                 </div>
                                                             )) : <p className="text-slate-500 text-xs">Selecione Matéria e Tópico primeiro.</p>}
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}

                                             {/* ... (Positioning preserved) ... */}
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

              {/* ... (Manage Views preserved) ... */}
          </div>
      )}
      {/* ... (Rest of Tabs preserved) ... */}
    </div>
  );
};

export default AdminPanel;
