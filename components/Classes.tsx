
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Subject, Lesson, View, UserProfile } from '../types';
import * as Icons from 'lucide-react';
import { Loader2, BookX, ArrowLeft, PlayCircle, Video, Layers, ChevronRight, Play, FileText, ExternalLink, Clock, MonitorPlay, GraduationCap, CheckCircle, BrainCircuit, X, MessageCircle, Target, ArrowRight, Zap, Network, BarChart, FileType, Sparkles } from 'lucide-react';
import { AiService } from '../services/aiService';
import { auth } from '../services/firebaseConfig';

// --- OPTIMIZED VIDEO PLAYER COMPONENT ---
const VideoPlayer = React.memo(({ videoId, title }: { videoId: string, title: string }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
    }, [videoId]);

    return (
        <div className="relative aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-800 ring-1 ring-white/10 group">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                    <Loader2 className="animate-spin text-indigo-500" size={48} />
                </div>
            )}
            <iframe 
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&enablejsapi=1&origin=${window.location.origin}`} 
                title={title}
                className={`w-full h-full transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                loading="eager"
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
});

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
                <span key={i} className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-200 to-sky-300 animate-pulse-slow">
                    {part.slice(2, -2)}
                </span>
            );
        }
        return part;
    });
};

interface ClassesProps {
    onNavigate: (view: View) => void;
    user: UserProfile;
    onUpdateUser: (u: UserProfile) => void;
}

