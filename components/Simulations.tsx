
import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { Simulation, Question, SimulationResult, View, UserProfile } from '../types';
import { Timer, FileText, ChevronRight, Loader2, Trophy, Clock, CheckCircle, AlertTriangle, ArrowRight, XCircle, ArrowLeft, BrainCircuit, Zap, Target, Lock, Crown, List, BarChart3, LayoutGrid } from 'lucide-react';
import { auth } from '../services/firebaseConfig';

interface SimulationsProps {
    user?: UserProfile;
    onShowUpgrade?: () => void;
}

const Simulations: React.FC<SimulationsProps> = ({ user, onShowUpgrade }) => {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Simulation State
  const [activeSim, setActiveSim] = useState<Simulation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); 
  const [timeLeft, setTimeLeft] = useState(0); 
  const [showQuestionMap, setShowQuestionMap] = useState(false); // Mobile toggle
  
  // Results State
  const [result, setResult] = useState<SimulationResult | null>(null);
  
  // AI Analysis State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<{analysis: string, recommendations: {subjectId: string, topicName: string, reason: string}[]} | null>(null);

  const isBasic = user?.plan === 'basic';

  useEffect(() => {
    fetchSimulations();
    fetchHistory();
  }, [user?.uid]);

  const fetchSimulations = async () => {
    const data = await DatabaseService.getSimulations();
    setSimulations(data);
    setLoading(false);
  };

  const fetchHistory = async () => {
      if (user?.uid) {
          const hist = await DatabaseService.getUserSimulationResults(user.uid);
          setHistory(hist);
      }
  };

  // Timer Logic
  useEffect(() => {
      if (!activeSim || !timeLeft || result) return;
      const interval = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  finishSimulation();
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, [activeSim, timeLeft, result]);

  const startSimulation = async (sim: Simulation) => {
      if (isBasic) {
          if (onShowUpgrade) onShowUpgrade();
          else alert("Recurso exclusivo Advanced");
          return;
      }

      setLoading(true);
      try {
          const qIds = sim.questionIds || [];
          if (qIds.length === 0) {
              alert("Este simulado ainda não possui questões cadastradas.");
              setLoading(false);
              return;
          }

          const fetchedQuestions = await DatabaseService.getQuestionsByIds(qIds);
          if (fetchedQuestions.length === 0) {
               alert("Erro ao carregar questões. Tente novamente.");
               setLoading(false);
               return;
          }

          setQuestions(fetchedQuestions);
          setActiveSim(sim);
          setCurrentIndex(0);
          setAnswers({});
          setTimeLeft(sim.durationMinutes * 60);
          setResult(null);
          setAiPlan(null); 
          setShowQuestionMap(false);
      } catch (e) {
          console.error(e);
          alert("Erro ao iniciar simulado.");
      } finally {
          setLoading(false);
      }
  };

  const handleAnswer = (optionIdx: number) => {
      setAnswers(prev => ({ ...prev, [currentIndex]: optionIdx }));
  };

  const finishSimulation = async () => {
      if (!activeSim || !auth.currentUser) return;

      setLoading(true);
      let score = 0;
      const resultAnswers: Record<string, boolean> = {};
      const topicStats: Record<string, { correct: number, total: number }> = {};

      questions.forEach((q, idx) => {
          const selected = answers[idx];
          const isCorrect = selected === q.correctAnswer;
          if (isCorrect) score++;
          if (q.id) resultAnswers[q.id] = isCorrect;

          // Normalize Subject Name for aggregation
          const subjectKey = q.subjectId || 'Geral';
          if (!topicStats[subjectKey]) topicStats[subjectKey] = { correct: 0, total: 0 };
          topicStats[subjectKey].total++;
          if (isCorrect) topicStats[subjectKey].correct++;
      });

      const simResult: SimulationResult = {
          userId: auth.currentUser.uid,
          simulationId: activeSim.id,
          score,
          totalQuestions: questions.length,
          timeSpentSeconds: (activeSim.durationMinutes * 60) - timeLeft,
          answers: resultAnswers,
          timestamp: Date.now(),
          topicPerformance: topicStats
      };

      await DatabaseService.saveSimulationResult(simResult);
      
      // Update local history
      setHistory(prev => [simResult, ...prev]);
      
      setResult(simResult);
      setLoading(false);
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  // --- RESULT VIEW ---
  if (result && activeSim) {
      const percentage = Math.round((result.score / result.totalQuestions) * 100);
      const subjects = Object.entries(result.topicPerformance || {});

      return (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 pb-20">
              <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 md:p-12 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] -z-10" />
                  
                  <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Desempenho no Simulado</h2>
                  <p className="text-slate-400 mb-8 font-medium">{activeSim.title}</p>
                  
                  <div className="inline-flex flex-col items-center justify-center w-48 h-48 rounded-full border-8 border-slate-800 bg-slate-900 shadow-2xl mb-8 relative">
                      <span className="text-6xl font-black text-white">{result.score}</span>
                      <span className="text-sm font-bold text-slate-500 uppercase">de {result.totalQuestions} questões</span>
                      <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-t-transparent -rotate-45" style={{ opacity: percentage/100 }} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
                      <div className="p-4 bg-slate-800/50 rounded-2xl">
                          <p className="text-xs text-slate-500 font-bold uppercase">Acertos</p>
                          <p className="text-2xl font-black text-emerald-400">{percentage}%</p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-2xl">
                          <p className="text-xs text-slate-500 font-bold uppercase">Tempo</p>
                          <p className="text-2xl font-black text-white">{Math.floor(result.timeSpentSeconds / 60)}m</p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-2xl">
                          <p className="text-xs text-slate-500 font-bold uppercase">XP Ganho</p>
                          <p className="text-2xl font-black text-yellow-400">+{result.score * 10}</p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-2xl">
                          <p className="text-xs text-slate-500 font-bold uppercase">Rank</p>
                          <p className="text-2xl font-black text-indigo-400">Top 10%</p>
                      </div>
                  </div>
                  
                  <button onClick={() => { setActiveSim(null); setResult(null); }} className="px-10 py-4 bg-white text-slate-950 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-xl">
                      Voltar ao Painel
                  </button>
              </div>

              {/* Subject Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {subjects.map(([subject, rawStats]) => {
                      const stats = rawStats as { correct: number, total: number };
                      const subjPerc = Math.round((stats.correct / stats.total) * 100);
                      return (
                          <div key={subject} className="glass-card p-6 rounded-3xl border border-white/5">
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-bold text-white capitalize">{subject}</h4>
                                  <span className={`text-xs font-black px-2 py-1 rounded ${subjPerc >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                      {subjPerc}%
                                  </span>
                              </div>
                              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                                  <div className={`h-full ${subjPerc >= 70 ? 'bg-emerald-500' : 'bg-red-500'} transition-all duration-1000`} style={{ width: `${subjPerc}%` }} />
                              </div>
                              <p className="text-xs text-slate-500 text-right">{stats.correct} de {stats.total} acertos</p>
                          </div>
                      )
                  })}
              </div>
          </div>
      );
  }

  // --- ACTIVE SIM VIEW (WITH SIDEBAR) ---
  if (activeSim) {
      const currentQ = questions[currentIndex];
      const isAnswered = answers[currentIndex] !== undefined;

      return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-6 animate-in fade-in">
              
              {/* Main Question Area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Top Bar */}
                  <div className="flex justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-xl border border-white/5 flex-shrink-0">
                      <div className="flex items-center gap-4">
                          <button onClick={() => { if(confirm("Sair do simulado? O progresso será perdido.")) setActiveSim(null); }} className="text-slate-400 hover:text-white"><XCircle size={24}/></button>
                          <div>
                              <h3 className="font-bold text-white text-sm md:text-base line-clamp-1">{activeSim.title}</h3>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Questão {currentIndex + 1} de {questions.length}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="font-mono font-bold text-lg text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                              <Timer size={16}/> {formatTime(timeLeft)}
                          </div>
                          <button onClick={() => setShowQuestionMap(!showQuestionMap)} className="md:hidden p-2 bg-slate-800 rounded-lg text-white">
                              <LayoutGrid size={20}/>
                          </button>
                      </div>
                  </div>

                  {/* Question Content Scrollable */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                      <div className="glass-card p-6 md:p-8 rounded-3xl mb-6 border border-white/10">
                          <p className="text-lg md:text-xl text-white leading-relaxed font-medium whitespace-pre-wrap">{currentQ.text}</p>
                          {currentQ.imageUrl && <img src={currentQ.imageUrl} className="mt-6 rounded-xl max-h-60 object-contain bg-black/50 mx-auto" />}
                      </div>

                      <div className="space-y-3">
                          {currentQ.options.map((opt, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => handleAnswer(idx)} 
                                className={`w-full p-5 rounded-2xl text-left border transition-all flex items-center gap-4 group ${answers[currentIndex] === idx ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-slate-900/40 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/20'}`}
                              >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${answers[currentIndex] === idx ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-500 group-hover:border-slate-400'}`}>
                                      {String.fromCharCode(65+idx)}
                                  </div>
                                  <span className="flex-1 text-sm md:text-base">{opt}</span>
                                  {answers[currentIndex] === idx && <CheckCircle size={20} className="text-indigo-400" />}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="flex justify-between mt-4 pt-4 border-t border-white/5 flex-shrink-0">
                      <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors">Anterior</button>
                      <button onClick={() => currentIndex === questions.length - 1 ? finishSimulation() : setCurrentIndex(prev => prev + 1)} className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${currentIndex === questions.length - 1 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-white hover:bg-indigo-50 text-slate-900'}`}>
                          {currentIndex === questions.length - 1 ? 'Finalizar Prova' : 'Próxima'}
                      </button>
                  </div>
              </div>

              {/* Sidebar Question Map (Hidden on mobile unless toggled) */}
              <div className={`fixed inset-0 bg-black/90 z-50 md:static md:bg-transparent md:z-auto md:w-80 flex-shrink-0 flex flex-col transition-transform duration-300 ${showQuestionMap ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                  <div className="glass-card h-full flex flex-col rounded-[2.5rem] overflow-hidden border border-white/10">
                      <div className="p-6 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
                          <h4 className="font-bold text-white flex items-center gap-2"><LayoutGrid size={18}/> Mapa de Questões</h4>
                          <button onClick={() => setShowQuestionMap(false)} className="md:hidden text-slate-400"><XCircle size={24}/></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                          <div className="grid grid-cols-4 gap-3">
                              {questions.map((_, idx) => {
                                  const status = answers[idx] !== undefined ? 'answered' : 'pending';
                                  const isCurrent = currentIndex === idx;
                                  return (
                                      <button 
                                        key={idx} 
                                        onClick={() => { setCurrentIndex(idx); setShowQuestionMap(false); }}
                                        className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${isCurrent ? 'bg-white text-black border-2 border-indigo-500 scale-110 shadow-lg z-10' : status === 'answered' ? 'bg-indigo-600 text-white shadow-indigo-900/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                                      >
                                          {idx + 1}
                                      </button>
                                  )
                              })}
                          </div>
                      </div>

                      <div className="p-4 bg-slate-900/50 border-t border-white/5">
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-3">
                              <span>Respondidas</span>
                              <span className="text-indigo-400">{Object.keys(answers).length} / {questions.length}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- LIST VIEW ---
  const featured = simulations.find(s => s.type === 'official');
  const others = simulations.filter(s => s !== featured);

  return (
    <div className="space-y-12 animate-slide-up pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Simulados</h2>
          <p className="text-slate-400">Pratique com provas oficiais e acompanhe sua evolução.</p>
        </div>
      </div>

      {simulations.length > 0 ? (
        <div className="space-y-12">
            {/* Featured Simulation */}
            {featured && (
                <div className="relative w-full rounded-[2.5rem] overflow-hidden glass-card p-8 md:p-12 group transition-all duration-500 border border-indigo-500/20 shadow-2xl hover:shadow-indigo-500/10">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6 border border-indigo-500/30">
                                <Crown size={14}/> Destaque Oficial
                            </div>
                            <h3 className="text-4xl font-black text-white mb-4 leading-tight italic">{featured.title}</h3>
                            <p className="text-slate-300 mb-8 text-lg max-w-xl leading-relaxed">{featured.description}</p>
                            
                            <div className="flex flex-wrap gap-6 mb-8 text-sm font-bold text-slate-400">
                                <span className="flex items-center gap-2"><Clock className="text-indigo-400" size={18}/> {featured.durationMinutes} minutos</span>
                                <span className="flex items-center gap-2"><List className="text-indigo-400" size={18}/> {featured.questionIds?.length || 0} questões</span>
                            </div>

                            <button 
                                onClick={() => startSimulation(featured)}
                                className={`px-10 py-4 font-black text-lg rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 ${isBasic ? 'bg-slate-800 text-slate-400 cursor-not-allowed hover:bg-slate-800' : 'bg-white text-indigo-950 hover:bg-indigo-50'}`}
                            >
                                {isBasic ? (
                                    <><Lock size={20} className="text-yellow-500"/> Bloqueado (Advanced)</>
                                ) : (
                                    <>INICIAR AGORA <ChevronRight size={20} /></>
                                )}
                            </button>
                        </div>
                        <div className="hidden md:block relative">
                             <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-20 rounded-full animate-pulse-slow"></div>
                             <Trophy size={240} className="text-indigo-200 drop-shadow-2xl relative z-10" strokeWidth={1} />
                        </div>
                    </div>
                </div>
            )}

            {/* Other Simulations */}
            {others.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Target size={20} className="text-slate-500"/> Treinamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {others.map((sim) => (
                        <div key={sim.id} className={`glass-card flex flex-col p-6 rounded-3xl transition-all group border border-white/5 relative overflow-hidden ${isBasic ? 'opacity-80 grayscale-[0.5]' : 'hover:bg-slate-800/60 hover:border-indigo-500/30'}`}>
                            <div className="mb-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-slate-800 text-slate-300 border border-white/5">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight mb-2">{sim.title}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2">{sim.description}</p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-wide">
                                <span className="flex items-center gap-1"><CheckCircle size={14}/> {sim.questionIds?.length || 0} Questões</span>
                                <span className="flex items-center gap-1"><Clock size={14}/> {sim.durationMinutes} min</span>
                            </div>
                            
                            <button 
                                onClick={() => startSimulation(sim)}
                                disabled={sim.status !== 'open'}
                                className={`mt-4 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isBasic ? 'bg-slate-800 text-slate-500' : 'bg-white/5 hover:bg-white/10 text-white hover:text-indigo-300'}`}
                            >
                                {isBasic ? <><Crown size={14} className="text-yellow-500"/> Upgrade</> : (sim.status === 'open' ? 'Iniciar Prova' : 'Indisponível')}
                            </button>
                        </div>
                        ))}
                    </div>
                </div>
            )}

            {/* HISTORY SECTION */}
            {history.length > 0 && (
                <div className="pt-8 border-t border-white/5">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-slate-500"/> Seu Histórico</h3>
                    <div className="glass-card rounded-[2rem] overflow-hidden border border-white/5">
                        {history.slice(0, 5).map((h, i) => {
                            const simTitle = simulations.find(s => s.id === h.simulationId)?.title || 'Simulado Removido';
                            const perc = Math.round((h.score / h.totalQuestions) * 100);
                            return (
                                <div key={i} className="p-5 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div>
                                        <p className="font-bold text-white text-sm">{simTitle}</p>
                                        <p className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black ${perc >= 70 ? 'text-emerald-400' : 'text-slate-300'}`}>{perc}%</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{h.score}/{h.totalQuestions} Acertos</p>
                                    </div>
                                </div>
                            )
                        })}
                        {history.length > 5 && (
                            <div className="p-4 text-center text-xs text-slate-500 font-bold uppercase cursor-pointer hover:text-white transition-colors">
                                Ver todo o histórico
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-3xl border border-white/5 border-dashed">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                 <FileText size={40} className="text-slate-600 opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nenhum simulado disponível</h3>
          </div>
      )}
    </div>
  );
};

export default Simulations;
