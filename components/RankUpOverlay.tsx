
import React, { useEffect, useState } from 'react';
import { Trophy, Star, Shield, Crown, Sparkles } from 'lucide-react';
import { Rank } from '../constants';

interface RankUpOverlayProps {
  oldRank: Rank;
  newRank: Rank;
  onClose: () => void;
}

const RankUpOverlay: React.FC<RankUpOverlayProps> = ({ oldRank, newRank, onClose }) => {
  const [phase, setPhase] = useState<'intro' | 'explosion' | 'reveal'>('intro');

  useEffect(() => {
    // Sequence the animation phases
    const timer1 = setTimeout(() => setPhase('explosion'), 2000);
    const timer2 = setTimeout(() => setPhase('reveal'), 2800);
    
    // Auto close after a long celebration
    const timer3 = setTimeout(onClose, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500 overflow-hidden">
      
      {/* Background FX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[150px] animate-pulse-slow" />
          {phase === 'reveal' && (
             <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-transparent to-transparent animate-fade-in" />
          )}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl text-center">
        
        {/* PHASE 1: OLD RANK */}
        {phase === 'intro' && (
            <div className="animate-out fade-out slide-out-to-bottom duration-1000 fill-mode-forwards flex flex-col items-center">
                <p className="text-slate-400 text-xl font-bold uppercase tracking-[0.2em] mb-8">Rank Anterior</p>
                <div className={`w-40 h-40 rounded-3xl border-4 ${oldRank.borderClass} ${oldRank.bgClass} flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] grayscale opacity-80 scale-90`}>
                    <Shield size={80} className={oldRank.colorClass} />
                </div>
                <h2 className={`text-4xl font-black mt-6 ${oldRank.colorClass} opacity-50`}>{oldRank.name}</h2>
            </div>
        )}

        {/* PHASE 2: EXPLOSION / TRANSITION */}
        {phase === 'explosion' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_100px_100px_white] animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_1]" />
            </div>
        )}

        {/* PHASE 3: NEW RANK REVEAL */}
        {phase === 'reveal' && (
            <div className="animate-in zoom-in-50 slide-in-from-bottom-10 duration-1000 flex flex-col items-center">
                {/* Confetti / Sparkles */}
                <div className="absolute -top-20 left-0 animate-bounce delay-100"><Sparkles className="text-yellow-400 w-12 h-12" /></div>
                <div className="absolute -top-10 right-20 animate-bounce delay-300"><Star className="text-indigo-400 w-8 h-8 fill-indigo-400" /></div>
                <div className="absolute bottom-20 -left-20 animate-bounce delay-500"><Star className="text-purple-400 w-10 h-10 fill-purple-400" /></div>

                <div className="relative mb-8">
                    <div className={`absolute inset-0 ${newRank.colorClass.replace('text-', 'bg-')}/30 blur-3xl rounded-full animate-pulse`} />
                    <div className={`relative w-64 h-64 rounded-[3rem] border-8 ${newRank.borderClass} ${newRank.bgClass} flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.1)] animate-[spin_3s_ease-out_reverse]`}>
                        <div className="animate-[spin_3s_ease-out]">
                            {newRank.name.includes('Mestre') ? (
                                <Crown size={120} className={newRank.colorClass + " drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"} />
                            ) : (
                                <Trophy size={120} className={newRank.colorClass + " drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"} />
                            )}
                        </div>
                    </div>
                    {/* Badge Shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-[3rem] pointer-events-none" />
                </div>

                <h1 className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">
                    LEVEL UP!
                </h1>
                <h2 className={`text-4xl md:text-5xl font-bold uppercase tracking-widest mb-8 ${newRank.colorClass}`}>
                    {newRank.name}
                </h2>

                <p className="text-slate-300 text-lg max-w-md mx-auto leading-relaxed mb-10">
                    Você alcançou um novo patamar de conhecimento. Continue evoluindo para se tornar uma lenda.
                </p>

                <button 
                    onClick={onClose}
                    className="px-12 py-4 bg-white text-slate-950 font-black text-xl rounded-2xl hover:bg-indigo-50 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                    CONTINUAR
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default RankUpOverlay;
