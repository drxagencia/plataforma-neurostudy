
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan, LessonMaterial, Simulation, Lead } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon, PenTool, Link, FileText, LayoutList, Pencil, Eye, RefreshCw, Upload, Users, UserCheck, Calendar, Shield, BarChart3, TrendingUp, PieChart, DollarSign, Activity, X, Video, Target, Tag, Megaphone, Copy, AlertTriangle, MousePointerClick, Clock, ShoppingCart, User } from 'lucide-react';

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
          } else if (pid.includes('int')) {
              plan = 'intermediate';
              credits = 14;
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
    <div className="space-y-6 animate-slide-up pb-20 relative">
      
      {/* ACCESS MANAGEMENT MODAL (PATH 1 & 2) */}
      {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold text-white mb-1">
                      {targetLead ? `Aprovar Lead: ${targetLead.name}` : 'Cadastrar Aluno (Manual)'}
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">{targetLead ? 'Preencha os dados finais para liberar o acesso.' : 'Preencha os dados da venda externa (Kirvano).'}</p>
                  
                  <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                              <input 
                                className="w-full glass-input p-3 rounded-lg"
                                value={accessForm.displayName}
                                onChange={e => setAccessForm({...accessForm, displayName: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Email de Acesso</label>
                              <input 
                                className="w-full glass-input p-3 rounded-lg"
                                value={accessForm.email}
                                onChange={e => setAccessForm({...accessForm, email: e.target.value})}
                                placeholder="email@aluno.com"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Senha Provisória</label>
                              <input 
                                className="w-full glass-input p-3 rounded-lg"
                                value={accessForm.password}
                                onChange={e => setAccessForm({...accessForm, password: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Plano</label>
                              <select 
                                className="w-full glass-input p-3 rounded-lg"
                                value={accessForm.plan}
                                onChange={e => setAccessForm({...accessForm, plan: e.target.value as UserPlan})}
                              >
                                  <option value="basic">Básico</option>
                                  <option value="intermediate">Intermediário</option>
                                  <option value="advanced">Avançado (Pro)</option>
                                  <option value="admin">Admin</option>
                              </select>
                          </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl space-y-4 border border-white/5">
                          <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2"><SettingsIcon size={14}/> Configurações do Plano</h4>
                          
                          <div className="grid grid-cols-3 gap-4">
                              <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Créd. Redação</label>
                                  <input 
                                    type="number"
                                    className="w-full glass-input p-2 rounded-lg text-sm"
                                    value={accessForm.essayCredits}
                                    onChange={e => setAccessForm({...accessForm, essayCredits: parseInt(e.target.value)})}
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Saldo IA (R$)</label>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full glass-input p-2 rounded-lg text-sm"
                                    value={accessForm.balance}
                                    onChange={e => setAccessForm({...accessForm, balance: parseFloat(e.target.value)})}
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Expiração</label>
                                  <input 
                                    type="date"
                                    className="w-full glass-input p-2 rounded-lg text-sm"
                                    value={accessForm.expiryDate}
                                    onChange={e => setAccessForm({...accessForm, expiryDate: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>
                      
                      {targetLead && (
                          <div className="p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
                              <p className="text-xs text-yellow-200">Info do Pagamento: {targetLead.contact}</p>
                              <p className="text-xs text-yellow-200">Plano Solicitado: {targetLead.planId}</p>
                          </div>
                      )}
                  </div>

                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white px-3">Cancelar</button>
                      <button onClick={handleSubmitAccess} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                          {loading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                          {targetLead ? 'Aprovar e Criar' : 'Cadastrar Aluno'}
                      </button>
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
          {['leads', 'users', 'content', 'finance', 'config', 'metrics', 'traffic'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 font-bold text-sm uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-white'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

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

              {/* View Toggle */}
              {contentTab !== 'import' && (
                  <div className="flex justify-end gap-2 mb-4">
                      <button onClick={() => setViewMode('create')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'create' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Criar Novo</button>
                      <button onClick={() => setViewMode('manage')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'manage' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Gerenciar</button>
                  </div>
              )}

              {/* --- IMPORT TAB --- */}
              {contentTab === 'import' && (
                  <div className="glass-card p-6 rounded-2xl">
                      <h3 className="font-bold text-white mb-4">Importação em Massa</h3>
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <select className="glass-input p-3 rounded-lg" value={importCategory} onChange={e => setImportCategory(e.target.value)}>
                                  <option value="regular">Regular</option>
                                  <option value="military">Militar</option>
                              </select>
                              <select className="glass-input p-3 rounded-lg" value={importType} onChange={e => setImportType(e.target.value as any)}>
                                  <option value="question">Questões</option>
                                  <option value="lesson">Aulas</option>
                              </select>
                          </div>
                          <textarea 
                            className="w-full h-64 glass-input p-4 rounded-xl font-mono text-xs" 
                            placeholder={importType === 'question' ? "ID_MATERIA:TOPICO:SUBTOPICO:ENUNCIADO:IMG_URL:A:B:C:D:EXPLICAÇÃO:CORRETA_INDEX" : "ID_MATERIA:TOPICO:TITULO:URL:DURACAO"}
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                          />
                          <p className="text-xs text-slate-500">
                              {importType === 'question' 
                                ? "Formato: ID:TOPICO:SUBTOPICO:TEXTO:IMG(ou NULL):OPT1:OPT2:OPT3:OPT4:EXPL:INDEX(0-3)" 
                                : "Formato: ID:TOPICO:TITULO:URL(ou NULL):DURACAO"}
                          </p>
                          <button onClick={handleBulkImport} disabled={isImporting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                              {isImporting ? <Loader2 className="animate-spin" /> : <Upload size={18}/>} Importar
                          </button>
                      </div>
                  </div>
              )}

              {/* --- VIEW MODE: CREATE / EDIT --- */}
              {viewMode === 'create' && contentTab !== 'import' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                      <div className="lg:col-span-2 space-y-6">
                          <div className={`glass-card p-6 rounded-2xl ${isEditing ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : ''}`}>
                             
                             {/* Subject Form */}
                             {contentTab === 'subject' && (
                                 <div className="space-y-4">
                                     <input className="w-full glass-input p-3 rounded-lg" placeholder="Nome da Matéria" value={contentForm.sName} onChange={e => setContentForm({...contentForm, sName: e.target.value})} />
                                     <div className="grid grid-cols-2 gap-4">
                                         <select className="glass-input p-3 rounded-lg" value={contentForm.sIcon} onChange={e => setContentForm({...contentForm, sIcon: e.target.value})}>
                                             <option value="BookOpen">BookOpen</option>
                                             <option value="Calculator">Calculator</option>
                                             <option value="Beaker">Beaker</option>
                                             <option value="Microscope">Microscope</option>
                                             <option value="Globe">Globe</option>
                                             <option value="Zap">Zap (Física)</option>
                                             <option value="Target">Target (Militar)</option>
                                         </select>
                                         <select className="glass-input p-3 rounded-lg" value={contentForm.sColor} onChange={e => setContentForm({...contentForm, sColor: e.target.value})}>
                                             <option value="text-blue-400">Azul</option>
                                             <option value="text-red-400">Vermelho</option>
                                             <option value="text-green-400">Verde</option>
                                             <option value="text-yellow-400">Amarelo</option>
                                             <option value="text-purple-400">Roxo</option>
                                         </select>
                                     </div>
                                     <select className="w-full glass-input p-3 rounded-lg" value={contentForm.sCategory} onChange={e => setContentForm({...contentForm, sCategory: e.target.value})}>
                                         <option value="regular">Regular</option>
                                         <option value="military">Militar</option>
                                     </select>
                                 </div>
                             )}
                             
                             {contentTab !== 'subject' && (
                                  <div className="space-y-4">
                                      {/* Simulation Form */}
                                      {contentTab === 'simulation' && (
                                          <div className="space-y-4">
                                              <input className="w-full glass-input p-3 rounded-lg" placeholder="Título do Simulado" value={simForm.title} onChange={e => setSimForm({...simForm, title: e.target.value})} />
                                              <textarea className="w-full glass-input p-3 rounded-lg" placeholder="Descrição" value={simForm.description} onChange={e => setSimForm({...simForm, description: e.target.value})} />
                                              <div className="grid grid-cols-2 gap-4">
                                                  <input type="number" className="glass-input p-3 rounded-lg" placeholder="Duração (min)" value={simForm.duration} onChange={e => setSimForm({...simForm, duration: parseInt(e.target.value)})} />
                                                  <select className="glass-input p-3 rounded-lg" value={simForm.status} onChange={e => setSimForm({...simForm, status: e.target.value})}>
                                                      <option value="open">Aberto</option>
                                                      <option value="closed">Fechado</option>
                                                      <option value="coming_soon">Em Breve</option>
                                                  </select>
                                              </div>
                                              <div className="p-4 bg-slate-900 rounded-xl border border-white/10">
                                                  <p className="text-xs text-slate-400 mb-2">Selecione questões na lista ao lado.</p>
                                                  <p className="text-emerald-400 font-bold">{simForm.selectedQuestionIds.length} Questões selecionadas</p>
                                              </div>
                                          </div>
                                      )}

                                      {/* Tag Input for Lessons and Questions */}
                                      {(contentTab === 'lesson' || contentTab === 'question') && (
                                          <div className="flex gap-2">
                                              <input className="flex-1 glass-input p-3 rounded-lg text-sm" placeholder="Tag (Opcional, ex: REVISÃO)" value={contentForm.tagText} onChange={e => setContentForm({...contentForm, tagText: e.target.value})} />
                                              <select className="glass-input p-3 rounded-lg text-sm w-32" value={contentForm.tagColor} onChange={e => setContentForm({...contentForm, tagColor: e.target.value})}>
                                                  <option value="indigo">Indigo</option>
                                                  <option value="emerald">Verde</option>
                                                  <option value="red">Vermelho</option>
                                                  <option value="yellow">Amarelo</option>
                                                  <option value="blue">Azul</option>
                                              </select>
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
                                            <input className="w-full glass-input p-3 rounded-lg" placeholder="URL da Imagem (Opcional - NÃO USAR BASE64)" value={contentForm.qImageUrl} onChange={e => setContentForm({...contentForm, qImageUrl: e.target.value})} />
                                            
                                            <div className="space-y-2">
                                                {contentForm.qOptions.map((opt, i) => (
                                                    <div key={i} className="flex gap-2 items-center">
                                                        <input type="radio" name="correct" checked={contentForm.qCorrect === i} onChange={() => setContentForm({...contentForm, qCorrect: i})} />
                                                        <input className="flex-1 glass-input p-2 rounded-lg text-sm" placeholder={`Alternativa ${i+1}`} value={opt} onChange={e => {
                                                            const newOpts = [...contentForm.qOptions];
                                                            newOpts[i] = e.target.value;
                                                            setContentForm({...contentForm, qOptions: newOpts});
                                                        }} />
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <textarea className="w-full glass-input p-3 rounded-lg text-sm" placeholder="Explicação do Gabarito" value={contentForm.qExplanation} onChange={e => setContentForm({...contentForm, qExplanation: e.target.value})} />
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
                                                     
                                                     {/* Materials */}
                                                     <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                                         <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Materiais</label>
                                                         <div className="flex gap-2 mb-2">
                                                             <input className="flex-1 glass-input p-2 text-sm rounded" placeholder="Título" value={currentMaterial.title} onChange={e => setCurrentMaterial({...currentMaterial, title: e.target.value})} />
                                                             <input className="flex-1 glass-input p-2 text-sm rounded" placeholder="URL" value={currentMaterial.url} onChange={e => setCurrentMaterial({...currentMaterial, url: e.target.value})} />
                                                             <button onClick={addMaterial} className="p-2 bg-emerald-600 text-white rounded"><Plus size={16}/></button>
                                                         </div>
                                                         <div className="space-y-1">
                                                             {materials.map((m, i) => (
                                                                 <div key={i} className="flex justify-between items-center text-sm p-2 bg-white/5 rounded">
                                                                     <span>{m.title}</span>
                                                                     <button onClick={() => removeMaterial(i)} className="text-red-400"><X size={14}/></button>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     </div>
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

                                             {/* Positioning - Insert After... */}
                                             {!isEditing && (
                                                 <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                                     <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Posição (Ordem)</label>
                                                     <select 
                                                        className="w-full glass-input p-3 rounded-lg text-sm"
                                                        value={contentForm.lInsertAfterId}
                                                        onChange={e => setContentForm({...contentForm, lInsertAfterId: e.target.value})}
                                                     >
                                                         <option value="end">Ao Final (Padrão)</option>
                                                         <option value="start">No Início</option>
                                                         {createModeExistingLessons
                                                            .filter(item => item.topic === contentForm.topicName)
                                                            .map(item => (
                                                                <option key={item.lesson.id} value={item.lesson.id}>Após: {item.lesson.title}</option>
                                                            ))
                                                         }
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

                      {/* Right Panel: Preview or List for Create Mode */}
                      <div className="space-y-6">
                          {/* If Simulation, show question picker logic */}
                          {contentTab === 'simulation' && (
                              <div className="glass-card p-6 rounded-2xl h-full flex flex-col">
                                  <h3 className="font-bold text-white mb-4">Adicionar Questões</h3>
                                  <div className="grid grid-cols-2 gap-2 mb-4">
                                      <select className="glass-input p-2 rounded text-xs" value={simFilter.subject} onChange={e => setSimFilter({...simFilter, subject: e.target.value})}>
                                          <option value="">Matéria</option>
                                          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                      </select>
                                      <select className="glass-input p-2 rounded text-xs" value={simFilter.topic} onChange={e => setSimFilter({...simFilter, topic: e.target.value})}>
                                          <option value="">Tópico</option>
                                          {simFilter.subject && topics[simFilter.subject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                      {filteredQuestions.map((q, i) => (
                                          <div key={i} onClick={() => q.id && toggleQuestionInSim(q.id)} className={`p-2 rounded border cursor-pointer text-xs ${simForm.selectedQuestionIds.includes(q.id!) ? 'bg-emerald-900/30 border-emerald-500 text-white' : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                                              <p className="line-clamp-2">{q.text}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                          {/* If not sim, just show info */}
                          {contentTab !== 'simulation' && (
                              <div className="glass-card p-6 rounded-2xl bg-indigo-900/10 border-indigo-500/20 text-center">
                                  <p className="text-indigo-300 text-sm">Preencha o formulário para adicionar conteúdo ao banco de dados.</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {/* --- VIEW MODE: MANAGE --- */}
              {viewMode === 'manage' && contentTab !== 'import' && (
                  <div className="space-y-6 animate-fade-in">
                      {/* Filter Bar */}
                      <div className="glass-card p-4 rounded-xl flex gap-4 flex-wrap">
                          {contentTab === 'question' && (
                              <select className="glass-input p-2 rounded-lg text-sm" value={manageQCategory} onChange={e => setManageQCategory(e.target.value)}>
                                  <option value="regular">Regular</option>
                                  <option value="military">Militar</option>
                              </select>
                          )}
                          {(contentTab === 'question' || contentTab === 'lesson') && (
                              <>
                                <select className="glass-input p-2 rounded-lg text-sm" value={contentTab === 'question' ? manageQSubject : manageLessonSubject} onChange={e => contentTab === 'question' ? setManageQSubject(e.target.value) : setManageLessonSubject(e.target.value)}>
                                    <option value="">Matéria</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select className="glass-input p-2 rounded-lg text-sm" value={contentTab === 'question' ? manageQTopic : manageLessonTopic} onChange={e => contentTab === 'question' ? setManageQTopic(e.target.value) : setManageLessonTopic(e.target.value)}>
                                    <option value="">Tópico</option>
                                    {topics[contentTab === 'question' ? manageQSubject : manageLessonSubject]?.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </>
                          )}
                      </div>

                      {/* List */}
                      <div className="space-y-2">
                          {contentTab === 'question' && filteredQuestions.map((q, i) => (
                              <div key={i} className="glass-card p-4 rounded-xl flex justify-between items-center group">
                                  <p className="text-sm text-slate-300 line-clamp-1 flex-1">{q.text}</p>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEditItem(q, 'question')} className="p-2 bg-blue-600 rounded text-white"><Pencil size={14}/></button>
                                      <button onClick={() => handleDeleteItem(q.path)} className="p-2 bg-red-600 rounded text-white"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                          ))}
                          {contentTab === 'lesson' && topicLessons.map((l, i) => (
                              <div key={i} className="glass-card p-4 rounded-xl flex justify-between items-center group">
                                  <span className="text-white text-sm font-bold">{i+1}. {l.title}</span>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEditItem(l, 'lesson')} className="p-2 bg-blue-600 rounded text-white"><Pencil size={14}/></button>
                                      <button onClick={() => handleDeleteItem(`lessons/${manageLessonSubject}/${manageLessonTopic}/${l.id}`)} className="p-2 bg-red-600 rounded text-white"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                          ))}
                          {contentTab === 'simulation' && simulations.map(s => (
                              <div key={s.id} className="glass-card p-4 rounded-xl flex justify-between items-center group">
                                  <div>
                                      <p className="text-white font-bold">{s.title}</p>
                                      <p className="text-xs text-slate-500">{s.status}</p>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEditItem(s, 'simulation')} className="p-2 bg-blue-600 rounded text-white"><Pencil size={14}/></button>
                                      <button onClick={() => handleDeleteItem(`simulations/${s.id}`)} className="p-2 bg-red-600 rounded text-white"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- LEADS TAB (Unified with User Creation) --- */}
      {activeTab === 'leads' && (
          <div className="space-y-6">
              <div className="flex justify-end mb-4">
                  <button 
                    onClick={() => handleOpenAccessModal(undefined)} 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-all"
                  >
                      <UserPlus size={18} /> Adicionar Aluno Manualmente
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.map(lead => (
                      <div key={lead.id} className={`glass-card p-5 rounded-2xl border-l-4 transition-all hover:bg-slate-900/60 ${lead.processed ? 'border-l-emerald-500' : 'border-l-yellow-500'}`}>
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-white truncate max-w-[150px]" title={lead.name}>{lead.name}</h4>
                              {lead.processed ? (
                                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">[ALUNO]</span>
                              ) : (
                                  <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">[LEAD]</span>
                              )}
                          </div>
                          
                          <p className="text-xs text-slate-400 mb-1 font-mono">{lead.planId} • {lead.billing}</p>
                          <p className="text-xs text-slate-500 mb-4">{new Date(lead.timestamp).toLocaleDateString()}</p>
                          
                          <div className="flex justify-between items-center border-t border-white/5 pt-3">
                              <span className="text-emerald-400 font-bold">R$ {lead.amount}</span>
                              {!lead.processed ? (
                                  <button onClick={() => handleOpenAccessModal(lead)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-900/20">
                                      Aprovar Acesso
                                  </button>
                              ) : (
                                  <button disabled className="px-3 py-1.5 bg-slate-800 text-slate-500 text-xs rounded font-bold cursor-default">
                                      Processado
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}
                  {leads.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">Nenhum lead encontrado.</p>}
              </div>
          </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
          <div className="space-y-6">
              <div className="flex gap-4 mb-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-white/5">
                      <p className="text-xs text-slate-500 uppercase">Total Usuários</p>
                      <p className="text-2xl font-bold text-white">{users.length}</p>
                  </div>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-slate-900 text-xs uppercase font-bold text-slate-500">
                          <tr>
                              <th className="p-4">Nome</th>
                              <th className="p-4">Email</th>
                              <th className="p-4">Plano</th>
                              <th className="p-4">XP</th>
                              <th className="p-4">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {users.map(u => (
                              <tr key={u.uid} className="hover:bg-slate-800/50">
                                  <td className="p-4 text-white font-medium">{u.displayName}</td>
                                  <td className="p-4">{u.email}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.plan === 'advanced' ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                                          {u.plan}
                                      </span>
                                  </td>
                                  <td className="p-4 font-mono">{u.xp}</td>
                                  <td className="p-4">
                                      <button onClick={() => handleEditUser(u)} className="p-2 hover:bg-white/10 rounded"><Pencil size={14}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- FINANCE TAB --- */}
      {activeTab === 'finance' && (
          <div className="space-y-6">
              <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-slate-900/50">
                      <h3 className="font-bold text-white">Solicitações de Recarga</h3>
                  </div>
                  <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-slate-900 text-xs uppercase font-bold text-slate-500">
                          <tr>
                              <th className="p-4">Usuário</th>
                              <th className="p-4">Valor</th>
                              <th className="p-4">Tipo</th>
                              <th className="p-4">Status</th>
                              <th className="p-4">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {recharges.map(r => (
                              <tr key={r.id}>
                                  <td className="p-4 text-white">{r.userDisplayName}</td>
                                  <td className="p-4 font-bold text-emerald-400">R$ {r.amount}</td>
                                  <td className="p-4 text-xs">{r.currencyType === 'CREDIT' ? 'Créditos Redação' : 'Saldo IA'}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                          {r.status}
                                      </span>
                                  </td>
                                  <td className="p-4 flex gap-2">
                                      {r.status === 'pending' && (
                                          <>
                                              <button onClick={() => handleProcessRecharge(r.id, 'approved')} className="p-1.5 bg-emerald-600 rounded text-white hover:bg-emerald-500"><CheckCircle size={14}/></button>
                                              <button onClick={() => handleProcessRecharge(r.id, 'rejected')} className="p-1.5 bg-red-600 rounded text-white hover:bg-red-500"><XCircle size={14}/></button>
                                          </>
                                      )}
                                  </td>
                              </tr>
                          ))}
                          {recharges.length === 0 && <tr><td colSpan={5} className="p-8 text-center">Nenhuma solicitação pendente.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- CONFIG / TRAFFIC TAB --- */}
      {(activeTab === 'config' || activeTab === 'traffic') && (
          <div className="max-w-2xl">
              <div className="glass-card p-6 rounded-2xl space-y-6">
                  <h3 className="font-bold text-white mb-4">Configurações de Tráfego & Checkout</h3>
                  
                  <div>
                      <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Script VSL (Embed)</label>
                      <textarea className="w-full glass-input p-3 rounded-xl h-32 font-mono text-xs" value={trafficConfig.vslScript} onChange={e => setTrafficConfig({...trafficConfig, vslScript: e.target.value})} placeholder="<iframe>...</iframe>" />
                  </div>

                  <div>
                      <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Link Checkout Mensal</label>
                      <input className="w-full glass-input p-3 rounded-xl" value={trafficConfig.checkoutLinkMonthly} onChange={e => setTrafficConfig({...trafficConfig, checkoutLinkMonthly: e.target.value})} placeholder="https://..." />
                  </div>

                  <div>
                      <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Link Checkout Anual</label>
                      <input className="w-full glass-input p-3 rounded-xl" value={trafficConfig.checkoutLinkYearly} onChange={e => setTrafficConfig({...trafficConfig, checkoutLinkYearly: e.target.value})} placeholder="https://..." />
                  </div>

                  <button onClick={handleSaveTraffic} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold">Salvar Configurações</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;
