
import React, { useEffect, useState, useMemo } from 'react';
import { DatabaseService } from '../services/databaseService';
import { Subject, Lesson } from '../types';
import * as Icons from 'lucide-react';
import { Loader2, BookX, ArrowLeft, PlayCircle, Video, Layers, ChevronRight, Play, FileText, ExternalLink, Clock, MonitorPlay, GraduationCap } from 'lucide-react';

// --- OPTIMIZED VIDEO PLAYER COMPONENT ---
// This component is memoized to prevent re-renders of the iframe when parent state changes
const VideoPlayer = React.memo(({ videoId, title }: { videoId: string, title: string }) => {
    const [isLoading, setIsLoading] = useState(true);

    // Reset loading state when video changes
    useEffect(() => {
        setIsLoading(true);
    }, [videoId]);

    return (
        <div className="relative aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-800 ring-1 ring-white/10 group">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                    <Loader2 className="animate-spin text-indigo-500" size={48} />
                </div>
            )}
            <iframe 
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&enablejsapi=1&origin=${window.location.origin}`} 
                title={title}
                className={`w-full h-full transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                loading="eager"
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
});

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
      // Scroll to top when selecting a lesson
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
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
          <div className="space-y-6 animate-in slide-in-from-right max-w-[1600px] mx-auto">
              <button onClick={() => setSelectedLesson(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors group">
                  <div className="p-2 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors">
                    <ArrowLeft size={18} />
                  </div>
                  <span className="font-medium text-sm">Voltar para {selectedTopic}</span>
              </button>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left Column: Video & Details */}
                  <div className="xl:col-span-2 space-y-6">
                      
                      {/* Optimized Player Component */}
                      {videoId ? (
                          <VideoPlayer videoId={videoId} title={selectedLesson.title} />
                      ) : (
                          <div className="relative aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-800 flex flex-col items-center justify-center text-slate-500">
                              <Video size={64} className="mb-4 opacity-20" />
                              <p className="text-lg font-medium">Vídeo indisponível ou link inválido.</p>
                          </div>
                      )}
                      
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-white/5">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">{selectedLesson.title}</h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">{selectedSubject.name}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-300 font-medium">{selectedTopic}</span>
                                <span className="text-slate-500">•</span>
                                <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded-lg border border-white/5">
                                    <Clock size={14} /> 
                                    <span>{selectedLesson.duration || '00:00'}</span>
                                </div>
                            </div>
                        </div>
                      </div>

                      {/* Materials Section */}
                      <div className="space-y-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <FileText size={20} className="text-indigo-400" /> 
                              Materiais Complementares
                          </h3>
                          
                          {selectedLesson.materials && selectedLesson.materials.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {selectedLesson.materials.map((material, idx) => (
                                      <a 
                                        key={idx}
                                        href={material.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all group relative overflow-hidden"
                                      >
                                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          
                                          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-all shadow-lg">
                                              <FileText size={24} />
                                          </div>
                                          
                                          <div className="flex-1 min-w-0 z-10">
                                              <p className="font-bold text-slate-200 group-hover:text-white truncate transition-colors">{material.title}</p>
                                              <p className="text-xs text-slate-500 group-hover:text-slate-400">Clique para acessar</p>
                                          </div>
                                          
                                          <ExternalLink size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                      </a>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/30 border border-white/5 text-slate-500">
                                  <BookX size={20} />
                                  <span className="text-sm">Nenhum material anexado a esta aula.</span>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Right Column: Playlist */}
                  <div className="xl:col-span-1">
                      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[calc(100vh-100px)] sticky top-6">
                          <div className="p-5 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm">
                              <h3 className="font-bold text-white flex items-center gap-2">
                                  <Layers size={18} className="text-indigo-400"/> 
                                  Conteúdo do Módulo
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{topicLessons.length} aulas disponíveis</p>
                          </div>
                          
                          <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                              {topicLessons.map((l, idx) => {
                                  const isActive = selectedLesson.title === l.title;
                                  return (
                                    <button 
                                        key={idx}
                                        onClick={() => handleLessonClick(l)}
                                        className={`w-full p-3 rounded-xl flex items-start gap-3 text-left transition-all duration-200 group relative overflow-hidden ${
                                            isActive 
                                            ? 'bg-indigo-600/10 border border-indigo-500/20' 
                                            : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />}
                                        
                                        <div className="relative mt-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                                isActive ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-500'
                                            }`}>
                                                {isActive ? <Play size={10} fill="currentColor"/> : idx + 1}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium text-sm leading-snug ${isActive ? 'text-indigo-200' : 'text-slate-300 group-hover:text-white'}`}>
                                                {l.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                                                    <Clock size={10} /> {l.duration}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                  );
                              })}
                          </div>
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
          <div className="space-y-8 animate-in slide-in-from-right max-w-6xl mx-auto">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedTopic(null)} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-full transition-colors border border-white/5">
                        <ArrowLeft size={24} className="text-slate-300" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                            <span>{selectedSubject.name}</span>
                            <ChevronRight size={12} />
                            <span>Módulo</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white">{selectedTopic}</h2>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5 text-sm text-slate-400 font-medium">
                      {lessons.length} aulas encontradas
                  </div>
              </div>

              {/* List of Lessons */}
              <div className="grid grid-cols-1 gap-4">
                  {lessons.map((lesson, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => handleLessonClick(lesson)}
                        className="group glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center gap-6 hover:bg-slate-900/80 transition-all cursor-pointer border border-white/5 hover:border-indigo-500/40 relative overflow-hidden"
                      >
                          {/* Hover Glow */}
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/0 via-indigo-900/0 to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          {/* Fake Thumbnail / Icon Area */}
                          <div className="w-full md:w-48 h-32 md:h-28 flex-shrink-0 bg-slate-950 rounded-xl relative overflow-hidden border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                               {/* Abstract Pattern */}
                               <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
                               
                               <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:text-white transition-all shadow-xl">
                                        <Play size={20} fill="currentColor" className="ml-1" />
                                    </div>
                               </div>
                               
                               {/* Duration Badge on Thumbnail */}
                               <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                                   <Clock size={10} /> {lesson.duration || '00:00'}
                               </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 w-full md:w-auto z-10">
                              <h4 className="font-bold text-white text-lg mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">{lesson.title}</h4>
                              <p className="text-slate-400 text-sm line-clamp-2">
                                  Nesta aula, abordaremos os conceitos fundamentais de {selectedTopic.toLowerCase()}, com exercícios práticos e exemplos.
                              </p>
                              
                              <div className="flex items-center gap-4 mt-4">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded-md">
                                      <Video size={12} /> Aula Gravada
                                  </div>
                                  {lesson.materials && lesson.materials.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded-md">
                                        <FileText size={12} /> {lesson.materials.length} Materiais
                                    </div>
                                  )}
                              </div>
                          </div>

                          {/* Action Arrow */}
                          <div className="hidden md:flex p-4 rounded-full bg-slate-900/50 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:translate-x-2">
                              <ChevronRight size={24} />
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
          <div className="space-y-8 animate-in slide-in-from-right max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                  <button onClick={() => setSelectedSubject(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                      <ArrowLeft size={28} className="text-slate-200" />
                  </button>
                  <div>
                      <h2 className="text-4xl font-bold text-white mb-1">{selectedSubject.name}</h2>
                      <p className="text-slate-400">Selecione um tópico para visualizar as aulas disponíveis.</p>
                  </div>
              </div>

              {loadingContent ? (
                  <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
              ) : topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {topics.map((topic, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => handleTopicClick(topic)}
                            className="glass-card p-0 rounded-2xl hover:bg-slate-900/60 transition-all text-left group border border-white/5 hover:border-indigo-500/40 relative overflow-hidden h-full flex flex-col"
                          >
                              {/* Top Banner Accent */}
                              <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                              
                              <div className="p-6 flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-6">
                                      <div className="p-3 bg-slate-900 rounded-xl text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                                          <Layers size={28} />
                                      </div>
                                      <div className="px-3 py-1 rounded-full bg-slate-950 border border-white/5 text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                          {topicsWithLessons[topic].length} Aulas
                                      </div>
                                  </div>
                                  
                                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors leading-tight">{topic}</h3>
                                  <p className="text-sm text-slate-500 mt-auto pt-4 group-hover:text-slate-400 transition-colors flex items-center gap-1">
                                      Ver conteúdo <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                                  </p>
                              </div>
                          </button>
                      ))}
                  </div>
              ) : (
                  <div className="text-center p-20 border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20">
                      <GraduationCap size={48} className="mx-auto text-slate-700 mb-4"/>
                      <p className="text-slate-400 text-lg font-medium">Nenhum conteúdo cadastrado para esta matéria ainda.</p>
                      <p className="text-slate-600 text-sm mt-2">Volte mais tarde ou contate o administrador.</p>
                  </div>
              )}
          </div>
      );
  }

  // --- SUBJECT LIST VIEW ---
  if (subjects.length === 0) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 animate-in fade-in">
            <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                <BookX size={48} className="text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Nenhuma aula disponível</h2>
            <p className="max-w-md text-center text-slate-400">
                Parece que ainda não há aulas cadastradas no sistema.
                Acesse o painel administrativo para adicionar conteúdos.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500 max-w-7xl mx-auto">
      <header className="relative z-10">
        <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">Salas de Aula</h2>
        <p className="text-slate-400 text-lg max-w-2xl">
            Explore nossa biblioteca de conteúdos. Selecione uma matéria para acessar os módulos de estudo detalhados.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {subjects.map((subject) => {
          // Dynamic icon rendering
          const IconComponent = (Icons as any)[subject.iconName] || Icons.Book;

          return (
            <button
              key={subject.id}
              onClick={() => handleSubjectClick(subject)}
              className="relative group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/60 transition-all duration-300 flex flex-col items-center justify-center gap-5 text-center overflow-hidden h-64"
            >
              {/* Background Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className={`absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700`} />
              
              <div className={`p-5 rounded-2xl bg-slate-950 shadow-2xl group-hover:scale-110 transition-transform duration-500 border border-white/10 ${subject.color} relative z-10 group-hover:shadow-indigo-500/20`}>
                <IconComponent size={40} strokeWidth={1.5} />
              </div>
              
              <div className="relative z-10">
                  <span className="text-slate-200 font-bold text-xl block group-hover:text-white transition-colors mb-1">
                    {subject.name}
                  </span>
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold group-hover:text-indigo-400 transition-colors">
                      {subject.category === 'military' ? 'Militar' : 'Regular'}
                  </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Classes;
