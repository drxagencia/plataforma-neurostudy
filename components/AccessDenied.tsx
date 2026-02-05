
import React from 'react';
import { Lock, ArrowUpCircle, ShieldAlert, Zap, Crown } from 'lucide-react';

interface AccessDeniedProps {
  requiredPlan: string;
  currentPlan: string;
  onUnlock?: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredPlan, currentPlan, onUnlock }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-30 rounded-full animate-pulse-slow" />
        <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 p-8 rounded-full shadow-2xl ring-4 ring-indigo-500/20">
          <Lock size={48} className="text-slate-300" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-full border-4 border-slate-950 shadow-lg">
            <ShieldAlert size={24} className="text-white" />
        </div>
      </div>

      <h2 className="text-4xl font-black text-white mb-4 text-center tracking-tight">Conteúdo Exclusivo</h2>
      <p className="text-slate-400 text-center max-w-md mb-8 leading-relaxed text-lg">
        Este recurso de elite está disponível apenas para membros do <strong className="text-indigo-400">Plano Advanced</strong>.
      </p>

      <div className="glass-card p-8 rounded-3xl w-full max-w-sm border-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-slate-900/80 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
        
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
                <Crown size={24} />
            </div>
            <h3 className="font-bold text-white text-xl">Torne-se Lenda</h3>
        </div>
        
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Desbloqueie Simulados Oficiais, NeuroTutor IA Ilimitado, Correção de Redação e Ranking Competitivo.
        </p>
        
        <button 
            onClick={onUnlock}
            className="w-full py-4 bg-white hover:bg-indigo-50 text-indigo-950 font-black text-lg rounded-xl transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
            <Zap size={20} className="fill-indigo-900" />
            Liberar Acesso Agora
        </button>
        
        <p className="text-center text-[10px] text-indigo-300/70 mt-3 font-bold uppercase tracking-wider">
            Pague apenas a diferença do seu plano
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;