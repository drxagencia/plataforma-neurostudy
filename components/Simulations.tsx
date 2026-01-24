import React from 'react';
import { Timer, FileText, BarChart3, ChevronRight, AlertCircle } from 'lucide-react';

const Simulations: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Simulados</h2>
          <p className="text-slate-400">Teste seus conhecimentos em condições reais de prova.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Highlight Card - Next Exam */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-8 group">
          <div className="absolute top-0 right-0 p-32 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-indigo-500/30 transition-colors duration-500" />
          
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-500/20">
              <Timer size={12} /> Próximo Evento Oficial
            </span>
            <h3 className="text-3xl font-bold text-white mb-2">Simulado Nacional ENEM 2025</h3>
            <p className="text-slate-300 mb-6 max-w-md">90 questões + Redação. Cronômetro oficial e TRI simulada. Disponível neste fim de semana.</p>
            
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 bg-white text-indigo-950 font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2">
                Inscrever-se Grátis <ChevronRight size={18} />
              </button>
              <button className="px-6 py-3 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10">
                Ver Edital
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BarChart3 className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Seu Desempenho</h3>
          </div>
          
          <div className="space-y-4">
             <div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-slate-400">Média Geral (TRI)</span>
                 <span className="text-emerald-400 font-bold">720.5</span>
               </div>
               <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 w-[72%]" />
               </div>
             </div>
             <div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-slate-400">Simulados Feitos</span>
                 <span className="text-white font-bold">4/10</span>
               </div>
               <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500 w-[40%]" />
               </div>
             </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <AlertCircle size={12} />
              Você precisa melhorar em Natureza.
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white pt-4">Histórico e Anteriores</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-slate-900/30 border border-white/5 p-4 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                <FileText size={20} />
              </div>
              {i <= 2 && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Feito</span>}
            </div>
            <h4 className="text-white font-medium mb-1">Simulado Modelo {2023 + (i % 2)} - #{i}</h4>
            <p className="text-sm text-slate-500">90 Questões • 5h de duração</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Simulations;