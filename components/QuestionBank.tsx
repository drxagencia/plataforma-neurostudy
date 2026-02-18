
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { auth } from '../services/firebaseConfig';
import { Subject, Question, UserProfile } from '../types';
import { 
  Loader2, 
  Filter, 
  CheckCircle, 
  XCircle, 
  BrainCircuit, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Search,
  BookOpen
} from 'lucide-react';

interface QuestionBankProps {
  onUpdateUser: (u: UserProfile) => void;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ onUpdateUser }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [answeredMap, setAnsweredMap] = useState<Record<string, {correct: boolean, selectedOption?: number}>>({});

  // Filters
  const [isFilterOpen, setIsFilterOpen] = useState(true); 
  const [selectedCategory, setSelectedCategory] = useState<string>('regular');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>('');
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false); 
  
  // Dynamic Subtopics List
  const [subTopicsList, setSubTopicsList] = useState<string[]>([]);
  const [multiSubtopicsFilter, setMultiSubtopicsFilter] = useState<string[]>([]);

  // List Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Tools State
  const [userSelection, setUserSelection] = useState<number | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const pendingFilters = sessionStorage.getItem('qb_filters');
      if (pendingFilters) {
          try {
              const filters = JSON.parse(pendingFilters);
              setSelectedCategory(filters.category || 'regular');
              setSelectedSubject(filters.subject || '');
              setSelectedTopic(filters.topic || '');
              if (filters.subtopics && Array.isArray(filters.subtopics)) setMultiSubtopicsFilter(filters.subtopics);
              sessionStorage.removeItem('qb_filters');
          } catch (e) { console.error(e); }
      }

      const [subs, tops, answered] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        auth.currentUser ? DatabaseService.getAnsweredQuestions(auth.currentUser.uid) : Promise.resolve({})
      ]);
      
      const validSubjects = subs; // Show all subjects
      setSubjects(validSubjects);
      setTopics(tops);
      setAnsweredMap(answered);
      setLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
      const fetchSubtopics = async () => {
          if (selectedCategory && selectedSubject && selectedTopic) {
              const subs = await DatabaseService.getAvailableSubtopics(selectedCategory, selectedSubject, selectedTopic);
              setSubTopicsList(subs);
          } else {
              setSubTopicsList([]);
          }
      };
      fetchSubtopics();
  }, [selectedCategory, selectedSubject, selectedTopic]);

  const handleFetchQuestions = async () => {
      if (!selectedSubject || !selectedTopic) {
          alert("Selecione pelo menos uma Matéria e um Tópico.");
          return;
      }
      setListLoading(true);
      setHasSearched(true);
      setQuestions([]); 
      setCurrentIndex(0);
      setIsFilterOpen(false);
      setUserSelection(null);
      setAiExplanation(null);
      
      try {
        let fetched: Question[] = [];
        if (multiSubtopicsFilter.length > 0) {
            fetched = await DatabaseService.getQuestionsFromSubtopics(selectedCategory, selectedSubject, selectedTopic, multiSubtopicsFilter);
        } else {
            fetched = await DatabaseService.getQuestions(selectedCategory, selectedSubject, selectedTopic, selectedSubTopic || undefined);
        }

        // Apply "Show Unanswered Only" Filter
        if (showUnansweredOnly) {
            fetched = fetched.filter(q => q.id && !answeredMap[q.id]);
        }

        setQuestions(fetched);
      } catch (e) { console.error(e); } finally { setListLoading(false); }
  };

  const handleAnswerSubmit = async (optionIdx: number) => {
      const currentQ = questions[currentIndex];
      if (!auth.currentUser || !currentQ.id || answeredMap[currentQ.id]) return;

      const isCorrect = optionIdx === currentQ.correctAnswer;
      setUserSelection(optionIdx); 
      // Save local selection state immediately
      setAnsweredMap(prev => ({...prev, [currentQ.id!]: { correct: isCorrect, selectedOption: optionIdx }}));

      await DatabaseService.markQuestionAsAnswered(auth.currentUser.uid, currentQ.id, isCorrect, optionIdx, currentQ.subjectId, currentQ.topic);
      
      if (isCorrect) {
          await DatabaseService.processXpAction(auth.currentUser.uid, 'QUESTION_CORRECT');
          await DatabaseService.incrementQuestionsAnswered(auth.currentUser.uid, 1);
      } else {
          await DatabaseService.processXpAction(auth.currentUser.uid, 'QUESTION_WRONG');
      }
      setAiExplanation(null);
      
      // Update User Profile for XP balance
      const updatedProfile = await DatabaseService.getUserProfile(auth.currentUser.uid);
      if (updatedProfile) onUpdateUser(updatedProfile);
  };

  const handleExplain = async () => {
      const currentQ = questions[currentIndex];
      if (!currentQ) return;
      
      const correctTxt = currentQ.options[currentQ.correctAnswer];
      
      // FALLBACK LOGIC: If userSelection is null (reloaded page), try getting from answeredMap
      let wrongIdx = userSelection;
      if (wrongIdx === null && currentQ.id && answeredMap[currentQ.id]) {
          wrongIdx = answeredMap[currentQ.id].selectedOption ?? null;
      }

      let wrongTxt = "Não informado";
      if (wrongIdx !== null && wrongIdx !== undefined && currentQ.options[wrongIdx]) {
          wrongTxt = currentQ.options[wrongIdx];
      }

      setIsExplaining(true);
      try {
          const text = await AiService.explainError(currentQ.text, wrongTxt, correctTxt, currentQ.topic);
          setAiExplanation(text);
          if (auth.currentUser) {
              const u = await DatabaseService.getUserProfile(auth.currentUser.uid);
              if (u) onUpdateUser(u);
          }
      } catch (e: any) { alert(e.message); } finally { setIsExplaining(false); }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-20 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Banco de Questões</h2>
                <p className="text-slate-400">Pratique com milhares de questões organizadas.</p>
            </div>
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-3 rounded-xl border transition-all flex items-center gap-2 font-bold ${isFilterOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-white/10 text-slate-400'}`}
            >
                <Filter size={20} /> <span className="hidden md:inline">Filtros</span> {isFilterOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
        </div>

        {/* Filter Panel */}
        {isFilterOpen && (
            <div className="glass-card p-6 rounded-3xl border-indigo-500/20 animate-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Categoria</label>
                        <select className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                            <option value="regular">Regular (ENEM/Vestibular)</option>
                            <option value="military">Militar (ESA/ESPCEX)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Matéria</label>
                        <select 
                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" 
                            value={selectedSubject} 
                            onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(''); }}
                        >
                            <option value="">Selecione...</option>
                            {subjects.filter(s => s.category === selectedCategory).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Tópico</label>
                        <select 
                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" 
                            value={selectedTopic} 
                            onChange={e => setSelectedTopic(e.target.value)}
                            disabled={!selectedSubject}
                        >
                            <option value="">Todos os Tópicos</option>
                            {(topics[selectedSubject] || []).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-white/10 p-3 rounded-xl w-full hover:bg-slate-800 transition-colors">
                            <input type="checkbox" checked={showUnansweredOnly} onChange={e => setShowUnansweredOnly(e.target.checked)} className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"/>
                            <span className="text-sm font-bold text-slate-300">Apenas Não Respondidas</span>
                        </label>
                    </div>
                </div>
                <button 
                    onClick={handleFetchQuestions}
                    disabled={!selectedSubject || !selectedTopic}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    <Search size={20} /> Buscar Questões
                </button>
            </div>
        )}

        {/* Results Area */}
        {listLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={40}/></div>
        ) : hasSearched && questions.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl bg-slate-900/20">
                <FileQuestion size={48} className="mx-auto text-slate-600 mb-4 opacity-50"/>
                <h3 className="text-xl font-bold text-white">Nenhuma questão encontrada</h3>
                <p className="text-slate-500">Tente ajustar os filtros de busca.</p>
            </div>
        ) : questions.length > 0 ? (
            <div className="animate-in slide-in-from-bottom-4">
                {/* Progress Bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
                    <span className="font-bold">Questão {currentIndex + 1} de {questions.length}</span>
                    <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full mb-6 overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
                </div>

                {/* Question Card */}
                <div className="glass-card p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                    <span className="inline-block px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {questions[currentIndex].subtopic || questions[currentIndex].topic}
                    </span>
                    
                    <p className="text-lg md:text-xl text-white font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                        {questions[currentIndex].text}
                    </p>
                    
                    {questions[currentIndex].imageUrl && (
                        <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 bg-black/50">
                            <img src={questions[currentIndex].imageUrl} className="w-full max-h-[400px] object-contain" alt="Questão" />
                        </div>
                    )}

                    <div className="space-y-3">
                        {questions[currentIndex].options.map((opt, idx) => {
                            const qId = questions[currentIndex].id;
                            const isAnswered = qId && answeredMap[qId];
                            const isSelected = isAnswered && answeredMap[qId].selectedOption === idx;
                            const isCorrect = questions[currentIndex].correctAnswer === idx;
                            
                            let btnClass = "bg-slate-900/50 border-white/5 hover:bg-slate-800 text-slate-300";
                            if (isAnswered) {
                                if (isCorrect) btnClass = "bg-emerald-900/20 border-emerald-500/50 text-white";
                                else if (isSelected) btnClass = "bg-red-900/20 border-red-500/50 text-white";
                                else btnClass = "bg-slate-900/30 border-transparent text-slate-500 opacity-50";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswerSubmit(idx)}
                                    disabled={!!isAnswered}
                                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 group ${btnClass}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                        isAnswered && isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 
                                        isAnswered && isSelected ? 'bg-red-500 border-red-500 text-white' : 
                                        'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-indigo-500 group-hover:text-white'
                                    }`}>
                                        {String.fromCharCode(65+idx)}
                                    </div>
                                    <span className="flex-1">{opt}</span>
                                    {isAnswered && isCorrect && <CheckCircle size={20} className="text-emerald-500" />}
                                    {isAnswered && isSelected && !isCorrect && <XCircle size={20} className="text-red-500" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex gap-3">
                            {questions[currentIndex].id && answeredMap[questions[currentIndex].id!] && !answeredMap[questions[currentIndex].id!].correct && (
                                <button 
                                    onClick={handleExplain}
                                    disabled={isExplaining}
                                    className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors border border-indigo-500/30"
                                >
                                    {isExplaining ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={14}/>}
                                    Explicar Erro (IA)
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                             <button 
                                disabled={currentIndex === 0}
                                onClick={() => { setCurrentIndex(i => i - 1); setAiExplanation(null); setUserSelection(null); }}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
                             >
                                 Anterior
                             </button>
                             <button 
                                disabled={currentIndex === questions.length - 1}
                                onClick={() => { setCurrentIndex(i => i + 1); setAiExplanation(null); setUserSelection(null); }}
                                className="px-6 py-3 bg-white text-black hover:bg-indigo-50 disabled:opacity-50 rounded-xl font-bold transition-colors flex items-center gap-2"
                             >
                                 Próxima <ArrowRight size={18} />
                             </button>
                        </div>
                    </div>

                    {/* AI Explanation Box */}
                    {aiExplanation && (
                        <div className="mt-6 p-6 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
                             <h4 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">
                                 <BrainCircuit size={16}/> Explicação do NeuroTutor
                             </h4>
                             <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="text-center py-20">
                <BookOpen size={64} className="mx-auto text-slate-700 mb-6"/>
                <h3 className="text-2xl font-bold text-white mb-2">Vamos praticar?</h3>
                <p className="text-slate-400">Utilize os filtros acima para encontrar questões.</p>
            </div>
        )}
    </div>
  );
};

export default QuestionBank;
