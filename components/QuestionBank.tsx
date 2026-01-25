import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { Subject, Question } from '../types';
import { ChevronRight, Filter, PlayCircle, Loader2, CheckCircle, XCircle, ArrowRight, Trophy, Bot, Sparkles } from 'lucide-react';
import { auth } from '../services/firebaseConfig';

const QuestionBank: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [subtopics, setSubtopics] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);

  // Quiz State
  const [quizActive, setQuizActive] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  // AI Explanation State
  const [showExplanationPrompt, setShowExplanationPrompt] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      const [subs, tops, subtops] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        DatabaseService.getSubTopics()
      ]);
      setSubjects(subs);
      setTopics(tops);
      setSubtopics(subtops);
      setLoading(false);
    };
    initData();
  }, []);

  const topicOptions = selectedSubject ? topics[selectedSubject] || [] : [];
  const subTopicOptions = selectedTopic ? subtopics[selectedTopic] || [] : [];

  const handleStartQuiz = async () => {
    if (!selectedSubject || !selectedTopic) return;
    setLoading(true);
    const fetchedQuestions = await DatabaseService.getQuestions(selectedSubject, selectedTopic, selectedSubTopic || undefined);
    setLoading(false);

    if (fetchedQuestions.length > 0) {
        setQuestions(fetchedQuestions);
        setQuizActive(true);
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResult(false);
        setXpEarned(0);
        resetQuestionState();
    } else {
        alert("Nenhuma questão encontrada para este filtro no momento.");
    }
  };

  const resetQuestionState = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setShowExplanationPrompt(false);
    setAiExplanation(null);
    setIsExplaining(false);
  };

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === questions[currentQuestionIndex].correctAnswer;
    if (isCorrect) {
        setScore(score + 1);
    } else {
        // Wrong answer: Trigger AI help prompt
        setShowExplanationPrompt(true);
    }
  };

  const handleRequestExplanation = async () => {
    setShowExplanationPrompt(false);
    setIsExplaining(true);
    const question = questions[currentQuestionIndex];
    const wrongAnswer = question.options[selectedOption!];
    const correctAnswer = question.options[question.correctAnswer];
    
    const explanation = await AiService.explainError(question.text, wrongAnswer, correctAnswer);
    setAiExplanation(explanation);
    setIsExplaining(false);
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        resetQuestionState();
    } else {
        // Finish Quiz
        const finalXp = score * 10; // 10 XP per correct answer
        if (auth.currentUser) {
            if (finalXp > 0) {
                await DatabaseService.addXp(auth.currentUser.uid, finalXp);
            }
            // Increment Stats
            await DatabaseService.incrementQuestionsAnswered(auth.currentUser.uid, questions.length);
        }
        setXpEarned(finalXp);
        setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setQuizActive(false);
    resetQuestionState();
    setShowResult(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  // --- QUIZ ACTIVE VIEW ---
  if (quizActive) {
    if (showResult) {
        return (
            <div className="h-full flex items-center justify-center animate-in zoom-in-95">
                <div className="text-center glass-card p-10 rounded-3xl max-w-md w-full">
                    <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
                        <Trophy size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Quiz Finalizado!</h2>
                    <p className="text-slate-400 mb-6">Você acertou <strong className="text-white">{score}</strong> de <strong className="text-white">{questions.length}</strong> questões.</p>
                    
                    {xpEarned > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-8">
                            <p className="text-emerald-400 font-bold text-lg">+{xpEarned} XP Ganho!</p>
                        </div>
                    )}

                    <button 
                        onClick={resetQuiz}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors"
                    >
                        Voltar ao Banco
                    </button>
                </div>
            </div>
        );
    }

    const question = questions[currentQuestionIndex];
    return (
        <div className="max-w-3xl mx-auto h-full flex flex-col pt-4 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
                <button onClick={resetQuiz} className="text-slate-500 hover:text-white text-sm">Cancelar</button>
                <div className="text-slate-400 text-sm font-medium bg-white/5 px-3 py-1 rounded-full">Questão {currentQuestionIndex + 1} / {questions.length}</div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full mb-8 overflow-hidden">
                <div 
                    className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-all duration-300" 
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`}}
                />
            </div>

            <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
                <div className="glass-card rounded-2xl p-6 md:p-8 mb-6">
                    {/* Optional Image */}
                    {question.imageUrl && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-white/10">
                            <img src={question.imageUrl} alt="Questão" className="w-full h-auto max-h-[400px] object-contain bg-black/40" />
                        </div>
                    )}
                    <p className="text-lg md:text-xl text-white leading-relaxed font-medium">
                        {question.text}
                    </p>
                </div>

                <div className="space-y-3">
                    {question.options.map((option, idx) => {
                        let stateStyles = "bg-slate-900/40 border-slate-700 hover:bg-slate-800 hover:border-slate-500";
                        if (isAnswered) {
                            if (idx === question.correctAnswer) stateStyles = "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
                            else if (idx === selectedOption) stateStyles = "bg-red-500/20 border-red-500/50 text-red-100";
                            else stateStyles = "bg-slate-900/40 border-slate-800 opacity-50";
                        } else if (selectedOption === idx) {
                            stateStyles = "bg-indigo-500/20 border-indigo-500";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={isAnswered}
                                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${stateStyles}`}
                            >
                                <span className="flex-1">{option}</span>
                                {isAnswered && idx === question.correctAnswer && <CheckCircle size={20} className="text-emerald-400" />}
                                {isAnswered && idx === selectedOption && idx !== question.correctAnswer && <XCircle size={20} className="text-red-400" />}
                            </button>
                        );
                    })}
                </div>

                {isAnswered && (
                    <div className="mt-8 animate-fade-in space-y-4">
                         {selectedOption !== question.correctAnswer && (
                            <div className="space-y-4">
                                {/* AI Help Trigger */}
                                {showExplanationPrompt && !aiExplanation && !isExplaining && (
                                    <div className="glass-card bg-indigo-600/20 border-indigo-500/30 p-4 rounded-xl flex items-center justify-between animate-pulse-slow">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500 rounded-full text-white"><Bot size={20}/></div>
                                            <span className="text-indigo-200 font-bold">Quer saber porque tu errou essa, chefe?</span>
                                        </div>
                                        <button 
                                            onClick={handleRequestExplanation}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors"
                                        >
                                            Sim, explica aí
                                        </button>
                                    </div>
                                )}

                                {/* Loading AI */}
                                {isExplaining && (
                                    <div className="flex items-center gap-3 text-indigo-300 p-4">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span className="text-sm font-medium">Analisando seu erro com calma...</span>
                                    </div>
                                )}

                                {/* AI Explanation Result */}
                                {aiExplanation && (
                                    <div className="glass-card bg-purple-900/20 border-purple-500/30 p-6 rounded-xl animate-fade-in relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-12 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
                                        <div className="flex items-start gap-3 relative z-10">
                                            <Sparkles className="text-purple-400 shrink-0 mt-1" size={20} />
                                            <div>
                                                <h4 className="font-bold text-purple-300 mb-2 text-sm uppercase tracking-wide">Explicação do Tutor</h4>
                                                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Standard Static Explanation (Fallback) */}
                                {!aiExplanation && !isExplaining && (
                                     <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                         <p className="text-sm text-slate-400">
                                             <span className="font-bold text-slate-300">Gabarito:</span> {question.explanation || "Sem explicação cadastrada."}
                                         </p>
                                     </div>
                                )}
                            </div>
                         )}

                        <button 
                            onClick={handleNext}
                            className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            {currentQuestionIndex === questions.length - 1 ? 'Finalizar' : 'Próxima Questão'}
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
  }

  // --- FILTERS VIEW ---
  const isReady = selectedSubject && selectedTopic && selectedSubTopic;

  return (
    <div className="h-full flex flex-col max-h-[85vh] animate-slide-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Banco de Questões</h2>
          <p className="text-slate-400">Monte seu caderno de exercícios personalizado.</p>
        </div>
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <Filter className="text-indigo-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Subject Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500 ml-1">Disciplina</label>
          <div className="relative">
            <select
              value={selectedSubject || ''}
              onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTopic(null);
                  setSelectedSubTopic(null);
              }}
              className="w-full appearance-none glass-card p-4 rounded-xl focus:outline-none focus:border-indigo-500 transition-all cursor-pointer text-white"
            >
              <option value="" disabled>Selecione a matéria</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
        </div>

        {/* Topic Select */}
        <div className={`space-y-2 transition-opacity duration-300 ${!selectedSubject ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <label className="text-xs font-bold uppercase text-slate-500 ml-1">Assunto</label>
          <div className="relative">
            <select
              value={selectedTopic || ''}
              onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setSelectedSubTopic(null);
              }}
              disabled={!selectedSubject}
              className="w-full appearance-none glass-card p-4 rounded-xl focus:outline-none focus:border-indigo-500 transition-all cursor-pointer text-white"
            >
              <option value="" disabled>Selecione o assunto</option>
              {topicOptions.map((t) => (
                <option key={t} value={t} className="bg-slate-900">{t}</option>
              ))}
              {!topicOptions.length && selectedSubject && <option disabled>Sem tópicos cadastrados</option>}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
        </div>

        {/* Subtopic Select */}
        <div className={`space-y-2 transition-opacity duration-300 ${!selectedTopic ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <label className="text-xs font-bold uppercase text-slate-500 ml-1">Específico</label>
          <div className="relative">
            <select
              value={selectedSubTopic || ''}
              onChange={(e) => setSelectedSubTopic(e.target.value)}
              disabled={!selectedTopic}
              className="w-full appearance-none glass-card p-4 rounded-xl focus:outline-none focus:border-indigo-500 transition-all cursor-pointer text-white"
            >
              <option value="" disabled>Selecione o subtópico</option>
              {subTopicOptions.map((st) => (
                <option key={st} value={st} className="bg-slate-900">{st}</option>
              ))}
              {!subTopicOptions.length && selectedTopic && <option disabled>Geral</option>}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center p-12 transition-all duration-500 ${isReady ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-transparent'}`}>
        {isReady ? (
          <div className="text-center animate-in zoom-in-90">
            <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(99,102,241,0.5)]">
              <PlayCircle size={40} className="text-white ml-1" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Tudo pronto!</h3>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              Gerando bateria de questões sobre <strong>{selectedSubTopic}</strong> em {selectedTopic}.
            </p>
            <button 
                onClick={handleStartQuiz}
                className="px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 hover:scale-105 transition-all shadow-xl"
            >
              Iniciar Exercícios
            </button>
          </div>
        ) : (
          <div className="text-center text-slate-600">
            <Filter size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Use os filtros acima para gerar seu caderno de questões.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;