const Classes: React.FC<ClassesProps> = ({ onNavigate, user, onUpdateUser }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Data State
  const [topicsWithLessons, setTopicsWithLessons] = useState<Record<string, Lesson[]>>({});
  const [loadingContent, setLoadingContent] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  // --- ULTRA NEURO TUTOR STATE ---
  const [showSmartPanel, setShowSmartPanel] = useState(false);
  const [tutorInput, setTutorInput] = useState('');
  // Fix: Include 'id' in the history state type to match ChatMessage[]
  const [tutorHistory, setTutorHistory] = useState<{id: string, role: 'user' | 'ai', content: string}[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);

  useEffect(() => {
    const fetchAndFilterSubjects = async () => {
      setLoading(true);
      const [allSubjects, activeSubjectIds] = await Promise.all([
          DatabaseService.getSubjects(),
          DatabaseService.getSubjectsWithLessons()
      ]);
      
      const filtered = allSubjects.filter(s => activeSubjectIds.includes(s.id));
      setSubjects(filtered);
      
      // Load completed lessons state
      if (user.uid) {
          const completed = await DatabaseService.getCompletedLessons(user.uid);
          setCompletedLessons(new Set(completed));
      }

      setLoading(false);

      // Check for redirect from Simulation AI Analysis
      const redirectData = sessionStorage.getItem('neuro_redirect');
      if (redirectData && filtered.length > 0) {
          try {
              const { subject, topic } = JSON.parse(redirectData);
              const targetSubject = filtered.find(s => s.id === subject);
              
              if (targetSubject) {
                  // Simulate Selection
                  setSelectedSubject(targetSubject);
                  setLoadingContent(true);
                  const data = await DatabaseService.getLessonsByTopic(targetSubject.id);
                  setTopicsWithLessons(data);
                  setLoadingContent(false);
                  
                  if (topic && data[topic]) {
                      setSelectedTopic(topic);
                  }
              }
              sessionStorage.removeItem('neuro_redirect');
          } catch(e) { console.error("Redirect error", e); }
      }
    };
    fetchAndFilterSubjects();
  }, [user.uid]);

  const handleSubjectClick = async (subject: Subject) => {
      setSelectedSubject(subject);
      setLoadingContent(true);
      const data = await DatabaseService.getLessonsByTopic(subject.id);
      setTopicsWithLessons(data);
      setLoadingContent(false);
  };

  const handleLessonClick = (lesson: Lesson) => {
      if (lesson.type === 'exercise_block' && lesson.exerciseFilters) {
          sessionStorage.setItem('qb_filters', JSON.stringify(lesson.exerciseFilters));
          onNavigate('questoes');
      } else {
          setSelectedLesson(lesson);
          // Reset Tutor on new lesson
          setShowSmartPanel(false);
          setTutorHistory([]);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleTopicClick = (topicName: string) => {
      setSelectedTopic(topicName);
      // AUTO-SELECT FIRST LESSON TO ENTER PLAYER VIEW
      const lessons = topicsWithLessons[topicName];
      if (lessons && lessons.length > 0) {
          handleLessonClick(lessons[0]);
      }
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // --- AI HANDLERS ---
  const updateBalanceLocally = async () => {
      if (!auth.currentUser) return;
      const updatedUser = await DatabaseService.getUserProfile(auth.currentUser.uid);
      if (updatedUser) onUpdateUser(updatedUser);
  };

  const handleFinishLesson = async () => {
      if (!selectedLesson?.id || !auth.currentUser) return;

      // 1. Mark as completed in DB
      await DatabaseService.markLessonComplete(auth.currentUser.uid, selectedLesson.id);
      
      // 2. Award XP ONLY if not previously completed
      if (!completedLessons.has(selectedLesson.id)) {
          DatabaseService.processXpAction(auth.currentUser.uid, 'LESSON_WATCHED');
      }

      // 3. Update local state
      setCompletedLessons(prev => new Set(prev).add(selectedLesson.id!));
  };

  // --- ULTRA TUTOR LOGIC ---
  const handleTutorAction = async (actionType: 'summary' | 'mindmap' | 'custom') => {
      if (!selectedLesson) return;
      if (user.balance < 0.05) {
          alert("Saldo insuficiente para utilizar o NeuroTutor Avançado.");
          return;
      }

      setTutorLoading(true);
      
      // Context Engineering
      let systemPrompt = "";
      let userQuery = "";
      let actionLabel = "NeuroTutor: Dúvida Aula";

      const contextHeader = `[CONTEXTO DA AULA]\nTítulo: ${selectedLesson.title}\nTópico: ${selectedTopic}\nMatéria: ${selectedSubject?.name}`;

      if (actionType === 'mindmap') {
          userQuery = "Crie um MAPA MENTAL esquematizado desta aula.";
          systemPrompt = `${contextHeader}\n\nVocê é um especialista em Aprendizagem Acelerada. Crie um mapa mental usando Markdown (listas com indentação - ou *). Use EMOJIS para categorizar. Seja hierárquico e visual.`;
          actionLabel = "NeuroTutor: Mapa Mental";
      } else if (actionType === 'summary') {
          userQuery = "Gere um RESUMO DE ALTA PERFORMANCE focado no ENEM.";
          systemPrompt = `${contextHeader}\n\nVocê é um Professor Sênior de Cursinho. Crie um resumo 'direto ao ponto'. Use negrito para conceitos chave. Liste 'O que cai no ENEM' no final.`;
          actionLabel = "NeuroTutor: Resumo Aula";
      } else {
          userQuery = tutorInput;
          systemPrompt = `${contextHeader}\n\nResponda como um Tutor de Elite. Seja detalhista, use exemplos, analogias e formatação rica.`;
      }

      // Add user message to history optimistically
      const newUserMsg = { id: Date.now().toString(), role: 'user' as const, content: userQuery };
      const newHistory = [...tutorHistory, newUserMsg];
      setTutorHistory(newHistory);
      setTutorInput('');

      try {
          // Use AiService which now calls Client-side GenAI directly
          // Pass actionLabel for history
          // FIXED: Pass systemPrompt as the 4th argument so AiService uses the lesson context
          const responseText = await AiService.sendMessage(userQuery, newHistory, actionLabel, systemPrompt);

          setTutorHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: responseText }]);
          await updateBalanceLocally();
          
          if(auth.currentUser) DatabaseService.processXpAction(auth.currentUser.uid, 'AI_CHAT_MESSAGE');

      } catch (e: any) {
          setTutorHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: "Erro de conexão com o NeuroTutor. Verifique se sua API Key está configurada." }]);
      } finally {
          setTutorLoading(false);
      }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  // --- VIDEO PLAYER VIEW ---
  if (selectedLesson && selectedSubject) {
      const videoId = getYouTubeId(selectedLesson.videoUrl || '');
      const topicLessons = selectedTopic ? topicsWithLessons[selectedTopic] : [];
      // Note: topicLessons is already sorted by DatabaseService.getLessonsByTopic
      
      const isCompleted = selectedLesson.id && completedLessons.has(selectedLesson.id);

      return (
          <div className="space-y-6 animate-in slide-in-from-right max-w-[1600px] mx-auto relative pb-20">
              
              {/* --- ULTRA NEURO TUTOR PANEL (DRAWER) --- */}
              <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-slate-950/95 backdrop-blur-2xl border-l border-indigo-500/30 shadow-[0_0_100px_rgba(79,70,229,0.3)] z-[200] transform transition-transform duration-500 ease-in-out flex flex-col ${showSmartPanel ? 'translate-x-0' : 'translate-x-full'}`}>
                  {/* Panel Background FX */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Header */}
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                      <div>
                          <h3 className="text-2xl font-black text-white flex items-center gap-2">
                              <BrainCircuit className="text-indigo-400" /> NeuroTutor <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded font-bold uppercase">Pro</span>
                          </h3>
                          <p className="text-slate-400 text-xs mt-1">Inteligência Artificial contextualizada na sua aula.</p>
                      </div>
                      <button onClick={() => setShowSmartPanel(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                          <X size={24} />
                      </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 grid grid-cols-2 gap-2 border-b border-white/5 bg-slate-900/30">
                      <button 
                        onClick={() => handleTutorAction('mindmap')}
                        disabled={tutorLoading}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/50 transition-all group"
                      >
                          <Network size={20} className="mb-2 text-indigo-400 group-hover:text-white" />
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Mapa Mental</span>
                      </button>
                      <button 
                        onClick={() => handleTutorAction('summary')}
                        disabled={tutorLoading}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-emerald-600/20 border border-white/5 hover:border-emerald-500/50 transition-all group"
                      >
                          <FileType size={20} className="mb-2 text-emerald-400 group-hover:text-white" />
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Resumo Top</span>
                      </button>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/50">
                      {tutorHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                              <BrainCircuit size={64} className="mb-4 stroke-1" />
                              <p className="text-center max-w-xs">Estou pronto para analisar a aula "{selectedLesson.title}" com você. Escolha uma ação rápida acima ou digite sua dúvida.</p>
                          </div>
                      ) : (
                          tutorHistory.map((msg, idx) => (
                              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                      {msg.role === 'ai' ? <BrainCircuit size={16}/> : <div className="text-xs font-bold">VC</div>}
                                  </div>
                                  <div className={`p-4 rounded-2xl max-w-[85%] text-sm ${msg.role === 'ai' ? 'bg-slate-900 border border-white/10' : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100'}`}>
                                      {msg.role === 'ai' ? <ProfessionalMarkdown text={msg.content} /> : msg.content}
                                  </div>
                              </div>
                          ))
                      )}
                      {tutorLoading && (
                          <div className="flex gap-4 animate-pulse">
                              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                  <Loader2 className="animate-spin text-white" size={16}/>
                              </div>
                              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 w-3/4 h-24"></div>
                          </div>
                      )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-white/10 bg-slate-900 pb-safe">
                      <div className="relative">
                          <input 
                            value={tutorInput}
                            onChange={(e) => setTutorInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTutorAction('custom')}
                            placeholder="Pergunte algo específico sobre a aula..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-4 pr-12 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                          />
                          <button 
                            onClick={() => handleTutorAction('custom')}
                            disabled={!tutorInput.trim() || tutorLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                              <ArrowRight size={18} />
                          </button>
                      </div>
                      <p className="text-center text-[10px] text-slate-500 mt-2">NeuroTutor tem acesso total ao contexto desta aula.</p>
                  </div>
              </div>

              <button onClick={() => setSelectedLesson(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors group">
                  <div className="p-2 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors">
                    <ArrowLeft size={18} />
                  </div>
                  <span className="font-medium text-sm">Voltar para {selectedTopic}</span>
              </button>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left Column: Video & Details */}
                  <div className="xl:col-span-2 space-y-6">
                      
                      {/* Video Container */}
                      <div className="relative">
                        {videoId ? (
                            <VideoPlayer videoId={videoId} title={selectedLesson.title} />
                        ) : (
                            <div className="relative aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-800 flex flex-col items-center justify-center text-slate-500">
                                <Video size={64} className="mb-4 opacity-20" />
                                <p className="text-lg font-medium">Vídeo indisponível ou link inválido.</p>
                            </div>
                        )}
                      </div>
                      
                      {/* ACTION BAR: Title + Actions */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 mt-4">
                        <div className="space-y-2 flex-1">
                            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight flex items-center gap-3">
                                {selectedLesson.title}
                                {isCompleted && <CheckCircle size={24} className="text-emerald-500" />}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">{selectedSubject.name}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-300 font-medium">{selectedTopic}</span>
                                <span className="text-slate-500">•</span>
                                <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded-lg border border-white/5">
                                    <Clock size={14} /> 
                                    <span>{selectedLesson.duration || '00:00'}</span>
                                </div>
                                {selectedLesson.tag && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase bg-${selectedLesson.tag.color}-500/20 text-${selectedLesson.tag.color}-400 border-${selectedLesson.tag.color}-500/30`}>
                                        {selectedLesson.tag.text}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* PRIMARY ACTIONS: Finish & Question */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            <button 
                                onClick={() => setShowSmartPanel(true)}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 border border-indigo-400/20 hover:scale-105"
                            >
                                <MessageCircle size={20} /> Dúvida na Aula?
                            </button>
                            <button 
                                onClick={handleFinishLesson}
                                className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-105 ${isCompleted ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 cursor-default' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
                            >
                                <CheckCircle size={20} /> {isCompleted ? 'Aula Concluída' : 'Concluir Aula'}
                            </button>
                        </div>
                      </div>

                      {/* Materials Section */}
                      <div className="space-y-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <FileText size={20} className="text-indigo-400" /> 
                              Materiais Complementares
                          </h3>
                          
                          {selectedLesson.materials && selectedLesson.materials.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {selectedLesson.materials.map((material, idx) => (
                                      <a 
                                        key={idx}
                                        href={material.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all group relative overflow-hidden"
                                      >
                                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          
                                          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-all shadow-lg">
                                              <FileText size={24} />
                                          </div>
                                          
                                          <div className="flex-1 min-w-0 z-10">
                                              <p className="font-bold text-slate-200 group-hover:text-white truncate transition-colors">{material.title}</p>
                                              <p className="text-xs text-slate-500 group-hover:text-slate-400">Clique para acessar</p>
                                          </div>
                                          
                                          <ExternalLink size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                      </a>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/30 border border-white/5 text-slate-500">
                                  <BookX size={20} />
                                  <span className="text-sm">Nenhum material anexado a esta aula.</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Right Column: Playlist */}
                  <div className="xl:col-span-1">
                      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[calc(100vh-100px)] sticky top-6">
                          <div className="p-5 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm">
                              <h3 className="font-bold text-white flex items-center gap-2">
                                  <Layers size={18} className="text-indigo-400"/> 
                                  Conteúdo do Módulo
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{topicLessons.length} itens disponíveis</p>
                          </div>
                          
                          <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                              {topicLessons.map((l, idx) => {
                                  const isActive = selectedLesson.title === l.title;
                                  const isBlock = l.type === 'exercise_block';
                                  const isDone = l.id && completedLessons.has(l.id);

                                  return (
                                    <button 
                                        key={idx}
                                        onClick={() => handleLessonClick(l)}
                                        className={`w-full p-3 rounded-xl flex items-start gap-3 text-left transition-all duration-200 group relative overflow-hidden ${
                                            isActive 
                                            ? 'bg-indigo-600/10 border border-indigo-500/20' 
                                            : isBlock ? 'bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10' : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />}
                                        
                                        <div className="relative mt-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                                isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                isActive ? 'bg-indigo-500 border-indigo-500 text-white' : 
                                                isBlock ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-500'
                                            }`}>
                                                {isDone ? <CheckCircle size={12} fill="currentColor" /> : isActive ? <Play size={10} fill="currentColor"/> : isBlock ? <FileText size={10}/> : idx + 1}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium text-sm leading-snug ${isActive ? 'text-indigo-200' : isBlock ? 'text-emerald-200' : isDone ? 'text-emerald-400 line-through decoration-emerald-500/50' : 'text-slate-300 group-hover:text-white'}`}>
                                                {l.title}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                {!isBlock && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                                                        <Clock size={10} /> {l.duration}
                                                    </span>
                                                )}
                                                {l.tag && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase bg-${l.tag.color}-500/20 text-${l.tag.color}-400 border-${l.tag.color}-500/30`}>
                                                        {l.tag.text}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- TOPIC LIST VIEW ---
  if (selectedSubject) {
      const topics = Object.keys(topicsWithLessons);
      
      return (
          <div className="space-y-8 animate-in slide-in-from-right max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                  <button onClick={() => setSelectedSubject(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                      <ArrowLeft size={28} className="text-slate-200" />
                  </button>
                  <div>
                      <h2 className="text-4xl font-bold text-white mb-1">{selectedSubject.name}</h2>
                      <p className="text-slate-400">Selecione um tópico para visualizar as aulas disponíveis.</p>
                  </div>
              </div>

              {loadingContent ? (
                  <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
              ) : topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {topics.map((topic, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => handleTopicClick(topic)}
                            className="glass-card p-0 rounded-2xl hover:bg-slate-900/60 transition-all text-left group border border-white/5 hover:border-indigo-500/40 relative overflow-hidden h-full flex flex-col"
                          >
                              {/* Top Banner Accent */}
                              <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                              
                              <div className="p-6 flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-6">
                                      <div className="p-3 bg-slate-900 rounded-xl text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                                          <Layers size={28} />
                                      </div>
                                      <div className="px-3 py-1 rounded-full bg-slate-950 border border-white/5 text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                          {topicsWithLessons[topic].length} Aulas
                                      </div>
                                  </div>
                                  
                                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors leading-tight">{topic}</h3>
                                  <p className="text-sm text-slate-500 mt-auto pt-4 group-hover:text-slate-400 transition-colors flex items-center gap-1">
                                      Ver conteúdo <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                                  </p>
                              </div>
                          </button>
                      ))}
                  </div>
              ) : (
                  <div className="text-center p-20 border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20">
                      <GraduationCap size={48} className="mx-auto text-slate-700 mb-4"/>
                      <p className="text-slate-400 text-lg font-medium">Nenhum conteúdo cadastrado para esta matéria ainda.</p>
                      <p className="text-slate-600 text-sm mt-2">Volte mais tarde ou contate o administrador.</p>
                  </div>
              )}
          </div>
      );
  }

  // --- SUBJECT LIST VIEW ---
  if (subjects.length === 0) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 animate-in fade-in">
            <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                <BookX size={48} className="text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Nenhuma aula disponível</h2>
            <p className="max-w-md text-center text-slate-400">
                Parece que ainda não há aulas cadastradas no sistema.
                Acesse o painel administrativo para adicionar conteúdos.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500 max-w-7xl mx-auto">
      <header className="relative z-10">
        <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">Salas de Aula</h2>
        <p className="text-slate-400 text-lg max-w-2xl">
            Explore nossa biblioteca de conteúdos. Selecione uma matéria para acessar os módulos de estudo detalhados.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {subjects.map((subject) => {
          // Dynamic icon rendering
          const IconComponent = (Icons as any)[subject.iconName] || Icons.Book;

          return (
            <button
              key={subject.id}
              onClick={() => handleSubjectClick(subject)}
              className="relative group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/60 transition-all duration-300 flex flex-col items-center justify-center gap-5 text-center overflow-hidden h-64"
            >
              {/* Background Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className={`absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700`} />
              
              <div className={`p-5 rounded-2xl bg-slate-950 shadow-2xl group-hover:scale-110 transition-transform duration-500 border border-white/10 ${subject.color} relative z-10 group-hover:shadow-indigo-500/20`}>
                <IconComponent size={40} strokeWidth={1.5} />
              </div>
              
              <div className="relative z-10">
                  <span className="text-slate-200 font-bold text-xl block group-hover:text-white transition-colors mb-1">
                    {subject.name}
                  </span>
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold group-hover:text-indigo-400 transition-colors">
                      {subject.category === 'military' ? 'Militar' : 'Regular'}
                  </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Classes;
