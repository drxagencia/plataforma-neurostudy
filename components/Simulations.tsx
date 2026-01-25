import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Simulation } from '../types';
import { Timer, FileText, BarChart3, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

const Simulations: React.FC = () => {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimulations = async () => {
      const data = await DatabaseService.getSimulations();
      setSimulations(data);
      setLoading(false);
    };
    fetchSimulations();
  }, []);

  const officialSim = simulations.find(s => s.type === 'official' && s.status === 'open');

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
          
          {officialSim ? (
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-500/20">
                <Timer size={12} /> Oficial
              </span>
              <h3 className="text-3xl font-bold text-white mb-2">{officialSim.title}</h3>
              <p className="text-slate-300 mb-6 max-w-md">{officialSim.description}</p>
              
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 bg-white text-indigo-950 font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2">
                  Começar Agora <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col justify-center h-full">
              <div className="inline-flex items-center gap-2 text-slate-400 mb-2">
                <Timer size={20} />
                <span className="uppercase tracking-widest text-xs font-bold">Sem provas ativas</span>
              </div>
              <h3 className="text-2xl font-bold text-white max-w-md">Nenhum simulado oficial aberto no momento.</h3>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold text-white pt-4">Todos os Simulados</h3>
      {simulations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulations.map((sim) => (
            <div key={sim.id} className="bg-slate-900/30 border border-white/5 p-4 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                    <FileText size={20} />
                </div>
                <span className={`text-xs px-2 py-1 rounded capitalize ${
                    sim.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                }`}>
                    {sim.status === 'coming_soon' ? 'Em Breve' : sim.status}
                </span>
                </div>
                <h4 className="text-white font-medium mb-1">{sim.title}</h4>
                <p className="text-sm text-slate-500">{sim.questionCount} Questões • {sim.durationMinutes} min</p>
            </div>
            ))}
        </div>
      ) : (
          <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-white/5 border-dashed">
              <p className="text-slate-500">Nenhum simulado cadastrado na plataforma ainda.</p>
          </div>
      )}
    </div>
  );
};

export default Simulations;