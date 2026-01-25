import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Subject, Lesson } from '../types';
import * as Icons from 'lucide-react';
import { Loader2, BookX, ArrowLeft, PlayCircle, Video, Layers, ChevronRight, Play, FileText, ExternalLink, Download } from 'lucide-react';

const Classes: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Data State
  const [topicsWithLessons, setTopicsWithLessons] = useState<Record<string, Lesson[]>>({});
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    const fetchAndFilterSubjects = async () => {
      setLoading(true);
      const [allSubjects, activeSubjectIds] = await Promise.all([
          DatabaseService.getSubjects(),
          DatabaseService.getSubjectsWithLessons()
      ]);
      
      const filtered = allSubjects.filter(s => activeSubjectIds.includes(s.id));
      setSubjects(filtered);
      setLoading(false);
    };
    fetchAndFilterSubjects();
  }, []);

  const handleSubjectClick = async (subject: Subject) => {
      setSelectedSubject(subject);
      setLoadingContent(true);
      const data = await DatabaseService.getLessonsByTopic(subject.id);
      setTopicsWithLessons(data);
      setLoadingContent(false);
  };

  const handleTopicClick = (topicName: string) => {
      setSelectedTopic(topicName);
  };

  const handleLessonClick = (lesson: Lesson) => {
      setSelectedLesson(lesson);
  };

  const goBack = () => {
      if (selectedLesson) setSelectedLesson(null);
      else if (selectedTopic) setSelectedTopic(null);
      else setSelectedSubject(null);
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  // --- VIDEO PLAYER VIEW ---
  if (selectedLesson && selectedSubject) {
      const videoId = getYouTubeId(selectedLesson.videoUrl);
      const topicLessons = selectedTopic ? topicsWithLessons[selectedTopic] : [];

      return (
          <div className="space-y-6 animate-in slide-in-from-right">
              <button onClick={() => setSelectedLesson(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
                  <ArrowLeft size={20} /> Voltar para {selectedTopic}
              </button>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                      {/* Video Player Container */}
                      <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                          {videoId ? (
                              <iframe 
                                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
                                  title={selectedLesson.title}
                                  className="w-full h-full" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                  allowFullScreen
                              />
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                  <Video size={48} className="mb-2 opacity-50" />
                                  <p>Vídeo indisponível ou link inválido.</p>
                              </div>
                          )}
                      </div>
                      
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{selectedLesson.title}</h2>
                        <p className="text-slate-400 flex items-center gap-2 text-sm">
                           {selectedSubject.name} <ChevronRight size={14}/> {selectedTopic}
                        </p>
                      </div>

                      {/* Materials Section */}
                      <div className="glass-card p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                          <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                              <FileText size={20} className="text-indigo-400" /> 
                              Materiais de Apoio
                          </h3>
                          
                          {selectedLesson.materials && selectedLesson.materials.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {selectedLesson.materials.map((material, idx) => (
                                      <a 
                                        key={idx}
                                        href={material.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/30 transition-all group"
                                      >
                                          <div className="flex items-center gap-3 overflow-hidden">
                                              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                  <FileText size={18} />
                                              </div>
                                              <span className="text-sm font-medium text-slate-300 truncate">{material.title}</span>
                                          </div>
                                          <ExternalLink size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                                      </a>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                                  <p className="text-slate-500 text-sm">Nenhum material anexado a esta aula.</p>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Playlist Sidebar */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-slate-300 uppercase text-xs tracking-wider">Neste módulo</h3>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                          {topicLessons.map((l, idx) => (
                              <button 
                                key={idx}
                                onClick={() => setSelectedLesson(l)}
                                className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all ${
                                    selectedLesson.title === l.title 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                    : 'bg-slate-900/50 hover:bg-slate-800 text-slate-400'
                                }`}
                              >
                                  <div className={`p-2 rounded-lg flex-shrink-0 ${selectedLesson.title === l.title ? 'bg-white/20' : 'bg-slate-800'}`}>
                                      <Play size={14} fill={selectedLesson.title === l.title ? "currentColor" : "none"} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{l.title}</p>
                                      <p className="text-[10px] opacity-70">{l.duration}</p>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- LESSON LIST (BY TOPIC) VIEW ---
  if (selectedTopic && selectedSubject) {
      const lessons = topicsWithLessons[selectedTopic] || [];
      return (
          <div className="space-y-6 animate-in slide-in-from-right">
             <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setSelectedTopic(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <ArrowLeft size={24} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {selectedSubject.name} <ChevronRight size={20} className="text-slate-500"/> {selectedTopic}
                    </h2>
                    <p className="text-slate-400 text-sm">Selecione uma aula para assistir.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lessons.map((lesson, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => handleLessonClick(lesson)}
                        className="glass-card p-4 rounded-xl flex items-center gap-4 hover:bg-white/5 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500"
                      >
                          <div className="w-16 h-12 bg-black/40 rounded-lg flex items-center justify-center text-indigo-400 group-hover:text-white overflow-hidden relative">
                               {/* Fake thumbnail overlay */}
                               <div className="absolute inset-0 bg-indigo-900/20 group-hover:bg-indigo-600/20 transition-colors" />
                               <PlayCircle size={24} className="relative z-10" />
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-white text-lg">{lesson.title}</h4>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                  <span className="flex items-center gap-1"><Video size={12} /> Vídeo Aula</span>
                                  <span>•</span>
                                  <span>{lesson.duration || '00:00'}</span>
                              </div>
                          </div>
                          <div className="p-2 bg-slate-800 rounded-full text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <Play size={16} fill="currentColor" />
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // --- TOPIC LIST VIEW ---
  if (selectedSubject) {
      const topics = Object.keys(topicsWithLessons);
      
      return (
          <div className="space-y-6 animate-in slide-in-from-right">
              <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setSelectedSubject(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <ArrowLeft size={24} />
                  </button>
                  <h2 className="text-3xl font-bold text-white">{selectedSubject.name}</h2>
              </div>

              {loadingContent ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>
              ) : topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {topics.map((topic, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => handleTopicClick(topic)}
                            className="glass-card p-6 rounded-2xl hover:bg-slate-800/60 transition-all text-left group border border-white/5 hover:border-indigo-500/30"
                          >
                              <div className="flex items-start justify-between mb-4">
                                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                      <Layers size={24} />
                                  </div>
                                  <span className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded-lg">
                                      {topicsWithLessons[topic].length} Aulas
                                  </span>
                              </div>
                              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">{topic}</h3>
                              <p className="text-sm text-slate-500">Clique para ver as aulas deste módulo.</p>
                          </button>
                      ))}
                  </div>
              ) : (
                  <div className="text-center p-12 border border-white/5 border-dashed rounded-xl">
                      <p className="text-slate-500">Nenhum conteúdo cadastrado para esta matéria ainda.</p>
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
            <h2 className="text-xl font-bold text-white mb-2">Nenhuma aula disponível</h2>
            <p className="max-w-md text-center">
                Parece que ainda não há aulas cadastradas no sistema.
                Acesse o painel administrativo para adicionar conteúdos.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Salas de Aula</h2>
        <p className="text-slate-400">Selecione uma matéria para acessar os módulos de estudo.</p>
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
