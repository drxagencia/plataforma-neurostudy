
import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { UserProfile } from '../types';
import { Trophy, Medal, Crown, Loader2, Calendar } from 'lucide-react';

const Competitivo: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'total'>('total');

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    // Pass period to database service (which now handles client-side sorting if needed)
    const data = await DatabaseService.getLeaderboard(period);
    setLeaderboard(data);
    setLoading(false);
  };

  const top3 = leaderboard.slice(0, 3);
  // Get next 10 for list (Rank 4 to 13)
  const rest = leaderboard.slice(3, 13);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Ranking Competitivo</h2>
          <p className="text-slate-400">Dispute o topo com outros estudantes ganhando XP.</p>
        </div>
        
        <div className="bg-slate-900 border border-white/10 rounded-lg p-1 flex gap-1">
            <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                    period === 'weekly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                <Calendar size={14} /> Semanal
            </button>
            <button
                onClick={() => setPeriod('total')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                    period === 'total' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                <Trophy size={14} /> Geral
            </button>
        </div>
      </div>

      {/* Podium */}
      {top3.length > 0 ? (
          <div className="flex justify-center items-end gap-4 md:gap-8 min-h-[300px] py-8">
              {/* 2nd Place */}
              {top3[1] && (
                  <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100">
                      <div className="w-20 h-20 rounded-full border-4 border-slate-400 overflow-hidden mb-3 relative">
                           <img src={top3[1].photoURL || `https://ui-avatars.com/api/?name=${top3[1].displayName}`} className="w-full h-full object-cover" />
                           <div className="absolute -bottom-1 -right-1 bg-slate-400 text-slate-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-slate-900">2</div>
                      </div>
                      <div className="text-center mb-4">
                          <p className="font-bold text-white">{top3[1].displayName.split(' ')[0]}</p>
                          <p className="text-slate-400 text-sm font-mono">{period === 'weekly' ? top3[1].weeklyXp || 0 : top3[1].xp || 0} XP</p>
                      </div>
                      <div className="w-24 h-32 bg-gradient-to-t from-slate-800 to-slate-700/50 rounded-t-lg border-t border-slate-600 flex items-center justify-center shadow-lg">
                          <Medal size={40} className="text-slate-400" />
                      </div>
                  </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                  <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 z-10">
                      <Crown size={40} className="text-yellow-400 mb-2 animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                      <div className="w-28 h-28 rounded-full border-4 border-yellow-400 overflow-hidden mb-3 relative shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                           <img src={top3[0].photoURL || `https://ui-avatars.com/api/?name=${top3[0].displayName}`} className="w-full h-full object-cover" />
                           <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-slate-900">1</div>
                      </div>
                      <div className="text-center mb-4">
                          <p className="font-bold text-white text-lg">{top3[0].displayName.split(' ')[0]}</p>
                          <p className="text-yellow-400 font-bold font-mono">{period === 'weekly' ? top3[0].weeklyXp || 0 : top3[0].xp || 0} XP</p>
                      </div>
                      <div className="w-32 h-44 bg-gradient-to-t from-yellow-900/40 to-yellow-600/20 rounded-t-lg border-t border-yellow-500/50 flex items-center justify-center relative overflow-hidden shadow-xl">
                          <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
                          <Trophy size={50} className="text-yellow-400 relative z-10" />
                      </div>
                  </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                  <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-200">
                      <div className="w-20 h-20 rounded-full border-4 border-orange-700 overflow-hidden mb-3 relative">
                           <img src={top3[2].photoURL || `https://ui-avatars.com/api/?name=${top3[2].displayName}`} className="w-full h-full object-cover" />
                           <div className="absolute -bottom-1 -right-1 bg-orange-700 text-orange-100 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-slate-900">3</div>
                      </div>
                      <div className="text-center mb-4">
                          <p className="font-bold text-white">{top3[2].displayName.split(' ')[0]}</p>
                          <p className="text-slate-400 text-sm font-mono">{period === 'weekly' ? top3[2].weeklyXp || 0 : top3[2].xp || 0} XP</p>
                      </div>
                      <div className="w-24 h-24 bg-gradient-to-t from-orange-900/40 to-orange-800/40 rounded-t-lg border-t border-orange-700/50 flex items-center justify-center shadow-lg">
                          <Medal size={40} className="text-orange-700" />
                      </div>
                  </div>
              )}
          </div>
      ) : (
          <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-white/5">
              <Trophy size={48} className="mx-auto text-slate-600 mb-4"/>
              <p className="text-slate-400">Nenhum dado de ranking para o período selecionado.</p>
          </div>
      )}

      {/* Top 10 List */}
      {rest.length > 0 && (
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/5 bg-slate-900/50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Jogadores</h4>
              </div>
              {rest.map((user, index) => (
                  <div key={user.uid} className="flex items-center p-4 border-b border-white/5 hover:bg-slate-800/40 transition-colors last:border-0">
                      <div className="w-10 text-center font-bold text-slate-500 mr-4 text-lg">#{index + 4}</div>
                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden mr-4 border border-white/10">
                          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                          <p className="font-bold text-white">{user.displayName}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Estudante NeuroStudy</p>
                      </div>
                      <div className="text-right">
                          <p className="font-bold text-indigo-400 font-mono">{period === 'weekly' ? user.weeklyXp || 0 : user.xp || 0} XP</p>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default Competitivo;
