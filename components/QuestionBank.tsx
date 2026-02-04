
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { Subject, Question, UserProfile } from '../types';
import { ChevronRight, Filter, PlayCircle, Loader2, CheckCircle, XCircle, ArrowRight, ArrowLeft, Eye, EyeOff, X, Ban, Sparkles, Bot, Zap } from 'lucide-react';
import { auth } from '../services/firebaseConfig';

// --- PROFESSIONAL MARKDOWN RENDERER ---
const ProfessionalMarkdown: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
        <div className="space-y-4 font-sans text-sm md:text-base leading-relaxed">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                
                if (trimmed.startsWith('###')) {
                    const content = trimmed.replace(/^###\s*/, '');
                    return (
                        <div key={idx} className="flex items-center gap-3 mt-6 mb-3">
                            <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">{content}</h3>
                        </div>
                    );
                }

                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    const content = trimmed.replace(/^[-*]\s*/, '');
                    return (
                        <div key={idx} className="flex gap-3 pl-2 group">
                            <div className="mt-1.5 min-w-[16px]">
                                <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                            <p className="text-slate-200">{parseInlineStyles(content)}</p>
                        </div>
                    );
                }

                if (trimmed.startsWith('>')) {
                    const content = trimmed.replace(/^>\s*/, '');
                    return (
                        <div key={idx} className="my-4 p-4 rounded-xl bg-indigo-900/20 border-l-4 border-indigo-500 shadow-lg relative overflow-hidden">
                            <div className="flex gap-3 relative z-10">
                                <Zap size={20} className="text-yellow-400 shrink-0 mt-0.5 fill-yellow-400" />
                                <p className="text-indigo-100 font-medium italic">{parseInlineStyles(content)}</p>
                            </div>
                        </div>
                    );
                }

                if (!trimmed) return <div key={idx} className="h-2"></div>;

                return <p key={idx} className="text-slate-300">{parseInlineStyles(line)}</p>;
            })}
        </div>
    );
};

const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <span key={i} className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-300">
                    {part.slice(2, -2)}
                </span>
            );
        }
        return part;
    });
};

