import React, { useState } from 'react';
import { SUBJECTS, MOCK_TOPICS, MOCK_SUBTOPICS } from '../constants';
import { ChevronRight, Filter, PlayCircle } from 'lucide-react';

const QuestionBank: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);

  // Derived state options
  const topicOptions = selectedSubject ? MOCK_TOPICS[selectedSubject] || [] : [];
  const subTopicOptions = selectedTopic ? MOCK_SUBTOPICS[selectedTopic] || [] : [];

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubject(e.target.value);
    setSelectedTopic(null);
    setSelectedSubTopic(null);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTopic(e.target.value);
    setSelectedSubTopic(null);
  };

  const isReady = selectedSubject && selectedTopic && selectedSubTopic;

  return (
    <div className="h-full flex flex-col max-h-[85vh]">
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
          <label className="text-sm font-medium text-slate-300 ml-1">Disciplina</label>
          <div className="relative">
            <select
              value={selectedSubject || ''}
              onChange={handleSubjectChange}
              className="w-full appearance-none bg-slate-900 border border-slate-700 hover:border-slate-500 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="" disabled>Selecione a matéria</option>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
        </div>

        {/* Topic Select */}
        <div className={`space-y-2 transition-opacity duration-300 ${!selectedSubject ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <label className="text-sm font-medium text-slate-300 ml-1">Assunto</label>
          <div className="relative">
            <select
              value={selectedTopic || ''}
              onChange={handleTopicChange}
              disabled={!selectedSubject}
              className="w-full appearance-none bg-slate-900 border border-slate-700 hover:border-slate-500 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer disabled:bg-slate-950 disabled:border-slate-800 disabled:text-slate-600"
            >
              <option value="" disabled>Selecione o assunto</option>
              {topicOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              {!topicOptions.length && selectedSubject && <option disabled>Sem tópicos disponíveis (Demo)</option>}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
        </div>

        {/* Subtopic Select */}
        <div className={`space-y-2 transition-opacity duration-300 ${!selectedTopic ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <label className="text-sm font-medium text-slate-300 ml-1">Específico</label>
          <div className="relative">
            <select
              value={selectedSubTopic || ''}
              onChange={(e) => setSelectedSubTopic(e.target.value)}
              disabled={!selectedTopic}
              className="w-full appearance-none bg-slate-900 border border-slate-700 hover:border-slate-500 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer disabled:bg-slate-950 disabled:border-slate-800 disabled:text-slate-600"
            >
              <option value="" disabled>Selecione o subtópico</option>
              {subTopicOptions.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
              {!subTopicOptions.length && selectedTopic && <option disabled>Geral</option>}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center p-12 transition-all duration-500 ${isReady ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-slate-900/30'}`}>
        {isReady ? (
          <div className="text-center animate-in zoom-in-90">
            <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
              <PlayCircle size={40} className="text-white ml-1" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Tudo pronto!</h3>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              Encontramos <strong>42 questões</strong> sobre {selectedSubTopic} em {selectedTopic}.
            </p>
            <button className="px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 hover:scale-105 transition-all shadow-xl">
              Iniciar Bateria de Questões
            </button>
          </div>
        ) : (
          <div className="text-center text-slate-500">
            <Filter size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">Use os filtros acima para gerar seu caderno de questões.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;