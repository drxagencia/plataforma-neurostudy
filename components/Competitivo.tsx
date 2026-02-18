import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { UserProfile } from '../types';
import { Trophy, Medal, Crown, Loader2, Calendar, Target, Lock, ArrowRight, EyeOff } from 'lucide-react';

interface CompetitivoProps {
    user?: UserProfile; // Optional to not break strict types if user not passed everywhere yet, but App.tsx passes it
    onShowUpgrade?: () => void;
}

const Competitivo: React.FC<CompetitivoProps> = ({ user, onShowUpgrade }) => {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'total'>('total');

  const isBasic = user?.plan === 'basic';

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
        setLoading(true);
        const data = await DatabaseService.getLeaderboard(period);
        setLeaderboard(data);
    } catch (error) {
        console.error("Erro ao carregar ranking:", error);
        setLeaderboard([]);
    } finally {
        setLoading(false);
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 13);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 relative">
      
      {/* SOCIAL PROOF BANNER */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-indigo-900/30 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-center gap-3 animate-slide-up text-center">
          <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
              <Target size={20} />
          </div>
          <p className="text-sm text-slate-300">
              <strong className="text-white">82% dos alunos aprovados em MEDICINA</strong> da plataforma, em 2025, usaram o Modo Competitivo ativamente.
          </p>
      </div>

      {/* LOCKED VIEW FOR BASIC USERS OVERLAY */}
      {isBasic && (
          <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center rounded-[2rem] overflow-hidden">
              <div className="text-center p-8 bg-slate-900/90 border border-indigo-500/30 rounded-3xl max-w-lg shadow-[0_0_50px_rgba(79,70,229,0.3)] animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400 animate-pulse">
                      <EyeOff size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 uppercase italic">Você está invisível</h2>
                  <p className="text-slate-300 mb-6 leading-relaxed">
                      Sua performance não está sendo contabilizada no Ranking Nacional. 
                      <br/>
                      <strong className="text-white">Estudar sem comparação é como correr no escuro.</strong>
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={onShowUpgrade}
                        className="w-full py-4 bg-white text-indigo-950 font-black text-lg rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl"
                      >
                          <Trophy size={20} className="fill-indigo-950" /> ENTRAR NO RANKING
                      </button>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Exclusivo para membros Advanced</p>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-end gap-4 opacity-50 pointer-events-none select-none filter blur-[1px]">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Ranking Competitivo</h2>
          <p className="text-slate-400">Dispute o topo com outros estudantes ganhando XP.</p>
        </div>
        
        <div className="bg-slate-900 border border-white/10 rounded-lg p-1 flex gap-1">
            <button className="px-4 py-2 rounded-md text-sm font-bold bg-indigo-600 text-white shadow-lg flex items-center gap-2">
                <Calendar size={14} /> Semanal
            </button>
        </div>
      </div>

      {/* Podium (Blurred for Basic) */}
      <div className={`flex justify-center items-end gap-4 md:gap-8 min-h-[300px] py-8 ${isBasic ? 'opacity-30 filter blur-sm' : ''}`}>
          {/* Mock podium content for layout stability behind overlay */}
          {top3.map((u, i) => (
              <div key={i} className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-slate-800 mb-2"></div>
                  <div className="w-24 h-32 bg-slate-800 rounded-t-lg"></div>
              </div>
          ))}
      </div>

      {/* List (Blurred for Basic) */}
      <div className={`bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl ${isBasic ? 'opacity-30 filter blur-sm' : ''}`}>
          {rest.map((user, index) => (
              <div key={index} className="flex items-center p-4 border-b border-white/5">
                  <div className="w-10 text-center font-bold text-slate-500 mr-4">#{index + 4}</div>
                  <div className="flex-1 h-4 bg-slate-800 rounded"></div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default Competitivo;