import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  History as HistoryIcon, 
  Zap, 
  Sparkles, 
  MessageCircle, 
  ArrowRight, 
  Loader2, 
  Plus, 
  Wallet, 
  X, 
  CheckCircle 
} from 'lucide-react';
import { UserProfile, ChatMessage, Transaction } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { auth } from '../services/firebaseConfig';

/* Fix: Define AiTutorProps interface to fix "Cannot find name 'AiTutorProps'" */
interface AiTutorProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
}

const AiTutor: React.FC<AiTutorProps> = ({ user, onUpdateUser }) => {
  /* Fix: Add missing state hooks used in the component */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('10');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Load transactions for history panel */
  useEffect(() => {
    const fetchTransactions = async () => {
      if (user.uid) {
        const data = await DatabaseService.getUserTransactions(user.uid);
        setTransactions(data.sort((a, b) => b.timestamp - a.timestamp));
      }
    };
    fetchTransactions();
  }, [user.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await AiService.sendMessage(input, messages, 'NeuroAI Mentor');
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Refresh balance and history after AI interaction
      if (auth.currentUser) {
        const updatedUser = await DatabaseService.getUserProfile(auth.currentUser.uid);
        if (updatedUser) onUpdateUser(updatedUser);
        const data = await DatabaseService.getUserTransactions(auth.currentUser.uid);
        setTransactions(data.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error: any) {
      alert(error.message || "Erro ao consultar a IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await DatabaseService.createRechargeRequest(
        auth.currentUser.uid,
        user.displayName,
        parseFloat(rechargeAmount),
        'BRL',
        undefined,
        'Recarga de Saldo NeuroAI'
      );
      alert("Solicitação de recarga enviada! Aguarde a aprovação.");
      setShowRechargeModal(false);
    } catch (error) {
      alert("Erro ao processar recarga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-h-[85vh] relative animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-indigo-400" /> NeuroAI Mentor
          </h2>
          <p className="text-slate-400 text-sm">Seu tutor pessoal de alta performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Saldo NeuroAI</p>
              <p className="text-lg font-bold text-white">R$ {user.balance.toFixed(2)}</p>
            </div>
            <button onClick={() => setShowRechargeModal(true)} className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all">
              <Plus size={20} />
            </button>
          </div>
          {/* Fix: Use HistoryIcon alias to avoid conflict with browser History API */}
          <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-xl border transition-all ${showHistory ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'}`}>
            <HistoryIcon size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-950/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <Bot size={64} className="text-indigo-500 stroke-1" />
                <div className="max-w-xs">
                  <p className="text-lg font-bold text-white">Como posso te ajudar hoje?</p>
                  <p className="text-sm text-slate-400">Tire dúvidas sobre matérias, peça dicas de estudo ou organize seu cronograma.</p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {msg.role === 'ai' ? <Bot size={20}/> : <User size={20}/>}
                </div>
                <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === 'ai' ? 'bg-slate-900 border border-white/10 text-slate-200' : 'bg-indigo-600 text-white'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={20}/>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 w-24 h-10"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/50 border-t border-white/5 relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida aqui..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-6 pr-14 text-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 shadow-lg"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        {/* History Panel (Side) - ONDE O VALOR É EXIBIDO AO USUÁRIO */}
        {showHistory && (
          <div className="w-80 flex-shrink-0 flex flex-col gap-4 animate-in slide-in-from-right duration-300">
            <div className="glass-card flex-1 rounded-[2.5rem] flex flex-col overflow-hidden border-white/10 shadow-2xl">
              <div className="p-6 border-b border-white/5 bg-slate-900/30">
                <h3 className="font-black text-slate-200 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                  <HistoryIcon size={16} className="text-indigo-400" /> Atividade NeuroAI
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {/* Fix: Check if transactions exist and use HistoryIcon alias */}
                {transactions && transactions.length > 0 ? transactions.map(t => (
                  <div key={t.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[120px]">{t.description}</span>
                      <span className={`text-xs font-mono font-bold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'credit' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                      <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                      {t.type === 'debit' && <span className="opacity-50 italic">Sessão Mentor</span>}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 opacity-20">
                    <HistoryIcon size={32} className="mx-auto mb-2"/>
                    <p className="text-[10px] font-black uppercase">Vazio</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-emerald-400" /> Recarregar Saldo
              </h3>
              <button onClick={() => setShowRechargeModal(false)} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <p className="text-slate-400 text-sm">A NeuroAI utiliza um sistema de saldo por uso para garantir a melhor tecnologia disponível.</p>
              <div className="grid grid-cols-3 gap-2">
                {['10', '20', '50'].map(val => (
                  <button 
                    key={val} 
                    onClick={() => setRechargeAmount(val)}
                    className={`py-3 rounded-xl border font-bold transition-all ${rechargeAmount === val ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400'}`}
                  >
                    R$ {val}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Valor Personalizado</label>
                <input 
                  type="number" 
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none" 
                  placeholder="0,00"
                />
              </div>
              <button onClick={handleRecharge} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                <CheckCircle size={20} /> Solicitar Créditos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiTutor;
