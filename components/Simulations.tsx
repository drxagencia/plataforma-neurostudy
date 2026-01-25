import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Simulation } from '../types';
import { Timer, FileText, ChevronRight, AlertCircle, Loader2, Trophy, Clock, CheckCircle } from 'lucide-react';

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

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Simulados e Provas</h2>
          <p className="text-slate-400">Pratique com simulados reais cadastrados na plataforma.</p>
        </div>
      </div>

      {simulations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simulations.map((sim) => (
            <div key={sim.id} className="glass-card flex flex-col p-6 rounded-2xl hover:bg-slate-800/60 transition-all group border border-white/5 hover:border-indigo-500/30 relative overflow-hidden">
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        sim.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        sim.status === 'coming_soon' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-slate-700/50 text-slate-400 border border-slate-600'
                    }`}>
                        {sim.status === 'open' ? 'Disponível' : sim.status === 'coming_soon' ? 'Em Breve' : 'Encerrado'}
                    </span>
                </div>

                <div className="mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        sim.type === 'official' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-300'
                    }`}>
                        {sim.type === 'official' ? <Trophy size={24} /> : <FileText size={24} />}
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-indigo-200 transition-colors">{sim.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2">{sim.description}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-wide">
                    <span className="flex items-center gap-1"><CheckCircle size={14}/> {sim.questionCount} Questões</span>
                    <span className="flex items-center gap-1"><Clock size={14}/> {sim.durationMinutes} min</span>
                </div>
                
                <button 
                    disabled={sim.status !== 'open'}
                    className="mt-4 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-white hover:text-indigo-300"
                >
                    {sim.status === 'open' ? 'Iniciar Prova' : 'Indisponível'}
                    {sim.status === 'open' && <ChevronRight size={16} />}
                </button>
            </div>
            ))}
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-3xl border border-white/5 border-dashed">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                 <FileText size={40} className="text-slate-600 opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nenhum simulado disponível</h3>
              <p className="text-slate-500 max-w-sm text-center">
                  No momento não há provas cadastradas no banco de dados. Fique atento às novidades.
              </p>
          </div>
      )}
    </div>
  );
};

export default Simulations;