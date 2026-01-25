import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Subject, Lesson } from '../types';
import * as Icons from 'lucide-react';
import { Loader2, BookX, ArrowLeft, PlayCircle, Video } from 'lucide-react';

const Classes: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      const data = await DatabaseService.getSubjects();
      setSubjects(data);
      setLoading(false);
    };
    fetchSubjects();
  }, []);

  const handleSubjectClick = async (subject: Subject) => {
      setSelectedSubject(subject);
      setLoadingLessons(true);
      const fetchedLessons = await DatabaseService.getLessons(subject.id);
      setLessons(fetchedLessons);
      setLoadingLessons(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  // --- LESSON VIEW ---
  if (selectedSubject) {
      return (
          <div className="space-y-6 animate-in slide-in-from-right">
              <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setSelectedSubject(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <ArrowLeft size={24} />
                  </button>
                  <h2 className="text-3xl font-bold text-white">{selectedSubject.name} - Aulas</h2>
              </div>

              {loadingLessons ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>
              ) : lessons.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                      {lessons.map((lesson, idx) => (
                          <div key={idx} className="glass-card p-4 rounded-xl flex items-center gap-4 hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => window.open(lesson.videoUrl, '_blank')}>
                              <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  <PlayCircle size={24} />
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-white">{lesson.title}</h4>
                                  <p className="text-xs text-slate-400 flex items-center gap-2">
                                      <Video size={12} /> {lesson.duration || '00:00'}
                                  </p>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center p-12 border border-white/5 border-dashed rounded-xl">
                      <p className="text-slate-500">Nenhuma aula cadastrada para esta matéria ainda.</p>
                  </div>
              )}
          </div>
      );
  }

  // --- SUBJECT LIST VIEW ---
  if (subjects.length === 0) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 animate-in fade-in">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                <BookX size={40} className="text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Nenhuma matéria encontrada</h2>
            <p className="max-w-md text-center">
                Parece que o conteúdo ainda não foi cadastrado no banco de dados. 
                Acesse o painel administrativo para adicionar.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Salas de Aula</h2>
        <p className="text-slate-400">Selecione uma matéria para acessar as videoaulas e materiais.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subjects.map((subject) => {
          // Dynamic icon rendering
          const IconComponent = (Icons as any)[subject.iconName] || Icons.Book;

          return (
            <button
              key={subject.id}
              onClick={() => handleSubjectClick(subject)}
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