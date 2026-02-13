

import React, { useState, useEffect } from 'react';
import { UserProfile, Lead, RechargeRequest, UserPlan, Subject, Lesson, Simulation, Question } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, Eye, EyeOff, X, Smartphone, Calendar, CreditCard, DollarSign, Edit, Send, UserCheck, BookOpen, Layers, PlayCircle, Plus, Trash2, ChevronRight, Save, FileQuestion, GraduationCap, ArrowLeft, Image as ImageIcon, Sparkles } from 'lucide-react';

type ContentSection = 'lms' | 'questions' | 'simulations';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'finance' | 'content'>('leads');
  const [contentSection, setContentSection] = useState<ContentSection>('lms');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // LMS State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSub, setSelectedSub] = useState<Subject | null>(null);
  const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState<Partial<Lesson>>({ type: 'video', title: '' });
  const [targetTopic, setTargetTopic] = useState('');

  // Questions State
  const [allTopics, setAllTopics] = useState<Record<string, string[]>>({});
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  // Fix: category is now a known property of Question interface
  const [questionForm, setQuestionForm] = useState<Partial<Question>>({
      text: '', options: ['', '', '', '', ''], correctAnswer: 0, difficulty: 'easy', category: 'regular'
  });
  const [qTarget, setQTarget] = useState({ subject: '', topic: '', subtopic: '' });

  // Simulation State
  const [simulations, setSimulations] = useState<Simulation[]>([]);

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'content') {
            const [subs, tops, sims] = await Promise.all([
                DatabaseService.getSubjects(),
                DatabaseService.getTopics(),
                DatabaseService.getSimulations()
            ]);
            setSubjects(subs);
            setAllTopics(tops);
            setSimulations(sims);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- LMS HANDLERS ---
  const handleOpenSubject = async (s: Subject) => {
      setSelectedSub(s);
      setLoading(true);
      const data = await DatabaseService.getLessonsByTopic(s.id);
      setLessonsMap(data);
      setLoading(false);
  };

  const handleSaveLesson = async () => {
      if (!selectedSub || !targetTopic || !lessonForm.title) return;
      const id = lessonForm.id || `l_${Date.now()}`;
      await DatabaseService.saveLesson(selectedSub.id, targetTopic, id, { ...lessonForm, id } as Lesson);
      handleOpenSubject(selectedSub);
      setShowLessonModal(false);
  };

  // --- QUESTIONS HANDLERS ---
  const handleSaveQuestion = async () => {
      if (!qTarget.subject || !qTarget.topic || !qTarget.subtopic) {
          alert("Preencha todos os campos de localização da questão.");
          return;
      }
      const qid = questionForm.id || `q_${Date.now()}`;
      const data = { ...questionForm, id: qid, subjectId: qTarget.subject, topic: qTarget.topic, subtopic: qTarget.subtopic } as Question;
      // Fix: category is now a property of Question, making it accessible on Partial<Question>
      await DatabaseService.saveQuestion(questionForm.category || 'regular', qTarget.subject, qTarget.topic, qTarget.subtopic, qid, data);
      alert("Questão salva com sucesso!");
      setShowQuestionModal(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter">CENTRAL DE COMANDO</h2>
              <p className="text-slate-400 text-sm">Gestão operacional da NeuroStudy AI.</p>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10">
              {['leads', 'users', 'finance', 'content'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      {/* --- ABA CONTEÚDO (REDESENHADA) --- */}
      {activeTab === 'content' && (
          <div className="space-y-6">
              {/* Seletor de Sub-Aba de Conteúdo */}
              <div className="grid grid-cols-3 gap-4">
                  {[
                      { id: 'lms', label: 'Grade de Aulas', icon: PlayCircle, color: 'text-indigo-400' },
                      { id: 'questions', label: 'Banco de Questões', icon: FileQuestion, color: 'text-emerald-400' },
                      { id: 'simulations', label: 'Simulados', icon: GraduationCap, color: 'text-purple-400' }
                  ].map(sec => (
                      <button 
                        key={sec.id} 
                        onClick={() => setContentSection(sec.id as any)}
                        className={`p-6 rounded-2xl border transition-all text-left flex items-center gap-4 ${contentSection === sec.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}
                      >
                          <sec.icon className={sec.color} size={32} />
                          <div>
                              <p className={`text-sm font-black uppercase tracking-widest ${contentSection === sec.id ? 'text-white' : 'text-slate-500'}`}>{sec.label}</p>
                              <p className="text-[10px] text-slate-400">Gerenciar recursos</p>
                          </div>
                      </button>
                  ))}
              </div>

              <div className="glass-card rounded-3xl p-8 border-white/10 relative overflow-hidden min-h-[600px]">
                  {/* === GESTÃO DE AULAS (LMS) === */}
                  {contentSection === 'lms' && (
                      <div className="animate-in slide-in-from-right duration-500">
                          {selectedSub ? (
                              <div className="space-y-6">
                                  <button onClick={() => setSelectedSub(null)} className="flex items-center gap-2 text-indigo-400 font-bold text-sm hover:text-indigo-300">
                                      <ArrowLeft size={16}/> Voltar para Matérias
                                  </button>
                                  <div className="flex justify-between items-center bg-slate-950/50 p-6 rounded-2xl border border-white/5">
                                      <div>
                                          <h3 className="text-2xl font-bold text-white">{selectedSub.name}</h3>
                                          <p className="text-slate-500 text-xs mt-1">Clique nos tópicos para editar as aulas ou blocos de exercícios.</p>
                                      </div>
                                      <button onClick={() => { setTargetTopic(''); setLessonForm({type:'video'}); setShowLessonModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-500 shadow-lg transition-all">
                                          <Plus size={18}/> Adicionar Aula
                                      </button>
                                  </div>

                                  <div className="grid grid-cols-1 gap-4">
                                      {Object.keys(lessonsMap).length > 0 ? Object.keys(lessonsMap).map(topic => (
                                          <div key={topic} className="bg-white/5 rounded-2xl p-6 border border-white/5 group hover:border-indigo-500/20 transition-all">
                                              <div className="flex justify-between items-center mb-4">
                                                  <h4 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                                                      <Layers size={18} className="text-indigo-400"/> {topic}
                                                  </h4>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                  {lessonsMap[topic].map((l, i) => (
                                                      <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between group/item">
                                                          <div className="flex items-center gap-3">
                                                              {l.type === 'video' ? <PlayCircle size={16} className="text-blue-400"/> : <FileQuestion size={16} className="text-emerald-400"/>}
                                                              <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">{l.title}</span>
                                                          </div>
                                                          <div className="flex gap-2 opacity-0 group-item-hover:opacity-100 transition-opacity">
                                                              <button onClick={() => { setTargetTopic(topic); setLessonForm(l); setShowLessonModal(true); }} className="p-1.5 hover:bg-white/10 rounded text-slate-500 hover:text-white"><Edit size={14}/></button>
                                                              <button onClick={() => confirm("Excluir aula?") && DatabaseService.deleteLesson(selectedSub.id, topic, l.id!).then(() => handleOpenSubject(selectedSub))} className="p-1.5 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-500"><Trash2 size={14}/></button>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )) : (
                                          <div className="py-20 text-center text-slate-600">
                                              <Sparkles size={48} className="mx-auto mb-4 opacity-20"/>
                                              <p className="font-bold">Nenhum tópico cadastrado nesta matéria.</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {subjects.map(s => (
                                      <button 
                                        key={s.id} 
                                        onClick={() => handleOpenSubject(s)}
                                        className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-3 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all group"
                                      >
                                          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                              <BookOpen size={24}/>
                                          </div>
                                          <span className="text-xs font-bold text-slate-300 uppercase text-center">{s.name}</span>
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {/* === GESTÃO DE QUESTÕES (BANCO) === */}
                  {contentSection === 'questions' && (
                      <div className="animate-in fade-in space-y-6">
                          <div className="flex justify-between items-center">
                              <h3 className="text-2xl font-bold text-white">Editor de Questões</h3>
                              <button onClick={() => { 
                                  // Fix: category is now a known property of Question interface
                                  setQuestionForm({ text: '', options: ['', '', '', '', ''], correctAnswer: 0, difficulty: 'easy', category: 'regular' });
                                  setShowQuestionModal(true); 
                              }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-500 shadow-emerald-900/20">
                                  <Plus size={20}/> Nova Questão no Banco
                              </button>
                          </div>
                          
                          <div className="p-10 border-2 border-dashed border-white/5 rounded-3xl text-center text-slate-600">
                              <FileQuestion size={64} className="mx-auto mb-4 opacity-10"/>
                              <p className="max-w-xs mx-auto">Use o botão acima para cadastrar novas questões. Elas ficarão disponíveis instantaneamente no banco filtrável.</p>
                          </div>
                      </div>
                  )}

                  {/* === SIMULADOS === */}
                  {contentSection === 'simulations' && (
                      <div className="animate-in fade-in space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               {simulations.map(sim => (
                                   <div key={sim.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-purple-500/30 transition-all">
                                       <div>
                                           <h4 className="font-bold text-white text-lg">{sim.title}</h4>
                                           <p className="text-xs text-slate-500">{sim.durationMinutes} min • {sim.questionIds?.length || 0} questões</p>
                                       </div>
                                       <div className="flex gap-2">
                                           <button className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><Edit size={18}/></button>
                                           <button onClick={() => confirm("Excluir?") && DatabaseService.deleteSimulation(sim.id).then(fetchData)} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                                       </div>
                                   </div>
                               ))}
                               <button className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-slate-500 hover:bg-white/5 transition-all">
                                   <Plus size={32}/>
                                   <span className="font-bold uppercase tracking-widest text-xs">Novo Simulado</span>
                               </button>
                           </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- MODAL: SALVAR AULA --- */}
      {showLessonModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-2xl font-black text-white mb-6 uppercase italic">Gerenciar Aula</h3>
                  <div className="space-y-4">
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Tópico (Agrupador)</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={targetTopic} onChange={e => setTargetTopic(e.target.value)} placeholder="Ex: Álgebra" /></div>
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Título</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Tipo</label><select className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value as any})}><option value="video">Vídeo</option><option value="exercise_block">Bloco de Questões</option></select></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Duração/Carga</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} placeholder="15:00" /></div>
                      </div>
                      {lessonForm.type === 'video' && (
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">URL YouTube</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.videoUrl} onChange={e => setLessonForm({...lessonForm, videoUrl: e.target.value})} /></div>
                      )}
                      {lessonForm.type === 'exercise_block' && (
                          <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl">
                              <p className="text-[10px] text-emerald-400 font-bold uppercase mb-2">Filtro de Questões Associado</p>
                              <div className="grid grid-cols-2 gap-2">
                                  <input className="bg-black/40 border border-white/5 p-2 rounded text-[10px] text-white" placeholder="Assunto" value={lessonForm.exerciseFilters?.topic} onChange={e => setLessonForm({...lessonForm, exerciseFilters: {...(lessonForm.exerciseFilters as any), topic: e.target.value, category: 'regular', subject: selectedSub?.id}})} />
                              </div>
                          </div>
                      )}
                      
                      <button onClick={handleSaveLesson} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl flex items-center justify-center gap-2 mt-4 transition-all">
                          <Save size={18}/> Salvar Item
                      </button>
                      <button onClick={() => setShowLessonModal(false)} className="w-full text-slate-500 text-xs font-bold uppercase hover:text-white mt-2">Cancelar</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: CRIAR QUESTÃO --- */}
      {showQuestionModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-auto">
                  <h3 className="text-2xl font-black text-white mb-6 uppercase flex items-center gap-3">
                      <ImageIcon className="text-indigo-400"/> Editor de Questão
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      {/* Localização */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest border-b border-white/5 pb-2">Onde salvar?</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-[10px] text-slate-500 font-bold">Matéria (ID)</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs" value={qTarget.subject} onChange={e => setQTarget({...qTarget, subject: e.target.value})} placeholder="fisica" /></div>
                              <div><label className="text-[10px] text-slate-500 font-bold">Assunto</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs" value={qTarget.topic} onChange={e => setQTarget({...qTarget, topic: e.target.value})} placeholder="Cinemática" /></div>
                              <div><label className="text-[10px] text-slate-500 font-bold">Sub-tópico</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs" value={qTarget.subtopic} onChange={e => setQTarget({...qTarget, subtopic: e.target.value})} placeholder="MRU" /></div>
                              <div><label className="text-[10px] text-slate-500 font-bold">Dificuldade</label><select className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs" value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value as any})}><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select></div>
                          </div>
                          <div><label className="text-[10px] text-slate-500 font-bold">URL da Imagem (Opcional)</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs" value={questionForm.imageUrl} onChange={e => setQuestionForm({...questionForm, imageUrl: e.target.value})} placeholder="https://..." /></div>
                      </div>

                      {/* Conteúdo */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest border-b border-white/5 pb-2">Enunciado e Respostas</h4>
                          <div><textarea className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs h-32" value={questionForm.text} onChange={e => setQuestionForm({...questionForm, text: e.target.value})} placeholder="Escreva o enunciado aqui..." /></div>
                          <div className="space-y-2">
                              {questionForm.options?.map((opt, i) => (
                                  <div key={i} className="flex gap-2">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer ${questionForm.correctAnswer === i ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`} onClick={() => setQuestionForm({...questionForm, correctAnswer: i})}>{String.fromCharCode(65+i)}</div>
                                      <input className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-1 text-[10px] text-white" value={opt} onChange={e => {
                                          const newOpts = [...(questionForm.options || [])];
                                          newOpts[i] = e.target.value;
                                          setQuestionForm({...questionForm, options: newOpts});
                                      }} />
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <button onClick={handleSaveQuestion} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20">
                      <Save size={20}/> SALVAR QUESTÃO NO BANCO
                  </button>
                  <button onClick={() => setShowQuestionModal(false)} className="w-full text-slate-500 text-xs font-bold uppercase hover:text-white mt-4">Cancelar e Descartar</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;