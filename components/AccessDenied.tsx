import React from 'react';
import { Lock, ArrowUpCircle, ShieldAlert } from 'lucide-react';

interface AccessDeniedProps {
  requiredPlan: string;
  currentPlan: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredPlan, currentPlan }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full" />
        <div className="relative bg-slate-900 border border-white/10 p-8 rounded-full shadow-2xl">
          <Lock size={48} className="text-slate-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2 rounded-full border-4 border-slate-950">
            <ShieldAlert size={20} className="text-white" />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-white mb-4 text-center">Acesso Restrito</h2>
      <p className="text-slate-400 text-center max-w-md mb-8 leading-relaxed">
        O recurso que você tentou acessar está disponível apenas para membros do plano <strong className="text-indigo-400 capitalize">{requiredPlan === 'intermediate' ? 'Intermediário ou Superior' : 'Avançado'}</strong>. 
        <br/>Seu plano atual: <span className="uppercase font-bold text-slate-300">{currentPlan}</span>.
      </p>

      <div className="glass-card p-6 rounded-2xl w-full max-w-sm border-indigo-500/30 bg-indigo-900/10">
        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <ArrowUpCircle size={20} className="text-indigo-400" />
            Faça o Upgrade
        </h3>
        <p className="text-sm text-slate-400 mb-4">Desbloqueie simulados, comunidade, IA e muito mais.</p>
        <button className="w-full py-3 bg-white text-indigo-950 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">
            Ver Planos Disponíveis
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;