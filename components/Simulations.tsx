
import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Simulation, Question, SimulationResult } from '../types';
import { Timer, FileText, ChevronRight, Loader2, Trophy, Clock, CheckCircle, AlertTriangle, ArrowRight, XCircle, ArrowLeft, BrainCircuit } from 'lucide-react';
import { auth } from '../services/firebaseConfig';

const Simulations: React.FC = () => {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Simulation State
  const [activeSim, setActiveSim] = useState<Simulation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // Index -> OptionIndex
  const [timeLeft, setTimeLeft] = useState(0); // Seconds
  
  // Results State
  const [result, setResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    const data = await DatabaseService.getSimulations();
    setSimulations(data);
    setLoading(false);
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
      setLoading(true);
      try {
          // Fetch real questions
          const qIds = sim.questionIds || [];
          if (qIds.length === 0) {
              alert("Este simulado ainda não possui questões cadastradas.");
              setLoading(false);
              return;
          }

          const fetchedQuestions = await DatabaseService.getQuestionsByIds(qIds);
          if (fetchedQuestions.length === 0) {
               alert("Erro ao carregar questões.");
               setLoading(false);
               return;
          }

          setQuestions(fetchedQuestions);
          setActiveSim(sim);
          setCurrentIndex(0);
          setAnswers({});
          setTimeLeft(sim.durationMinutes * 60);
          setResult(null);
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

          // Analytics
          if (q.topic) {
              if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, total: 0 };
              topicStats[q.topic].total++;
              if (isCorrect) topicStats[q.topic].correct++;
          }
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
      return (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
              <div className="text-center space-y-4 py-8">
                  <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(79,70,229,0.4)]">
                      <Trophy size={40} className="text-white" />
                  </div>
                  <h2 className="text-4xl font-bold text-white">Simulado Finalizado!</h2>
                  <p className="text-slate-400">Você completou <strong>{activeSim.title}</strong>.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-2xl text-center">
                      <p className="text-sm text-slate-400 uppercase font-bold">Nota Final</p>
                      <p className="text-5xl font-black text-white mt-2">{percentage}%</p>
                      <p className="text-sm text-slate-500 mt-1">{result.score} de {result.totalQuestions} acertos</p>
                  </div>
                  <div className="glass-card p-6 rounded-2xl text-center">
                      <p className="text-sm text-slate-400 uppercase font-bold">Tempo Gasto</p>
                      <p className="text-4xl font-bold text-white mt-2">{formatTime(result.timeSpentSeconds)}</p>
                  </div>
                  <div className="glass-card p-6 rounded-2xl text-center">
                      <p className="text-sm text-slate-400 uppercase font-bold">XP Ganho</p>
                      <p className="text-4xl font-bold text-yellow-400 mt-2">+{result.score * 5}</p>
                  </div>
              </div>

              {/* Topic Analysis */}
              <div className="glass-card p-8 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BrainCircuit size={20}/> Análise de Desempenho</h3>
                  <div className="space-y-4">
                      {result.topicPerformance && Object.entries(result.topicPerformance).map(([topic, statsData]) => {
                          const stats = statsData as { correct: number; total: number };
                          return (
                          <div key={topic}>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-slate-300 font-medium">{topic}</span>
                                  <span className="text-slate-400">{stats.correct}/{stats.total}</span>
                              </div>
                              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${stats.correct/stats.total > 0.7 ? 'bg-emerald-500' : stats.correct/stats.total > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                    style={{ width: `${(stats.correct/stats.total)*100}%` }}
                                  />
                              </div>
                          </div>
                      )})}
                  </div>
              </div>

              <div className="flex justify-center">
                  <button 
                    onClick={() => { setActiveSim(null); setResult(null); }}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                  >
                      Voltar para Lista
                  </button>
              </div>
          </div>
      );
  }

  // --- ACTIVE SIMULATION VIEW ---
  if (activeSim) {
      const currentQ = questions[currentIndex];
      return (
          <div className="h-full flex flex-col max-w-4xl mx-auto animate-in fade-in">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-4">
                      <button onClick={() => { if(confirm("Sair do simulado? Progresso será perdido.")) setActiveSim(null); }} className="text-slate-400 hover:text-white">
                          <ArrowLeft size={20} />
                      </button>
                      <h3 className="font-bold text-white truncate max-w-[200px] md:max-w-md">{activeSim.title}</h3>
                  </div>
                  <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                      <Clock size={20} />
                      {formatTime(timeLeft)}
                  </div>
              </div>

              {/* Progress */}
              <div className="flex gap-1 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                  {questions.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-2 min-w-[20px] rounded-full transition-colors ${
                            idx === currentIndex ? 'bg-indigo-500' : 
                            answers[idx] !== undefined ? 'bg-slate-500' : 'bg-slate-800'
                        }`}
                      />
                  ))}
              </div>

              {/* Question Card */}
              <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
                  <div className="glass-card p-8 rounded-2xl mb-6">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Questão {currentIndex + 1} de {questions.length}</span>
                       <p className="text-xl text-white leading-relaxed font-medium">{currentQ.text}</p>
                       {currentQ.imageUrl && <img src={currentQ.imageUrl} className="mt-4 rounded-xl max-h-[300px] object-contain bg-black/20" />}
                  </div>

                  <div className="space-y-3">
                      {currentQ.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            className={`w-full p-4 rounded-xl text-left border transition-all flex items-center justify-between group ${
                                answers[currentIndex] === idx 
                                ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                : 'bg-slate-900/40 border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-300'
                            }`}
                          >
                              <span className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                                      answers[currentIndex] === idx ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'
                                  }`}>
                                      {String.fromCharCode(65 + idx)}
                                  </span>
                                  {opt}
                              </span>
                              {answers[currentIndex] === idx && <CheckCircle size={18} className="text-indigo-400" />}
                          </button>
                      ))}
                  </div>

                  <div className="flex justify-between mt-8">
                      <button 
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(prev => prev - 1)}
                        className="px-6 py-3 bg-slate-800 rounded-xl text-white font-bold disabled:opacity-50"
                      >
                          Anterior
                      </button>
                      
                      {currentIndex === questions.length - 1 ? (
                          <button 
                            onClick={finishSimulation}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold shadow-lg shadow-emerald-900/20"
                          >
                              Finalizar Prova
                          </button>
                      ) : (
                          <button 
                            onClick={() => setCurrentIndex(prev => prev + 1)}
                            className="px-6 py-3 bg-white text-slate-900 hover:bg-indigo-50 rounded-xl font-bold flex items-center gap-2"
                          >
                              Próxima <ArrowRight size={18} />
                          </button>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // --- LIST VIEW ---
  const featured = simulations.find(s => s.type === 'official');
  const others = simulations.filter(s => s !== featured);

  return (
    <div className="space-y-8 animate-slide-up pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Simulados e Provas</h2>
          <p className="text-slate-400">Pratique com simulados reais cadastrados na plataforma.</p>
        </div>
      </div>

      {simulations.length > 0 ? (
        <div className="space-y-8">
            {/* Hero Card for Featured Simulation */}
            {featured && (
                <div className="relative w-full rounded-3xl overflow-hidden glass-card p-8 md:p-10 group transition-all duration-500 hover:shadow-[0_0_50px_rgba(79,70,229,0.15)] border border-indigo-500/20">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div>
                            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block border border-indigo-500/30">Destaque Oficial</span>
                            <h3 className="text-3xl font-bold text-white mb-4 leading-tight">{featured.title}</h3>
                            <p className="text-slate-300 mb-6 text-lg max-w-xl">{featured.description}</p>
                            
                            <div className="flex flex-wrap gap-4 mb-8 text-sm text-slate-400 font-medium">
                                <span className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg"><CheckCircle size={16} className="text-emerald-400"/> {featured.questionIds?.length || 0} Questões</span>
                                <span className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg"><Clock size={16} className="text-blue-400"/> {featured.durationMinutes} min</span>
                                <span className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg"><Trophy size={16} className="text-yellow-400"/> Ranking Nacional</span>
                            </div>

                            <button 
                                onClick={() => startSimulation(featured)}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                Iniciar Agora <ChevronRight size={20} />
                            </button>
                        </div>
                        <div className="hidden md:block">
                             <Trophy size={180} className="text-indigo-900/50 drop-shadow-2xl" />
                        </div>
                    </div>
                </div>
            )}

            {/* Grid for Other Simulations */}
            {others.length > 0 && (
                <>
                    <h3 className="text-xl font-bold text-white mt-8 mb-4">Outros Simulados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {others.map((sim) => (
                        <div key={sim.id} className="glass-card flex flex-col p-6 rounded-2xl hover:bg-slate-800/60 transition-all group border border-white/5 hover:border-indigo-500/30 relative overflow-hidden">
                            <div className="mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-slate-800 text-slate-300`}>
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-indigo-200 transition-colors">{sim.title}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2">{sim.description}</p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-wide">
                                <span className="flex items-center gap-1"><CheckCircle size={14}/> {sim.questionIds?.length || 0} Questões</span>
                                <span className="flex items-center gap-1"><Clock size={14}/> {sim.durationMinutes} min</span>
                            </div>
                            
                            <button 
                                onClick={() => startSimulation(sim)}
                                disabled={sim.status !== 'open'}
                                className="mt-4 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-white hover:text-indigo-300"
                            >
                                {sim.status === 'open' ? 'Iniciar Prova' : 'Indisponível'}
                                {sim.status === 'open' && <ChevronRight size={16} />}
                            </button>
                        </div>
                        ))}
                    </div>
                </>
            )}
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-3xl border border-white/5 border-dashed">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                 <FileText size={40} className="text-slate-600 opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nenhum simulado disponível</h3>
              <p className="text-slate-500 max-w-sm text-center">
                  No momento não há provas cadastradas no banco de dados. Fique atento às novidades.
              </p>
          </div>
      )}
    </div>
  );
};

export default Simulations;
