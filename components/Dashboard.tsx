
import React, { useState, useEffect } from 'react';
import { UserProfile, View } from '../types';
import { DatabaseService } from '../services/databaseService';
import { Clock, Target, TrendingUp, Trophy, Loader2, Sparkles, ArrowRight } from 'lucide-react';

interface DashboardProps {
  user: UserProfile; 
  onNavigate: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        // 1. Calculate Level
        const xp = user.xp || 0;
        const calcLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
        const nextLevelXp = Math.pow(calcLevel, 2) * 100;
        const currentLevelBaseXp = Math.pow(calcLevel - 1, 2) * 100;
        
        // Progress to next level
        const progressPercent = ((xp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100;
        
        setLevel(calcLevel);
        setProgress(Math.min(Math.max(progressPercent, 0), 100));

        // Note: Real-time ranking calculation removed for performance.
        // It requires downloading the entire user database which is not scalable.
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

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight font-display">
            Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{user.displayName.split(' ')[0]}</span>
          </h2>
          <p className="text-slate-400 font-medium font-sans">Vamos elevar seu nível hoje?</p>
        </div>
        <div className="hidden md:block text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-300 uppercase tracking-wider font-sans">
             {user.isAdmin ? 'Administrador' : user.plan !== 'basic' ? 'Assinante Pro' : 'Plano Gratuito'}
          </div>
        </div>
      </div>

      {/* Hero Card - Dynamic Content */}
      <div className="relative w-full rounded-3xl overflow-hidden glass-card p-8 md:p-10 group transition-all duration-500 hover:shadow-[0_0_50px_rgba(79,70,229,0.15)]">
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-4">
                    <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                        <Sparkles size={18} />
                    </span>
                    <span className="text-indigo-300 font-semibold tracking-wide text-sm font-sans">FOCO DIÁRIO</span>
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4 leading-tight font-display">
                    Pronto para começar?
                </h3>
                <p className="text-slate-300 mb-8 text-lg leading-relaxed font-sans">
                    Acesse o banco de questões ou inicie uma nova aula para começar a ganhar XP.
                </p>
                
                <div className="flex gap-4">
                    <button 
                        onClick={() => onNavigate('questoes')}
                        className="px-8 py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-indigo-50 transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer font-sans"
                    >
                        Explorar Conteúdos
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>

            {/* Level Circle Progress */}
            <div className="relative w-40 h-40 flex-shrink-0 mx-auto md:mx-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                    <circle 
                        cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="8"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * progress / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Nível</span>
                    <span className="text-4xl font-black font-display">{level}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Real Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              icon: <TrendingUp className="text-purple-400" />, 
              label: 'XP Total', 
              value: user.xp || 0,
              sub: 'Pontos de experiência'
          },
          { 
              icon: <Trophy className="text-yellow-400" />, 
              label: 'Sua Classificação', 
              value: 'TOP 10%',
              sub: 'Estimativa'
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
    </div>
  );
};

export default Dashboard;