// --- MAIN COMPONENT ---
interface QuestionBankProps {
    onUpdateUser?: (u: UserProfile) => void;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ onUpdateUser }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  // Updated: Subtopics are now nested by subjectId and topicId
  const [subtopics, setSubtopics] = useState<Record<string, Record<string, string[]>>>({});
  const [loading, setLoading] = useState(true);
  const [answeredMap, setAnsweredMap] = useState<Record<string, {correct: boolean}>>({});

  // Filters
  const [isFilterOpen, setIsFilterOpen] = useState(true); // Start open to prompt user
  const [selectedCategory, setSelectedCategory] = useState<string>('regular');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>('');
  
  // New: Multiple subtopics filter (internal logic, not exposed in manual UI yet to keep it simple, but used by lesson redirect)
  const [multiSubtopicsFilter, setMultiSubtopicsFilter] = useState<string[]>([]);

  // List Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  // Tools State (Per Question ID)
  // Maps: QuestionID -> OptionIndex -> Boolean
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, Record<number, boolean>>>({});
  const [maybeOptions, setMaybeOptions] = useState<Record<string, Record<number, boolean>>>({});
  
  // Track User Selection for AI Context
  const [userSelection, setUserSelection] = useState<number | null>(null);

  // Explanation State
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    const initData = async () => {
      // Check for Redirect Params from Lessons
      const pendingFilters = sessionStorage.getItem('qb_filters');
      if (pendingFilters) {
          try {
              const filters = JSON.parse(pendingFilters);
              setSelectedCategory(filters.category || 'regular');
              setSelectedSubject(filters.subject || '');
              setSelectedTopic(filters.topic || '');
              
              if (filters.subtopics && Array.isArray(filters.subtopics) && filters.subtopics.length > 0) {
                  setMultiSubtopicsFilter(filters.subtopics);
              } else {
                  setMultiSubtopicsFilter([]);
              }

              sessionStorage.removeItem('qb_filters'); // Clear after using
              // Auto-trigger fetch handled by effect dependency
          } catch (e) {
              console.error("Invalid filters in storage");
          }
      }

      const [subs, tops, subtops, answered] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        DatabaseService.getSubTopics(),
        auth.currentUser ? DatabaseService.getAnsweredQuestions(auth.currentUser.uid) : Promise.resolve({})
      ]);
      
      const validSubjects = subs.filter(s => tops[s.id] && tops[s.id].length > 0);
      
      setSubjects(validSubjects);
      setTopics(tops);
      setSubtopics(subtops);
      setAnsweredMap(answered);
      setLoading(false);
    };
    initData();
  }, []);

  const handleFetchQuestions = async () => {
      if (!selectedSubject || !selectedTopic) return;
      setListLoading(true);
      setQuestions([]); 
      setCurrentIndex(0);
      setIsFilterOpen(false); // Auto close filter on fetch
      setUserSelection(null); // Reset selection
      setAiExplanation(null);
      
      try {
        let fetched: Question[] = [];
        
        // Priority: Multi Subtopic -> Single Subtopic -> All
        if (multiSubtopicsFilter.length > 0) {
            fetched = await DatabaseService.getQuestionsFromSubtopics(selectedCategory, selectedSubject, selectedTopic, multiSubtopicsFilter);
        } else {
            fetched = await DatabaseService.getQuestions(selectedCategory, selectedSubject, selectedTopic, selectedSubTopic || undefined);
        }
        
        setQuestions(fetched);
        // Clear multi filter after fetch to allow manual override later if needed? 
        // Keeping it for now so if they refresh or change topic it resets via other logic.
      } catch (e) {
          console.error(e);
      } finally {
        setListLoading(false);
      }
  };

  // Trigger fetch when filters change
  useEffect(() => {
      if (selectedSubject && selectedTopic) {
          handleFetchQuestions();
      } else {
          setQuestions([]);
      }
  }, [selectedSubject, selectedTopic, selectedSubTopic, selectedCategory, multiSubtopicsFilter]);

  const handleAnswerSubmit = async (optionIdx: number) => {
      const currentQ = questions[currentIndex];
      if (!auth.currentUser || !currentQ.id) return;
      
      // Prevent re-answering
      if (answeredMap[currentQ.id]) return;

      const isCorrect = optionIdx === currentQ.correctAnswer;
      setUserSelection(optionIdx); // Store what user clicked for AI Context
      
      // Optimistic update map
      setAnsweredMap(prev => ({...prev, [currentQ.id!]: { correct: isCorrect }}));

      await DatabaseService.markQuestionAsAnswered(auth.currentUser.uid, currentQ.id, isCorrect);
      
      // Award XP based on correctness
      if (isCorrect) {
          await DatabaseService.processXpAction(auth.currentUser.uid, 'QUESTION_CORRECT');
          await DatabaseService.incrementQuestionsAnswered(auth.currentUser.uid, 1);
      } else {
          await DatabaseService.processXpAction(auth.currentUser.uid, 'QUESTION_WRONG');
      }
      
      // Reset AI explanation for new interaction state
      setAiExplanation(null);
  };

  const handleUpdateBalance = async () => {
      if (onUpdateUser && auth.currentUser) {
          const u = await DatabaseService.getUserProfile(auth.currentUser.uid);
          if (u) onUpdateUser(u);
      }
  };

  // --- TOOLS HANDLERS ---
  const toggleEliminate = (qId: string, optIdx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setEliminatedOptions(prev => {
          const qState = prev[qId] || {};
          return { ...prev, [qId]: { ...qState, [optIdx]: !qState[optIdx] } };
      });
  };

  const toggleMaybe = (qId: string, optIdx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setMaybeOptions(prev => {
          const qState = prev[qId] || {};
          return { ...prev, [qId]: { ...qState, [optIdx]: !qState[optIdx] } };
      });
  };

  const handleExplain = async () => {
      const currentQ = questions[currentIndex];
      if (!currentQ) return;

      // Determine text context
      const correctTxt = currentQ.options[currentQ.correctAnswer];
      let wrongTxt = "Não informado";
      
      // Try to find the specific wrong option selected
      if (userSelection !== null && userSelection !== currentQ.correctAnswer) {
          wrongTxt = currentQ.options[userSelection];
      }

      setIsExplaining(true);
      try {
          const contextLabel = `Ajuda: Questão ${currentQ.topic}`;
          const text = await AiService.explainError(currentQ.text, wrongTxt, correctTxt, contextLabel);
          setAiExplanation(text);
          handleUpdateBalance(); 
      } catch (e: any) {
          if (e.message.includes('402')) alert("Saldo insuficiente.");
          else alert("Erro ao consultar tutor.");
      } finally {
          setIsExplaining(false);
      }
  };

  // --- NAVIGATION ---
  const handleNext = () => {
      if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setAiExplanation(null); // Clear previous explanation
          setUserSelection(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handlePrev = () => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          setAiExplanation(null);
          setUserSelection(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  const currentQ = questions[currentIndex];
  const isAnswered = currentQ?.id ? !!answeredMap[currentQ.id] : false;
  const wasCorrect = currentQ?.id ? answeredMap[currentQ.id]?.correct : false;
  const filteredSubjects = subjects.filter(s => s.category === selectedCategory);
  
  // Helper to safely get subtopics for current selection
  const topicOptions = selectedSubject ? topics[selectedSubject] || [] : [];
  
  // Safe Access to nested subtopics
  const subTopicOptions = (selectedSubject && selectedTopic && subtopics[selectedSubject] && subtopics[selectedSubject][selectedTopic]) 
      ? subtopics[selectedSubject][selectedTopic] 
      : [];

  return (
    <div className="h-full flex flex-col relative animate-fade-in">
      
      {/* HEADER & FILTER TOGGLE */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0 relative z-20">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Banco de Questões</h2>
          <p className="text-slate-400 text-sm">Pratique com foco total.</p>
        </div>
        
        <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all font-bold shadow-lg ${
                isFilterOpen 
                ? 'bg-indigo-600 border-indigo-500 text-white' 
                : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
            }`}
        >
            <Filter size={18} />
            {isFilterOpen ? 'Fechar' : 'Filtrar'}
        </button>
      </div>

      {/* COMPACT FILTER PANEL (Overlay for Mobile/Desktop) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 md:absolute md:top-20 md:right-0 md:inset-auto md:w-80 bg-slate-950/95 md:bg-slate-900/95 backdrop-blur-xl border-t md:border border-indigo-500/30 p-6 md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold flex items-center gap-2"><Filter size={16}/> Configurar Filtro</h3>
                <button onClick={() => setIsFilterOpen(false)} className="md:hidden p-2 bg-slate-800 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Categoria</label>
                    <select
                    value={selectedCategory}
                    onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedSubject('');
                        setSelectedTopic('');
                        setSelectedSubTopic('');
                        setMultiSubtopicsFilter([]); // Reset multi on manual change
                    }}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                    >
                    <option value="regular">ENEM / Vestibular</option>
                    <option value="military">Militar (ESA/Espcex)</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Disciplina</label>
                    <select
                    value={selectedSubject}
                    onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setSelectedTopic('');
                        setSelectedSubTopic('');
                        setMultiSubtopicsFilter([]);
                    }}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                    >
                    <option value="" disabled>Selecione...</option>
                    {filteredSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Assunto</label>
                    <select
                    value={selectedTopic}
                    onChange={(e) => {
                        setSelectedTopic(e.target.value);
                        setSelectedSubTopic('');
                        setMultiSubtopicsFilter([]);
                    }}
                    disabled={!selectedSubject}
                    className="w-full glass-input p-3 rounded-xl text-sm disabled:opacity-50"
                    >
                    <option value="" disabled>Selecione...</option>
                    {topicOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                    </select>
                </div>

                {multiSubtopicsFilter.length > 0 ? (
                    <div className="p-3 bg-indigo-900/30 rounded-xl border border-indigo-500/30">
                        <p className="text-xs text-indigo-300 font-bold mb-1">Filtro Especial Ativo</p>
                        <div className="flex flex-wrap gap-1">
                            {multiSubtopicsFilter.map(sub => (
                                <span key={sub} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded">{sub}</span>
                            ))}
                        </div>
                        <button onClick={() => setMultiSubtopicsFilter([])} className="text-[10px] text-red-400 underline mt-2">Limpar Filtro Especial</button>
                    </div>
                ) : (
                    <div>
                        <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Específico (Opcional)</label>
                        <select
                        value={selectedSubTopic}
                        onChange={(e) => setSelectedSubTopic(e.target.value)}
                        disabled={!selectedTopic}
                        className="w-full glass-input p-3 rounded-xl text-sm disabled:opacity-50"
                        >
                        <option value="">Todos</option>
                        {subTopicOptions.map((st) => (
                            <option key={st} value={st}>{st}</option>
                        ))}
                        </select>
                    </div>
                )}

                <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-500">
                    O filtro aplica automaticamente.
                </div>
            </div>
            
            <button 
                onClick={() => setIsFilterOpen(false)}
                className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl md:hidden"
            >
                Ver Questões
            </button>
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 relative">
          {listLoading ? (
             <div className="h-full flex flex-col items-center justify-center opacity-50">
                 <Loader2 className="animate-spin mb-4 text-indigo-500" size={48} />
                 <p className="text-slate-300 font-medium">Carregando questões...</p>
             </div>
          ) : currentQ ? (
             <div className="max-w-4xl mx-auto h-full flex flex-col">
                 
                 {/* Progress Bar */}
                 <div className="flex justify-between items-center mb-4 text-sm font-bold text-slate-500">
                     <span>Questão {currentIndex + 1} de {questions.length}</span>
                     {isAnswered && (
                         <span className={`flex items-center gap-2 px-3 py-1 rounded-full ${wasCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                             {wasCorrect ? <><CheckCircle size={14}/> Correta</> : <><XCircle size={14}/> Incorreta</>}
                         </span>
                     )}
                 </div>

                 {/* Question Card */}
                 <div className="glass-card p-4 md:p-10 rounded-3xl border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex-1 overflow-y-auto custom-scrollbar">
                     <div className="mb-8">
                        <div className="flex justify-between items-start mb-2">
                            {currentQ.tag && (
                                <span className={`text-xs font-bold px-2 py-1 rounded border uppercase mb-3 inline-block bg-${currentQ.tag.color}-500/20 text-${currentQ.tag.color}-400 border-${currentQ.tag.color}-500/30`}>
                                    {currentQ.tag.text}
                                </span>
                            )}
                        </div>
                        <ProfessionalMarkdown text={currentQ.text} />
                        {currentQ.imageUrl && (
                            <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-black/20 max-w-2xl mx-auto">
                                <img src={currentQ.imageUrl} className="w-full h-auto object-contain max-h-[400px]" />
                            </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        {currentQ.options.map((opt, idx) => {
                            const isEliminated = currentQ.id ? eliminatedOptions[currentQ.id]?.[idx] : false;
                            const isMaybe = currentQ.id ? maybeOptions[currentQ.id]?.[idx] : false;
                            
                            // Visual State Logic
                            let containerClass = "hover:bg-slate-800/60 border-slate-700 bg-slate-900/40";
                            let textClass = "text-slate-300";
                            
                            if (isAnswered) {
                                if (idx === currentQ.correctAnswer) {
                                    containerClass = "bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                                    textClass = "text-emerald-100 font-bold";
                                } else if (!wasCorrect && idx !== currentQ.correctAnswer) { 
                                    containerClass = "bg-slate-900/40 border-slate-800 opacity-50"; 
                                }
                            } else {
                                if (isEliminated) {
                                    containerClass = "bg-slate-950/20 border-slate-800";
                                    textClass = "text-slate-600 line-through decoration-red-500/50 decoration-2";
                                } else if (isMaybe) {
                                    containerClass = "bg-blue-900/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
                                    textClass = "text-blue-100";
                                }
                            }

                            return (
                                <div key={idx} className="flex gap-3 items-stretch group">
                                    <button
                                        onClick={() => !isAnswered && handleAnswerSubmit(idx)}
                                        disabled={isAnswered || isEliminated}
                                        className={`flex-1 p-4 md:p-5 rounded-xl border text-left text-sm md:text-lg transition-all relative overflow-hidden ${containerClass} ${isAnswered ? 'cursor-default' : isEliminated ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5 ${isAnswered && idx === currentQ.correctAnswer ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 text-slate-400'}`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={textClass}>{opt}</span>
                                        </div>
                                    </button>

                                    {/* Tools (Only show if not answered) */}
                                    {!isAnswered && (
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={(e) => toggleMaybe(currentQ.id!, idx, e)}
                                                className={`p-3 rounded-lg border transition-all ${isMaybe ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-blue-400 hover:border-blue-500/50'}`}
                                                title="Marcar como possível"
                                            >
                                                <Eye size={20} />
                                            </button>
                                            <button 
                                                onClick={(e) => toggleEliminate(currentQ.id!, idx, e)}
                                                className={`p-3 rounded-lg border transition-all ${isEliminated ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/50'}`}
                                                title="Eliminar alternativa"
                                            >
                                                <Ban size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                     </div>

                     {/* AI Explanation Section */}
                     {isAnswered && !wasCorrect && (
                         <div className="mt-8 pt-8 border-t border-white/5 animate-in slide-in-from-bottom-4">
                             <div className="bg-indigo-950/30 border border-indigo-500/30 p-6 rounded-2xl relative overflow-hidden">
                                 {/* AI Background Glow */}
                                 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                 
                                 <div className="relative z-10">
                                     {!aiExplanation ? (
                                         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                             <div>
                                                 <h4 className="text-xl font-bold text-white mb-1">Ficou com dúvida?</h4>
                                                 <p className="text-slate-400 text-sm">O NeuroAI pode explicar detalhadamente este conceito.</p>
                                             </div>
                                             <button 
                                                onClick={handleExplain}
                                                disabled={isExplaining}
                                                className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
                                             >
                                                 {isExplaining ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                                                 Explicar Erro
                                             </button>
                                         </div>
                                     ) : (
                                         <div className="space-y-4">
                                             <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-sm mb-4">
                                                 <Bot size={18} /> Explicação do Professor
                                             </div>
                                             <div className="text-slate-200 leading-relaxed text-lg bg-slate-900/50 p-6 rounded-xl border border-white/5 shadow-inner">
                                                 <ProfessionalMarkdown text={aiExplanation} />
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>

                             {currentQ.explanation && !aiExplanation && (
                                 <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-white/5 text-slate-400 text-sm">
                                     <strong className="text-white">Gabarito Rápido:</strong> {currentQ.explanation}
                                 </div>
                             )}
                         </div>
                     )}
                 </div>

                 {/* NAVIGATION BAR */}
                 <div className="flex justify-between items-center mt-6">
                     <button 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3"
                     >
                         <ArrowLeft size={20} /> <span className="hidden md:inline">Anterior</span>
                     </button>

                     <span className="text-slate-500 font-mono text-xs md:text-sm text-center px-2">
                         {selectedTopic || selectedSubject}
                     </span>
                     
                     <button 
                        onClick={handleNext}
                        disabled={currentIndex === questions.length - 1}
                        className="px-8 py-4 bg-white text-slate-950 hover:bg-indigo-50 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3 shadow-xl"
                     >
                         <span className="hidden md:inline">Próxima</span> <ArrowRight size={20} />
                     </button>
                 </div>
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20 p-8">
                 {selectedSubject && selectedTopic ? (
                     <>
                        <Filter size={48} className="mb-4 opacity-30" />
                        <h3 className="text-xl font-bold text-white mb-2">Nenhuma questão encontrada</h3>
                        <p className="max-w-xs text-center">Tente mudar os filtros ou selecionar outro tópico.</p>
                     </>
                 ) : (
                     <>
                        <PlayCircle size={64} className="mb-6 opacity-30 text-indigo-500" />
                        <h3 className="text-2xl font-bold text-white mb-2 text-center">Comece a Praticar</h3>
                        <p className="max-w-sm text-center mb-8">Selecione uma matéria e um assunto no filtro acima para carregar as questões.</p>
                        <button onClick={() => setIsFilterOpen(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-50 transition-colors">
                            Abrir Filtros
                        </button>
                     </>
                 )}
             </div>
          )}
      </div>
    </div>
  );
};

export default QuestionBank;
