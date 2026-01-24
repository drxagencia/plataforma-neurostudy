import React from 'react';
import { SUBJECTS } from '../constants';
import * as Icons from 'lucide-react';

const Classes: React.FC = () => {
  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Salas de Aula</h2>
        <p className="text-slate-400">Selecione uma matéria para acessar as videoaulas e materiais.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {SUBJECTS.map((subject) => {
          // Dynamic icon rendering
          const IconComponent = (Icons as any)[subject.iconName] || Icons.Book;

          return (
            <button
              key={subject.id}
              className="relative group p-6 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className={`p-4 rounded-full bg-slate-950 shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/5 ${subject.color}`}>
                <IconComponent size={32} />
              </div>
              
              <span className="text-slate-200 font-medium text-lg relative z-10 group-hover:text-white transition-colors">
                {subject.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Classes;