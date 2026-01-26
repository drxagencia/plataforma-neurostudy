
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { Subject, Question } from '../types';
import { ChevronRight, Filter, PlayCircle, Loader2, CheckCircle, XCircle, ArrowRight, Trophy, Bot, Sparkles, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { auth } from '../services/firebaseConfig';

// --- HELPER COMPONENT: Simple Markdown Parser ---
// Handles **bold** and newlines locally to save tokens
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    return (
        <div className="leading-relaxed">
            {text.split('\n').map((line, i) => (
                <p key={i} className="mb-2 last:mb-0">
                    {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} className="text-indigo-300 font-bold">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            ))}
        </div>
    );
};

// --- SUB-COMPONENT: Single Question Card ---
interface QuestionCardProps {
    question: Question;
    index: number;
    prevResult: { correct: boolean } | undefined;
    onAnswer: (qId: string, isCorrect: boolean) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, index, prevResult, onAnswer }) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(!!prevResult);
    const [isExplaining, setIsExplaining] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);

    const handleSelect = async (idx: number) => {
        if (isAnswered) return; // Prevent re-answering for XP spam
        setSelectedOption(idx);
        setIsAnswered(true);
        const isCorrect = idx === question.correctAnswer;
        
        // Notify Parent to update DB
        if (question.id) {
            onAnswer(question.id, isCorrect);
        }
    };

    const handleExplain = async () => {
        if (selectedOption === null) return;
        setIsExplaining(true);
        try {
            const wrongTxt = question.options[selectedOption];
            const correctTxt = question.options[question.correctAnswer];
            const text = await AiService.explainError(question.text, wrongTxt, correctTxt);
            setAiExplanation(text);
        } catch (e) {
            alert("Erro ao consultar tutor.");
        } finally {
            setIsExplaining(false);
        }
    };

    // Determine visual state
    const isCorrect = selectedOption === question.correctAnswer;
    const borderClass = !isAnswered 
        ? 'border-white/5 hover:border-white/20' 
        : (isCorrect || (prevResult?.correct)) 
            ? 'border-emerald-500/50 bg-emerald-900/10' 
            : 'border-red-500/50 bg-red-900/10';

    return (
        <div className={`glass-card p-6 rounded-2xl border transition-all duration-300 ${borderClass}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded">
                    Questão {index + 1}
                </span>
                {prevResult && (
                    <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${prevResult.correct ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {prevResult.correct ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                        {prevResult.correct ? 'Respondida (Correta)' : 'Respondida (Errada)'}
                    </span>
                )}
            </div>

            <div className="mb-6">
                <SimpleMarkdown text={question.text} />
                {question.imageUrl && (
                    <img src={question.imageUrl} className="mt-4 rounded-xl max-h-[200px] object-contain bg-black/20 border border-white/5" />
                )}
            </div>

            <div className="space-y-2">
                {question.options.map((opt, idx) => {
                    let btnClass = "bg-slate-900/40 border-slate-700 hover:bg-slate-800";
                    
                    // Show Correct Answer if answered
                    if (isAnswered || prevResult) {
                         if (idx === question.correctAnswer) btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-100";
                         else if (idx === selectedOption) btnClass = "bg-red-500/20 border-red-500 text-red-100";
                         else btnClass = "opacity-50 border-transparent";
                    } else if (selectedOption === idx) {
                        btnClass = "bg-indigo-500/20 border-indigo-500";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelect(idx)}
                            disabled={isAnswered || !!prevResult}
                            className={`w-full p-3 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${btnClass}`}
                        >
                            <span>{opt}</span>
                            {(isAnswered || prevResult) && idx === question.correctAnswer && <CheckCircle size={16} className="text-emerald-400"/>}
                        </button>
                    )
                })}
            </div>

            {/* Feedback & AI Section */}
            {(isAnswered && !isCorrect && !prevResult?.correct) && (
                <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
                    {!aiExplanation && !isExplaining ? (
                        <div className="flex items-center justify-between">
                            <span className="text-red-400 text-sm font-bold">Resposta Incorreta</span>
                            <button 
                                onClick={handleExplain}
                                className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Bot size={14} /> Explicar Erro (IA)
                            </button>
                        </div>
                    ) : (
                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl relative">
                            {isExplaining ? (
                                <div className="flex items-center gap-2 text-indigo-300 text-sm">
                                    <Loader2 className="animate-spin" size={14}/> O tutor está analisando...
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-bold uppercase">
                                        <Sparkles size={12} /> Explicação do Tutor
                                    </div>
                                    <div className="text-sm text-slate-200">
                                        <SimpleMarkdown text={aiExplanation || ''} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!aiExplanation && !isExplaining && question.explanation && (
                        <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-white/5">
                            <p className="text-xs text-slate-400"><strong className="text-slate-300">Gabarito:</strong> {question.explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const QuestionBank: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [subtopics, setSubtopics] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [answeredMap, setAnsweredMap] = useState<Record<string, {correct: boolean}>>({});

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('regular');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>('');
  const [hideAnswered, setHideAnswered] = useState(false);

  // List Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const [subs, tops, subtops, answered] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        DatabaseService.getSubTopics(),
        auth.currentUser ? DatabaseService.getAnsweredQuestions(auth.currentUser.uid) : Promise.resolve({})
      ]);
      
      // FIX 1: Filter subjects that actually have topics/content
      const validSubjects = subs.filter(s => tops[s.id] && tops[s.id].length > 0);
      
      setSubjects(validSubjects);
      setTopics(tops);
      setSubtopics(subtops);
      setAnsweredMap(answered);
      setLoading(false);
    };
    initData();
  }, []);

  const handleFetchQuestions = async () => {
      if (!selectedSubject || !selectedTopic) return;
      setListLoading(true);
      setQuestions([]); // Clear prev
      
      try {
        const fetched = await DatabaseService.getQuestions(selectedCategory, selectedSubject, selectedTopic, selectedSubTopic || undefined);
        setQuestions(fetched);
      } catch (e) {
          console.error(e);
      } finally {
        setListLoading(false);
      }
  };

  // Trigger fetch when filters change
  useEffect(() => {
      if (selectedSubject && selectedTopic) {
          handleFetchQuestions();
      } else {
          setQuestions([]);
      }
  }, [selectedSubject, selectedTopic, selectedSubTopic, selectedCategory]);

  const handleAnswerSubmit = async (qId: string, isCorrect: boolean) => {
      if (!auth.currentUser) return;
      
      // Optimistic update map
      setAnsweredMap(prev => ({...prev, [qId]: { correct: isCorrect }}));

      await DatabaseService.markQuestionAsAnswered(auth.currentUser.uid, qId, isCorrect);
      if (isCorrect) {
          await DatabaseService.addXp(auth.currentUser.uid, 10);
          await DatabaseService.incrementQuestionsAnswered(auth.currentUser.uid, 1);
      }
  };

  // Filter the displayed list based on "Hide Answered" toggle
  const displayedQuestions = questions.filter(q => {
      if (hideAnswered && q.id && answeredMap[q.id]) return false;
      return true;
  });

  const topicOptions = selectedSubject ? topics[selectedSubject] || [] : [];
  const subTopicOptions = selectedTopic ? subtopics[selectedTopic] || [] : [];

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="h-full flex flex-col animate-slide-up relative">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Banco de Questões</h2>
          <p className="text-slate-400">Pratique questões isoladas focando em suas dificuldades.</p>
        </div>
        
        <button 
            onClick={() => setHideAnswered(!hideAnswered)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold ${
                hideAnswered 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
        >
            {hideAnswered ? <EyeOff size={16}/> : <Eye size={16}/>}
            {hideAnswered ? 'Ocultando Feitas' : 'Mostrar Todas'}
        </button>
      </div>

      {/* FILTER BAR - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 flex-shrink-0 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
        {/* Category Select */}
        <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  // Optional: clear other selections if category changes logic substantially
              }}
              className="w-full appearance-none glass-input p-3 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm font-bold"
            >
              <option value="regular">ENEM / Vestibular</option>
              <option value="military">Militar (ESA/Espcex)</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" size={14} />
        </div>

        {/* Subject Select */}
        <div className="relative">
            <select
              value={selectedSubject}
              onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTopic('');
                  setSelectedSubTopic('');
              }}
              className="w-full appearance-none glass-input p-3 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm"
            >
              <option value="" disabled>Disciplina</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" size={14} />
        </div>

        {/* Topic Select */}
        <div className="relative">
            <select
              value={selectedTopic}
              onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setSelectedSubTopic('');
              }}
              disabled={!selectedSubject}
              className="w-full appearance-none glass-input p-3 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm disabled:opacity-50"
            >
              <option value="" disabled>Assunto</option>
              {topicOptions.map((t) => (
                <option key={t} value={t} className="bg-slate-900">{t}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" size={14} />
        </div>

        {/* Subtopic Select */}
        <div className="relative">
            <select
              value={selectedSubTopic}
              onChange={(e) => setSelectedSubTopic(e.target.value)}
              disabled={!selectedTopic}
              className="w-full appearance-none glass-input p-3 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm disabled:opacity-50"
            >
              <option value="" disabled>Específico (Opcional)</option>
              <option value="">Todos</option>
              {subTopicOptions.map((st) => (
                <option key={st} value={st} className="bg-slate-900">{st}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" size={14} />
        </div>
      </div>

      {/* QUESTION FEED */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
          {listLoading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-50">
                 <Loader2 className="animate-spin mb-4 text-indigo-500" size={32} />
                 <p className="text-slate-400">Buscando questões...</p>
             </div>
          ) : displayedQuestions.length > 0 ? (
             <div className="space-y-6 max-w-3xl mx-auto">
                 {displayedQuestions.map((q, idx) => (
                     <QuestionCard 
                        key={q.id || idx} 
                        index={idx} 
                        question={q} 
                        prevResult={q.id ? answeredMap[q.id] : undefined}
                        onAnswer={handleAnswerSubmit}
                     />
                 ))}
                 
                 <div className="text-center py-8">
                     <p className="text-slate-500 text-sm">Fim da lista para este filtro.</p>
                 </div>
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/5 rounded-2xl bg-slate-900/20">
                 {selectedSubject && selectedTopic ? (
                     <>
                        <Filter size={40} className="mb-4 opacity-30" />
                        <p>Nenhuma questão encontrada com esses filtros.</p>
                        {hideAnswered && <p className="text-xs mt-2 text-indigo-400">Tente desativar "Ocultar Feitas"</p>}
                     </>
                 ) : (
                     <>
                        <PlayCircle size={40} className="mb-4 opacity-30" />
                        <p>Selecione uma Matéria e um Assunto acima para começar.</p>
                     </>
                 )}
             </div>
          )}
      </div>
    </div>
  );
};

export default QuestionBank;
