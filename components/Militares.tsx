
import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Subject, Lesson } from '../types';
import { Loader2, Skull, ChevronRight, PlayCircle, BookOpen, Target } from 'lucide-react';

// Reuse Classes logic but filter by 'military' category
const Militares: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});

  useEffect(() => {
    const loadMilitary = async () => {
        const allSubjects = await DatabaseService.getSubjects();
        // Filter strictly for military category
        const militarySubjects = allSubjects.filter(s => s.category === 'military');
        setSubjects(militarySubjects);
        setLoading(false);
    };
    loadMilitary();
  }, []);

  const handleSubjectSelect = async (sub: Subject) => {
      setSelectedSubject(sub);
      const data = await DatabaseService.getLessonsByTopic(sub.id);
      setLessonsMap(data);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  if (selectedSubject) {
      const topics = Object.keys(lessonsMap);
      return (
          <div className="space-y-6 animate-in slide-in-from-right">
              <button onClick={() => setSelectedSubject(null)} className="text-slate-400 hover:text-white flex items-center gap-2 mb-4">
                  <ChevronRight size={16} className="rotate-180"/> Voltar para Carreiras
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-emerald-900/30 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                      <Target size={32} />
                  </div>
                  <div>
                      <h2 className="text-3xl font-bold text-white">{selectedSubject.name}</h2>
                      <p className="text-slate-400">Módulos específicos para concursos.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  {topics.length > 0 ? topics.map(topic => (
                      <div key={topic} className="glass-card p-6 rounded-2xl border border-white/5">
                          <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                              <BookOpen size={20} /> {topic}
                          </h3>
                          <div className="space-y-2">
                              {lessonsMap[topic].map((lesson, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group">
                                      <span className="text-slate-300 font-medium group-hover:text-white">{lesson.title}</span>
                                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                                          <span>{lesson.duration}</span>
                                          <PlayCircle size={16} className="text-emerald-500" />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )) : (
                      <p className="text-slate-500">Nenhum conteúdo cadastrado.</p>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-slide-up">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-900/20 text-white">
                <Skull size={32} />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-white">Carreiras Militares</h2>
                <p className="text-slate-400">Preparatório focado: ESA, ESPCEX, AFA, EEAR e mais.</p>
            </div>
        </div>

        {subjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map(sub => (
                    <button 
                        key={sub.id}
                        onClick={() => handleSubjectSelect(sub)}
                        className="group relative overflow-hidden glass-card p-8 rounded-2xl text-left border border-white/5 hover:border-emerald-500/50 transition-all hover:-translate-y-1"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={100} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 relative z-10">{sub.name}</h3>
                        <p className="text-slate-400 text-sm relative z-10">Clique para acessar as aulas</p>
                        <div className="mt-6 w-12 h-1 bg-emerald-600 rounded-full group-hover:w-full transition-all duration-500" />
                    </button>
                ))}
            </div>
        ) : (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-slate-900/20">
                <Target size={48} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white">Em Breve</h3>
                <p className="text-slate-500">O conteúdo militar está sendo carregado no sistema.</p>
            </div>
        )}
    </div>
  );
};

export default Militares;
