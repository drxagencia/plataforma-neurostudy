
import React, { useState, useEffect } from 'react';
import { Subject, Lesson, Simulation, Question, LessonMaterial } from '../../types';
import { DatabaseService } from '../../services/databaseService';
import { 
  PlayCircle, FileQuestion, GraduationCap, LayoutGrid, Layers, PlusCircle, Edit, Trash2, BookOpen, Plus, Save, Image as ImageIcon, Sparkles, ArrowLeft, MoreVertical, FileText, List, X, Clock, AlertCircle
} from 'lucide-react';

type ContentSubTab = 'lms' | 'bank' | 'sims';

const AdminContent: React.FC = () => {
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>('lms');
  const [loading, setLoading] = useState(false);

  // LMS Navigation State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSub, setSelectedSub] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Data State
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [currentLessons, setCurrentLessons] = useState<Lesson[]>([]);

  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState<Partial<Lesson>>({ type: 'video', title: '', materials: [] });
  const [formMaterialUrl, setFormMaterialUrl] = useState('');
  const [formMaterialTitle, setFormMaterialTitle] = useState('');

  // Question Bank States
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<Question>>({
      text: '', options: ['', '', '', '', ''], correctAnswer: 0, difficulty: 'medium', category: 'regular'
  });
  const [qLoc, setQLoc] = useState({ subject: '', topic: '', subtopic: '' });

  // Sims State & Modal
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simForm, setSimForm] = useState<Partial<Simulation>>({});
  const [simQIds, setSimQIds] = useState(''); // Para gerenciar os IDs como texto separado por vírgula

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      try {
        const [subs, sims] = await Promise.all([
            DatabaseService.getSubjects(),
            DatabaseService.getSimulations()
        ]);
        setSubjects(subs);
        setSimulations(sims);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- NAVIGATION HANDLERS ---
  const handleOpenSubject = async (s: Subject) => {
      setSelectedSub(s);
      setSelectedTopic(null); // Reset topic
      setLoading(true);
      const data = await DatabaseService.getLessonsByTopic(s.id); // Returns Map<Topic, Lesson[]>
      setTopicsList(Object.keys(data));
      setLoading(false);
  };

  const handleOpenTopic = async (topic: string) => {
      if (!selectedSub) return;
      setSelectedTopic(topic);
      setLoading(true);
      const data = await DatabaseService.getLessonsByTopic(selectedSub.id);
      // Sort by order
      const lessons = (data[topic] || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCurrentLessons(lessons);
      setLoading(false);
  };

  // --- CRUD AULA HANDLERS ---
  const openNewLessonModal = () => {
      setLessonForm({ 
          type: 'video', 
          title: '', 
          order: currentLessons.length, // Auto-increment order
          materials: [],
          tag: { text: '', color: 'indigo' }
      });
      setShowLessonModal(true);
  };

  const openEditLessonModal = (lesson: Lesson) => {
      setLessonForm({ ...lesson });
      setShowLessonModal(true);
  };

  const handleAddMaterial = () => {
      if (!formMaterialTitle || !formMaterialUrl) return;
      const newMat: LessonMaterial = { title: formMaterialTitle, url: formMaterialUrl };
      setLessonForm(prev => ({ ...prev, materials: [...(prev.materials || []), newMat] }));
      setFormMaterialTitle('');
      setFormMaterialUrl('');
  };

  const handleRemoveMaterial = (idx: number) => {
      setLessonForm(prev => ({ 
          ...prev, 
          materials: (prev.materials || []).filter((_, i) => i !== idx) 
      }));
  };

  const handleSaveLesson = async () => {
      if (!selectedSub || !selectedTopic || !lessonForm.title) return;
      setLoading(true);
      const id = lessonForm.id || `l_${Date.now()}`;
      
      const finalData: Lesson = {
          ...lessonForm as Lesson,
          id
      };

      if (finalData.type === 'exercise_block') {
          if (!finalData.exerciseFilters) {
              finalData.exerciseFilters = {
                  category: selectedSub.category,
                  subject: selectedSub.id,
                  topic: selectedTopic
              };
          }
      }

      await DatabaseService.saveLesson(selectedSub.id, selectedTopic, id, finalData);
      await handleOpenTopic(selectedTopic);
      setShowLessonModal(false);
      setLoading(false);
  };

  const handleDeleteLesson = async (lessonId: string) => {
      if (!selectedSub || !selectedTopic || !confirm("Excluir item permanentemente?")) return;
      setLoading(true);
      await DatabaseService.deleteLesson(selectedSub.id, selectedTopic, lessonId);
      await handleOpenTopic(selectedTopic);
      setLoading(false);
  };

  // --- QUESTION HANDLERS ---
  const handleSaveQuestion = async () => {
      if (!qLoc.subject || !qLoc.topic || !qLoc.subtopic || !questionForm.text) {
          alert("Preencha todos os campos obrigatórios.");
          return;
      }
      setLoading(true);
      const qid = questionForm.id || `q_${Date.now()}`;
      const data = { ...questionForm, id: qid, subjectId: qLoc.subject, topic: qLoc.topic, subtopic: qLoc.subtopic } as Question;
      await DatabaseService.saveQuestion(questionForm.category || 'regular', qLoc.subject, qLoc.topic, qLoc.subtopic, qid, data);
      setShowQuestionModal(false);
      setLoading(false);
      alert("Questão salva!");
  };

  // --- SIMULATION HANDLERS (UPDATED) ---
  const openNewSimModal = () => {
      setSimForm({
          title: '',
          description: '',
          durationMinutes: 90,
          type: 'training',
          status: 'coming_soon',
          questionIds: []
      });
      setSimQIds('');
      setShowSimModal(true);
  };

  const openEditSimModal = (sim: Simulation) => {
      setSimForm(sim);
      setSimQIds(sim.questionIds?.join(', ') || '');
      setShowSimModal(true);
  };

  const handleSaveSim = async () => {
      if (!simForm.title || !simForm.durationMinutes) {
          alert("Título e duração são obrigatórios");
          return;
      }
      setLoading(true);
      
      const id = simForm.id || `sim_${Date.now()}`;
      // Parse IDs from text area
      const parsedIds = simQIds.split(',').map(s => s.trim()).filter(s => s.length > 0);

      const finalSim: Simulation = {
          ...simForm as Simulation,
          id,
          questionIds: parsedIds
      };

      await DatabaseService.saveSimulation(id, finalSim);
      await fetchData(); // Refresh list
      setShowSimModal(false);
      setLoading(false);
  };

  const handleDeleteSim = async (id: string) => {
      if (!confirm("Excluir simulado?")) return;
      setLoading(true);
      await DatabaseService.deleteSimulation(id);
      fetchData();
      setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
        {/* Navegação Sub-Aba */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
                { id: 'lms', label: 'Grade de Aulas', icon: PlayCircle, color: 'text-indigo-400' },
                { id: 'bank', label: 'Banco de Questões', icon: FileQuestion, color: 'text-emerald-400' },
                { id: 'sims', label: 'Simulados', icon: GraduationCap, color: 'text-purple-400' }
            ].map(sub => (
                <button 
                  key={sub.id} 
                  onClick={() => setContentSubTab(sub.id as any)}
                  className={`p-6 rounded-3xl border transition-all text-left flex items-center gap-4 ${contentSubTab === sub.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}
                >
                    <sub.icon className={sub.color} size={32} />
                    <div>
                        <p className={`text-sm font-black uppercase tracking-widest ${contentSubTab === sub.id ? 'text-white' : 'text-slate-500'}`}>{sub.label}</p>
                        <p className="text-[10px] text-slate-400">Clique para gerenciar</p>
                    </div>
                </button>
            ))}
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 border-white/10 relative overflow-hidden min-h-[500px]">
            
            {/* === GERENCIADOR LMS === */}
            {contentSubTab === 'lms' && (
                <div className="animate-in fade-in duration-300">
                    {!selectedSub && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {subjects.map(s => (
                                <button 
                                  key={s.id} 
                                  onClick={() => handleOpenSubject(s)}
                                  className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col items-center gap-4 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all group"
                                >
                                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-lg">
                                        <BookOpen size={28}/>
                                    </div>
                                    <span className="text-xs font-black text-slate-300 uppercase text-center tracking-tight">{s.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedSub && !selectedTopic && (
                        <div className="space-y-6">
                            <button onClick={() => setSelectedSub(null)} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm">
                                <ArrowLeft size={16}/> Voltar para Disciplinas
                            </button>
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2"><LayoutGrid size={24} className="text-indigo-400" /> {selectedSub.name} <span className="text-slate-500 text-lg">/ Playlists</span></h3>
                            </div>
                            
                            {topicsList.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {topicsList.map(topic => (
                                        <button key={topic} onClick={() => handleOpenTopic(topic)} className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl text-left hover:border-indigo-500/50 hover:bg-slate-800 transition-all flex items-center justify-between group">
                                            <span className="font-bold text-slate-200">{topic}</span>
                                            <Layers size={18} className="text-slate-500 group-hover:text-indigo-400"/>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-500">
                                    <Sparkles className="mx-auto mb-4 opacity-20" size={40} />
                                    <p>Nenhuma playlist encontrada. Adicione uma aula para criar.</p>
                                    <button onClick={() => { setSelectedTopic('Novo Tópico'); openNewLessonModal(); }} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Criar Primeira Aula</button>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedSub && selectedTopic && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedTopic(null)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"><ArrowLeft size={20}/></button>
                                    <div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase font-bold tracking-wider">
                                            <span>{selectedSub.name}</span> <span className="text-slate-700">/</span> <span>{selectedTopic}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Gerenciar Conteúdo</h3>
                                    </div>
                                </div>
                                <button onClick={openNewLessonModal} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-indigo-500 shadow-xl transition-all">
                                    <PlusCircle size={18}/> NOVA AULA / BLOCO
                                </button>
                            </div>

                            <div className="space-y-2">
                                {currentLessons.map((l, i) => (
                                    <div key={l.id || i} className="p-4 bg-slate-900/30 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-slate-900/60 transition-all group">
                                        <div className="flex flex-col items-center justify-center w-8 h-8 bg-black/40 rounded text-slate-500 text-xs font-mono font-bold">
                                            {l.order !== undefined ? l.order : i}
                                        </div>
                                        <div className={`p-3 rounded-lg ${l.type === 'exercise_block' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                            {l.type === 'exercise_block' ? <FileQuestion size={20}/> : <PlayCircle size={20}/>}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                                {l.title} 
                                                {l.tag && <span className={`text-[9px] px-2 py-0.5 rounded bg-${l.tag.color}-500/20 text-${l.tag.color}-400 border border-${l.tag.color}-500/30 uppercase`}>{l.tag.text}</span>}
                                            </h4>
                                            <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
                                                <span>{l.type === 'video' ? `Duração: ${l.duration}` : 'Bloco de Prática'}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditLessonModal(l)} className="p-2 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"><Edit size={16}/></button>
                                            <button onClick={() => handleDeleteLesson(l.id!)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                                {currentLessons.length === 0 && (
                                    <div className="p-10 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                                        <List className="mx-auto mb-2 opacity-20" size={32}/>
                                        <p>Lista vazia. Adicione o primeiro item.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* === GERENCIADOR DE QUESTÕES === */}
            {contentSubTab === 'bank' && (
                <div className="animate-in fade-in duration-300 space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-white">Banco de Exercícios</h3>
                            <p className="text-slate-500 text-sm">Adicione questões categorizadas ao sistema.</p>
                        </div>
                        <button onClick={() => { setQuestionForm({ text: '', options: ['', '', '', '', ''], correctAnswer: 0, difficulty: 'medium', category: 'regular' }); setShowQuestionModal(true); }} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-900/20 transition-all flex items-center gap-2">
                            <Plus size={20}/> CADASTRAR QUESTÃO
                        </button>
                    </div>

                    <div className="p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center text-slate-600 bg-slate-900/20">
                         <FileQuestion size={64} className="mx-auto mb-6 opacity-10" />
                         <p className="max-w-sm mx-auto font-medium">As questões cadastradas ficam disponíveis imediatamente no filtro do aluno.</p>
                    </div>
                </div>
            )}

            {/* === SIMULADOS (FIXED & FUNCTIONAL) === */}
            {contentSubTab === 'sims' && (
                <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                     {simulations.map(sim => (
                         <div key={sim.id} className="p-8 bg-white/5 border border-white/5 rounded-3xl flex justify-between items-center group hover:border-purple-500/30 transition-all shadow-lg">
                             <div>
                                 <h4 className="font-black text-white text-lg italic">{sim.title}</h4>
                                 <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{sim.durationMinutes} min • {sim.questionIds?.length || 0} questões</p>
                                 <span className={`text-[10px] uppercase font-bold mt-2 inline-block px-2 py-0.5 rounded ${sim.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>{sim.status}</span>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => openEditSimModal(sim)} className="p-3 bg-slate-800 hover:bg-indigo-600 rounded-2xl text-slate-400 hover:text-white transition-all"><Edit size={18}/></button>
                                 <button onClick={() => handleDeleteSim(sim.id)} className="p-3 bg-slate-800 hover:bg-red-600 rounded-2xl text-slate-400 hover:text-white transition-all"><Trash2 size={18}/></button>
                             </div>
                         </div>
                     ))}
                     <button onClick={openNewSimModal} className="border-2 border-dashed border-white/10 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 text-slate-500 hover:bg-white/5 hover:border-indigo-500/40 transition-all group">
                         <Plus size={40} className="group-hover:scale-110 transition-transform" />
                         <span className="font-black uppercase tracking-[0.2em] text-xs">Novo Simulado</span>
                     </button>
                </div>
            )}
        </div>

        {/* MODAL: SALVAR AULA / BLOCO */}
        {showLessonModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 my-auto">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                            {lessonForm.id ? 'Editar Item' : 'Novo Item na Grade'}
                        </h3>
                        <button onClick={() => setShowLessonModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                    </div>
                    
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Tipo de Conteúdo</label>
                                <select className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-indigo-500" value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value as any})}>
                                    <option value="video">🎥 Aula em Vídeo</option>
                                    <option value="exercise_block">📝 Bloco de Exercícios</option>
                                    <option value="simulation_block">🎯 Bloco de Simulado</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Ordem na Playlist</label>
                                <input type="number" className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-indigo-500" value={lessonForm.order} onChange={e => setLessonForm({...lessonForm, order: parseInt(e.target.value)})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">{lessonForm.type === 'video' ? 'Título da Aula' : 'Nome do Bloco'}</label>
                            <input className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-indigo-500" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} placeholder="Ex: Introdução à Cinemática" />
                        </div>

                        {/* CONFIG SPECIFIC: VIDEO */}
                        {lessonForm.type === 'video' && (
                            <div className="space-y-4 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] text-slate-500 uppercase ml-1">Duração</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm" placeholder="12:00" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})}/></div>
                                    <div><label className="text-[10px] text-slate-500 uppercase ml-1">YouTube URL</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm font-mono" placeholder="https://..." value={lessonForm.videoUrl} onChange={e => setLessonForm({...lessonForm, videoUrl: e.target.value})}/></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] text-slate-500 uppercase ml-1">Tag Texto</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm" placeholder="Ex: Novo" value={lessonForm.tag?.text || ''} onChange={e => setLessonForm({...lessonForm, tag: { ...lessonForm.tag!, text: e.target.value }})}/></div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase ml-1">Tag Cor</label>
                                        <select className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm" value={lessonForm.tag?.color || 'indigo'} onChange={e => setLessonForm({...lessonForm, tag: { ...lessonForm.tag!, color: e.target.value }})}>
                                            <option value="indigo">Indigo</option><option value="emerald">Verde</option><option value="red">Vermelho</option><option value="yellow">Amarelo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CONFIG SPECIFIC: EXERCISE BLOCK OR SIMULATION BLOCK */}
                        {(lessonForm.type === 'exercise_block' || lessonForm.type === 'simulation_block') && (
                            <div className={`space-y-4 p-6 border rounded-2xl ${lessonForm.type === 'exercise_block' ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-purple-900/10 border-purple-500/20'}`}>
                                <h4 className={`${lessonForm.type === 'exercise_block' ? 'text-emerald-400' : 'text-purple-400'} text-xs font-bold uppercase tracking-widest flex items-center gap-2`}><FileQuestion size={14}/> Configuração do Filtro</h4>
                                <p className="text-xs text-slate-400">Quando o aluno clicar neste bloco, ele será levado ao {lessonForm.type === 'exercise_block' ? 'Banco de Questões' : 'Painel de Simulados'} com estes filtros aplicados automaticamente.</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] text-slate-500 uppercase ml-1">Matéria (ID)</label><input disabled value={selectedSub?.id} className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-slate-400 text-sm" /></div>
                                    <div><label className="text-[10px] text-slate-500 uppercase ml-1">Tópico</label><input disabled value={selectedTopic || ''} className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-slate-400 text-sm" /></div>
                                </div>
                                
                                <div>
                                    <label className={`text-[10px] font-bold uppercase ml-1 ${lessonForm.type === 'exercise_block' ? 'text-emerald-500' : 'text-purple-500'}`}>Sub-tópicos (Filtro Específico)</label>
                                    <input 
                                        className={`w-full bg-black border rounded-xl p-3 text-white text-sm placeholder:text-slate-600 ${lessonForm.type === 'exercise_block' ? 'border-emerald-500/30' : 'border-purple-500/30'}`} 
                                        placeholder="Ex: MRU, Queda Livre (separados por vírgula)"
                                        value={lessonForm.exerciseFilters?.subtopics?.join(', ') || ''}
                                        onChange={e => {
                                            const subs = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                            setLessonForm({
                                                ...lessonForm,
                                                exerciseFilters: {
                                                    category: selectedSub?.category || 'regular',
                                                    subject: selectedSub?.id || '',
                                                    topic: selectedTopic || '',
                                                    subtopics: subs
                                                }
                                            });
                                        }}
                                    />
                                    <p className="text-[9px] text-slate-500 mt-1">*Deixe em branco para carregar todo o tópico.</p>
                                </div>
                            </div>
                        )}

                        {/* MATERIAL COMPLEMENTAR */}
                        {lessonForm.type === 'video' && (
                            <div className="border-t border-white/10 pt-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 mb-2 block">Materiais Complementares</label>
                                <div className="flex gap-2 mb-3">
                                    <input className="flex-1 bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs" placeholder="Título (ex: PDF da Aula)" value={formMaterialTitle} onChange={e => setFormMaterialTitle(e.target.value)} />
                                    <input className="flex-1 bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs font-mono" placeholder="URL (Google Drive/PDF)" value={formMaterialUrl} onChange={e => setFormMaterialUrl(e.target.value)} />
                                    <button onClick={handleAddMaterial} className="p-3 bg-slate-800 hover:bg-indigo-600 rounded-xl text-white transition-colors"><Plus size={16}/></button>
                                </div>
                                <div className="space-y-1">
                                    {lessonForm.materials?.map((mat, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg text-xs border border-white/5">
                                            <span className="text-slate-300 truncate max-w-[200px]">{mat.title}</span>
                                            <div className="flex items-center gap-2">
                                                <a href={mat.url} target="_blank" className="text-indigo-400 hover:underline truncate max-w-[150px]">{mat.url}</a>
                                                <button onClick={() => handleRemoveMaterial(idx)} className="text-red-500 hover:text-white"><X size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <button onClick={handleSaveLesson} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 mt-4 shadow-xl transition-all hover:scale-[1.02]">
                            <Save size={20}/> SALVAR ITEM
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: CRIAR QUESTÃO */}
        {showQuestionModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-5xl shadow-2xl animate-in zoom-in-95 my-auto">
                    <h3 className="text-3xl font-black text-white mb-8 uppercase italic flex items-center gap-4">
                        <ImageIcon className="text-emerald-400"/> Editor de Questão Profissional
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Lado A: Meta & Localização */}
                        <div className="space-y-6">
                            <h4 className="text-xs text-indigo-400 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Indexação do Banco</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Matéria ID</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={qLoc.subject} onChange={e => setQLoc({...qLoc, subject: e.target.value})} placeholder="ex: fisica" /></div>
                                <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Assunto</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={qLoc.topic} onChange={e => setQLoc({...qLoc, topic: e.target.value})} placeholder="ex: Cinemática" /></div>
                                <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Sub-tópico</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={qLoc.subtopic} onChange={e => setQLoc({...qLoc, subtopic: e.target.value})} placeholder="ex: MRU" /></div>
                                <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Dificuldade</label><select className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value as any})}><option value="easy">🟢 Fácil</option><option value="medium">🟡 Média</option><option value="hard">🔴 Difícil</option></select></div>
                            </div>
                            <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">URL Imagem Enunciado (Opcional)</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs font-mono" value={questionForm.imageUrl} onChange={e => setQuestionForm({...questionForm, imageUrl: e.target.value})} placeholder="https://..." /></div>
                        </div>

                        {/* Lado B: Enunciado e Alternativas */}
                        <div className="space-y-6">
                            <h4 className="text-xs text-emerald-400 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Enunciado & Opções</h4>
                            <div><textarea className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-sm h-40 focus:border-emerald-500 outline-none" value={questionForm.text} onChange={e => setQuestionForm({...questionForm, text: e.target.value})} placeholder="Escreva o texto da questão aqui..." /></div>
                            
                            <div className="space-y-2">
                                {questionForm.options?.map((opt, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div 
                                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs cursor-pointer border transition-all ${questionForm.correctAnswer === i ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                                          onClick={() => setQuestionForm({...questionForm, correctAnswer: i})}
                                        >
                                            {String.fromCharCode(65+i)}
                                        </div>
                                        <input 
                                          className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-white/20" 
                                          value={opt} 
                                          onChange={e => {
                                            const next = [...(questionForm.options || [])];
                                            next[i] = e.target.value;
                                            setQuestionForm({...questionForm, options: next});
                                          }} 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col md:flex-row gap-4 border-t border-white/5 pt-8">
                        <button onClick={handleSaveQuestion} className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3">
                            <Save size={24}/> PUBLICAR NO BANCO
                        </button>
                        <button onClick={() => setShowQuestionModal(false)} className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black rounded-3xl transition-all">
                            DESCARTAR
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: CRIAR/EDITAR SIMULADO (NOVO) */}
        {showSimModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 my-auto">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                            {simForm.id ? 'Editar Simulado' : 'Novo Simulado'}
                        </h3>
                        <button onClick={() => setShowSimModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                    </div>
                    
                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Título do Simulado</label>
                            <input className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-purple-500" value={simForm.title} onChange={e => setSimForm({...simForm, title: e.target.value})} placeholder="Ex: Simulado Nacional ENEM #1" />
                        </div>
                        
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Descrição</label>
                            <textarea className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-purple-500 h-24" value={simForm.description} onChange={e => setSimForm({...simForm, description: e.target.value})} placeholder="Detalhes sobre a prova..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Duração (Minutos)</label>
                                <div className="relative">
                                    <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                                    <input type="number" className="w-full bg-black border border-zinc-800 rounded-xl p-4 pl-12 text-white outline-none focus:border-purple-500" value={simForm.durationMinutes} onChange={e => setSimForm({...simForm, durationMinutes: parseInt(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Status</label>
                                <select className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-purple-500" value={simForm.status} onChange={e => setSimForm({...simForm, status: e.target.value as any})}>
                                    <option value="open">Aberto (Disponível)</option>
                                    <option value="closed">Fechado</option>
                                    <option value="coming_soon">Em Breve</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Tipo</label>
                            <select className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-purple-500" value={simForm.type} onChange={e => setSimForm({...simForm, type: e.target.value as any})}>
                                <option value="training">Treino (Livre)</option>
                                <option value="official">Oficial (Ranking)</option>
                            </select>
                        </div>

                        <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-2xl">
                            <label className="text-[10px] text-purple-400 font-black uppercase ml-1 flex items-center gap-2"><List size={12}/> IDs das Questões</label>
                            <p className="text-[10px] text-slate-500 mb-2">Cole os IDs das questões que compõem este simulado, separados por vírgula.</p>
                            <textarea 
                                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-xs font-mono outline-none focus:border-purple-500 h-32" 
                                value={simQIds} 
                                onChange={e => setSimQIds(e.target.value)} 
                                placeholder="q_171..., q_172..., q_173..." 
                            />
                        </div>

                        <button onClick={handleSaveSim} className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 mt-4 shadow-xl transition-all hover:scale-[1.02]">
                            <Save size={20}/> SALVAR SIMULADO
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminContent;
