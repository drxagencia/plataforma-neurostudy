
import React, { useState, useEffect } from 'react';
import { UserProfile, View } from '../types';
import { DatabaseService } from '../services/databaseService';
import { Clock, Target, TrendingUp, Trophy, Loader2, Sparkles, ArrowRight, Zap, Lock, AlertTriangle, EyeOff, BarChart3 } from 'lucide-react';
import { getRank, getNextRank } from '../constants';
import UpgradeModal from './UpgradeModal';

interface DashboardProps {
  user: UserProfile; 
  onNavigate: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentRank, setCurrentRank] = useState(getRank(0));
  const [nextRank, setNextRank] = useState(getNextRank(0));
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        // 1. Calculate Rank Progress
        const xp = user.xp || 0;
        const cRank = getRank(xp);
        const nRank = getNextRank(xp);
        
        setCurrentRank(cRank);
        setNextRank(nRank);

        if (nRank) {
            const prevThreshold = cRank.minXp;
            const nextThreshold = nRank.minXp;
            const progressPercent = ((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100;
            setProgress(Math.min(Math.max(progressPercent, 0), 100));
        } else {
            setProgress(100); // Max level
        }

        setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const isBasic = user.plan === 'basic';

  return (
    <div className="space-y-8 animate-slide-up pb-20">
      {showUpgrade && <UpgradeModal user={user} onClose={() => setShowUpgrade(false)} />}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight font-display">
            Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{user.displayName.split(' ')[0]}</span>
          </h2>
          <p className="text-slate-400 font-medium font-sans">Continue sua jornada para o topo.</p>
        </div>
        <div className="hidden md:block text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-300 uppercase tracking-wider font-sans">
             {user.isAdmin ? 'Administrador' : user.plan === 'advanced' ? 'Assinante Pro' : 'Plano Básico'}
          </div>
        </div>
      </div>

      {/* FOMO ALERT: LOST OPPORTUNITY (Only for Basic) */}
      {isBasic && (
          <div className="bg-gradient-to-r from-amber-900/20 to-red-900/20 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 relative overflow-hidden group cursor-pointer" onClick={() => setShowUpgrade(true)}>
              <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
              <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400">
                      <AlertTriangle size={20} />
                  </div>
                  <div>
                      <h4 className="text-amber-200 font-bold text-sm">Oportunidade Perdida</h4>
                      <p className="text-amber-400/80 text-xs">
                          Você deixou de ganhar <span className="font-bold text-white">240 XP Competitivos</span> esta semana por limitações do plano.
                      </p>
                  </div>
              </div>
              <div className="relative z-10 hidden md:block">
                  <span className="text-xs font-bold text-white bg-amber-600/20 border border-amber-500/50 px-3 py-1.5 rounded-lg uppercase tracking-wide">Recuperar Vantagem</span>
              </div>
          </div>
      )}

      {/* Hero Card - Rank Progress */}
      <div className="relative w-full rounded-3xl overflow-hidden glass-card p-8 md:p-10 group transition-all duration-500 hover:shadow-[0_0_50px_rgba(79,70,229,0.15)]">
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-4">
                    <span className={`p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/50 ${currentRank.colorClass}`}>
                        <Trophy size={18} />
                    </span>
                    <span className={`font-bold tracking-wide text-sm font-sans uppercase ${currentRank.colorClass}`}>
                        Rank Atual: {currentRank.name}
                    </span>
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-2 leading-tight font-display">
                    {nextRank ? `Próximo: ${nextRank.name}` : 'Nível Máximo Alcançado!'}
                </h3>
                <p className="text-slate-300 mb-6 text-lg leading-relaxed font-sans">
                    {nextRank 
                        ? `Faltam ${nextRank.minXp - (user.xp || 0)} XP para subir de ranking. Continue estudando!`
                        : 'Você é uma lenda entre os estudantes.'}
                </p>
                
                <div className="flex gap-4">
                    <button 
                        onClick={() => onNavigate('questoes')}
                        className="px-8 py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-indigo-50 transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer font-sans"
                    >
                        Ganhar XP Agora
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>

            {/* Level Circle Progress */}
            <div className="relative w-40 h-40 flex-shrink-0 mx-auto md:mx-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                    <circle 
                        cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                        className={currentRank.colorClass}
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * progress / 100)}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">XP Total</span>
                    <span className="text-2xl font-black font-display">{user.xp || 0}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* STATS GRID */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { 
                  icon: <Clock className="text-blue-400" />, 
                  label: 'Horas Estudadas', 
                  value: `${user.hoursStudied || 0}h`,
                  sub: 'Total acumulado'
              },
              { 
                  icon: <Target className="text-emerald-400" />, 
                  label: 'Questões Feitas', 
                  value: user.questionsAnswered || 0,
                  sub: 'Exercícios resolvidos'
              },
              { 
                  icon: <Zap className="text-purple-400" />, 
                  label: 'Login Streak', 
                  value: `${user.loginStreak || 0} Dias`,
                  sub: 'Sequência atual'
              },
              { 
                  icon: <TrendingUp className="text-yellow-400" />, 
                  label: 'Likes Dados Hoje', 
                  value: `${user.dailyLikesGiven || 0}/5`,
                  sub: 'Apoio à comunidade'
              },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors border border-white/5">
                    {stat.icon}
                  </div>
                </div>
                <p className="text-slate-400 text-sm font-medium font-sans">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1 mb-1 font-display">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium font-sans">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* ADVANCED RADAR (BLURRED FOR BASIC) */}
          <div className="relative glass-card rounded-2xl overflow-hidden border border-indigo-500/20">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2">
                      <BarChart3 size={18} className="text-indigo-400"/> Radar de Performance
                  </h3>
                  {isBasic && <Lock size={16} className="text-slate-500" />}
              </div>
              
              <div className="p-6 relative">
                  {isBasic ? (
                      // BLURRED STATE (PAIN POINT)
                      <>
                        <div className="space-y-4 filter blur-sm opacity-50 select-none">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400"><span>Matemática (Funções)</span><span className="text-emerald-400">+18%</span></div>
                                <div className="h-2 bg-slate-800 rounded-full"><div className="h-full w-[70%] bg-emerald-500 rounded-full"></div></div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400"><span>Física (Cinemática)</span><span className="text-red-400">-5%</span></div>
                                <div className="h-2 bg-slate-800 rounded-full"><div className="h-full w-[45%] bg-red-500 rounded-full"></div></div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400"><span>Química (Orgânica)</span><span className="text-indigo-400">Estável</span></div>
                                <div className="h-2 bg-slate-800 rounded-full"><div className="h-full w-[60%] bg-indigo-500 rounded-full"></div></div>
                            </div>
                            <div className="mt-4 p-3 bg-slate-800 rounded-lg text-xs text-center text-slate-400">
                                Previsão de nota no ENEM: 740.5
                            </div>
                        </div>
                        
                        {/* OVERLAY CTA */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px] text-center p-6">
                            <div className="bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30 shadow-2xl transform hover:scale-105 transition-transform cursor-pointer" onClick={() => setShowUpgrade(true)}>
                                <EyeOff size={32} className="mx-auto text-indigo-400 mb-3" />
                                <h4 className="text-white font-bold mb-1">Você está estudando no escuro</h4>
                                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                                    Membros ADV sabem exatamente onde melhorar com o Radar de Evolução.
                                </p>
                                <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
                                    Ativar Radar
                                </button>
                            </div>
                        </div>
                      </>
                  ) : (
                      // ADVANCED STATE (MOCKED FOR NOW)
                      <div className="space-y-6">
                          <div className="text-center">
                              <p className="text-sm text-slate-400 mb-1">Sua evolução semanal</p>
                              <p className="text-3xl font-black text-white flex items-center justify-center gap-2">
                                  <TrendingUp size={24} className="text-emerald-400" /> +12%
                              </p>
                          </div>
                          <div className="space-y-3">
                              <div className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-white"><span>Pontos Fortes</span><span className="text-emerald-400">Humanas</span></div>
                                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full w-[85%] bg-emerald-500"></div></div>
                              </div>
                              <div className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-white"><span>Pontos de Atenção</span><span className="text-yellow-400">Exatas</span></div>
                                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full w-[45%] bg-yellow-500"></div></div>
                              </div>
                          </div>
                          <div className="p-3 bg-indigo-900/20 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                              <Sparkles size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                              <p className="text-xs text-indigo-200">
                                  <strong>Dica do Mentor:</strong> Foque em exercícios de Geometria Plana esta semana para equilibrar seu gráfico.
                              </p>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
