
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
        
        // MOCK DATA GENERATION IF EMPTY (To prevent collapsed layout)
        if (data.length === 0) {
            const ghosts = Array.from({ length: 5 }).map((_, i) => ({
                uid: `ghost_${i}`,
                displayName: `Estudante ${i+1}`,
                xp: (1000 - i*100),
                plan: 'basic',
                email: '',
                isAdmin: false,
                balance: 0
            } as UserProfile));
            setLeaderboard(ghosts);
        } else {
            setLeaderboard(data);
        }
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 relative min-h-screen">
      
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
          <div className="absolute inset-0 z-50 flex items-start pt-20 justify-center rounded-[2rem] overflow-hidden">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-0" /> {/* Blur layer */}
              <div className="text-center p-8 bg-slate-900/90 border border-indigo-500/30 rounded-3xl max-w-lg shadow-[0_0_50px_rgba(79,70,229,0.3)] animate-in zoom-in-95 relative z-10 mx-4">
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

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Ranking Competitivo</h2>
          <p className="text-slate-400">Dispute o topo com outros estudantes ganhando XP.</p>
        </div>
        
        <div className="bg-slate-900 border border-white/10 rounded-lg p-1 flex gap-1 relative z-20">
            <button 
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 rounded-md text-sm font-bold shadow-lg flex items-center gap-2 transition-all ${period === 'weekly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
                <Calendar size={14} /> Semanal
            </button>
            <button 
                onClick={() => setPeriod('total')}
                className={`px-4 py-2 rounded-md text-sm font-bold shadow-lg flex items-center gap-2 transition-all ${period === 'total' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
                <Trophy size={14} /> Geral
            </button>
        </div>
      </div>

      {/* Podium */}
      <div className="flex justify-center items-end gap-4 md:gap-8 min-h-[300px] py-8">
          {/* 2nd Place */}
          {top3[1] && (
              <div className="flex flex-col items-center group w-1/3 max-w-[150px]">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-600 bg-slate-800 mb-3 overflow-hidden">
                      {top3[1].photoURL ? <img src={top3[1].photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl font-bold">{top3[1].displayName.charAt(0)}</div>}
                  </div>
                  <div className="text-center mb-2">
                      <p className="font-bold text-slate-300 text-sm truncate w-full">{top3[1].displayName.split(' ')[0]}</p>
                      <p className="text-xs text-slate-500 font-mono">{top3[1].xp || 0} XP</p>
                  </div>
                  <div className="w-full h-32 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-2xl relative shadow-xl flex items-start justify-center pt-4">
                      <span className="text-4xl font-black text-slate-500/50">2</span>
                  </div>
              </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
              <div className="flex flex-col items-center group w-1/3 max-w-[180px] z-10 -mb-4">
                  <Crown size={32} className="text-yellow-400 mb-2 animate-bounce" fill="currentColor" />
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-500 bg-yellow-900/20 mb-3 overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                      {top3[0].photoURL ? <img src={top3[0].photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-yellow-500">{top3[0].displayName.charAt(0)}</div>}
                  </div>
                  <div className="text-center mb-2">
                      <p className="font-bold text-yellow-400 text-base truncate w-full">{top3[0].displayName.split(' ')[0]}</p>
                      <p className="text-xs text-yellow-600 font-mono font-bold">{top3[0].xp || 0} XP</p>
                  </div>
                  <div className="w-full h-40 bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-2xl relative shadow-2xl flex items-start justify-center pt-4 border-t border-yellow-400/50">
                      <span className="text-5xl font-black text-yellow-900/50">1</span>
                  </div>
              </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
              <div className="flex flex-col items-center group w-1/3 max-w-[150px]">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-orange-700 bg-orange-900/20 mb-3 overflow-hidden">
                      {top3[2].photoURL ? <img src={top3[2].photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-orange-500">{top3[2].displayName.charAt(0)}</div>}
                  </div>
                  <div className="text-center mb-2">
                      <p className="font-bold text-orange-400 text-sm truncate w-full">{top3[2].displayName.split(' ')[0]}</p>
                      <p className="text-xs text-orange-600/70 font-mono">{top3[2].xp || 0} XP</p>
                  </div>
                  <div className="w-full h-24 bg-gradient-to-t from-orange-900 to-orange-800 rounded-t-2xl relative shadow-xl flex items-start justify-center pt-4">
                      <span className="text-4xl font-black text-orange-950/50">3</span>
                  </div>
              </div>
          )}
      </div>

      {/* List */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          {rest.map((user, index) => (
              <div key={user.uid || index} className="flex items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="w-10 text-center font-bold text-slate-500 mr-4">#{index + 4}</div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400 mr-4 border border-white/5">
                      {user.displayName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                      <p className="font-bold text-slate-300">{user.displayName}</p>
                      <p className="text-xs text-slate-500">{user.plan === 'advanced' ? 'Membro VIP' : 'Estudante'}</p>
                  </div>
                  <div className="text-right">
                      <p className="font-mono font-bold text-white">{user.xp || 0} XP</p>
                  </div>
              </div>
          ))}
          {rest.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                  Continue estudando para aparecer no ranking!
              </div>
          )}
      </div>
    </div>
  );
};

export default Competitivo;
