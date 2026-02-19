
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  History as HistoryIcon, 
  Sparkles, 
  Loader2, 
  X, 
  Crown,
  CreditCard,
  QrCode,
  Copy,
  Lock,
  Check,
  Zap,
  ArrowRight,
  Calendar,
  Clock
} from 'lucide-react';
import { UserProfile, ChatMessage, Transaction } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { PixService } from '../services/pixService';
import { auth } from '../services/firebaseConfig';
import { KIRVANO_LINKS } from '../constants';

interface AiTutorProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onShowUpgrade: () => void; // New prop to trigger modal from App
}

const AiTutor: React.FC<AiTutorProps> = ({ user, onUpdateUser, onShowUpgrade }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Legacy Unlimited Plan State (Kept for backwards compatibility if needed, but primary is now UpgradeModal)
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- AUTOMATIC CHECK: AI UNLIMITED EXPIRATION ---
  useEffect(() => {
      // Logic handled via isAiActive calculation and API backend check
  }, [user]);

  // Check Subscription Status or Advanced Plan
  const hasValidExpiry = user.aiUnlimitedExpiry 
    ? new Date(user.aiUnlimitedExpiry).getTime() > Date.now() 
    : false;

  // Se 'expirado', forçar false
  // Lógica Hierárquica:
  // 1. Expirado? -> False
  // 2. Admin? -> True
  // 3. Tem Data? -> Usa a validade da data (Ignora Flag)
  // 4. Sem Data? -> Usa a Flag
  const isAiActive = user.ia_ilimitada === 'expirado' ? false :
    (user.plan === 'admin') ? true :
    (user.aiUnlimitedExpiry) ? hasValidExpiry :
    (user.ia_ilimitada === true || user.ia_ilimitada === "true");

  const expiryDate = user.aiUnlimitedExpiry 
    ? new Date(user.aiUnlimitedExpiry).toLocaleDateString() 
    : (user.ia_ilimitada ? 'Ilimitado' : null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (user.uid) {
        const data = await DatabaseService.getUserTransactions(user.uid);
        setTransactions(data.filter(t => t.description.includes('NeuroAI') || t.description.includes('IA')).sort((a, b) => b.timestamp - a.timestamp));
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

    // --- ENGENHARIA SOCIAL / CONVERSÃO PARA BASIC ---
    if (!isAiActive) {
        // Simula delay de "pensamento" da IA
        setTimeout(() => {
            const upsellMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "UPSELL_TRIGGER" // Special flag to render the component
            };
            setMessages(prev => [...prev, upsellMessage]);
            setLoading(false);
        }, 1500);
        return;
    }

    try {
      const response = await AiService.sendMessage(input, messages, 'NeuroAI Mentor');
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response
      };
      setMessages(prev => [...prev, aiMessage]);
      
      if (auth.currentUser) {
        const updatedUser = await DatabaseService.getUserProfile(auth.currentUser.uid);
        if (updatedUser) onUpdateUser(updatedUser);
      }
    } catch (error: any) {
        // Se a API retornar que o plano expirou, o front deve reagir
        if (error.message && error.message.includes('expirou')) {
             onUpdateUser({ ...user, ia_ilimitada: 'expirado' }); // Força atualização local
             const upsellMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "UPSELL_TRIGGER"
            };
            setMessages(prev => [...prev, upsellMessage]);
        } else {
            alert(error.message || "Erro ao consultar a IA.");
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-h-[85vh] relative animate-slide-up">
      {/* Header Atualizado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-indigo-400" /> NeuroAI Mentor
          </h2>
          <p className="text-slate-400 text-sm">Seu tutor pessoal 24 horas.</p>
        </div>
        <div className="flex items-center gap-3">
          
          {/* Status Indicator */}
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${isAiActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-900 border-white/10'}`}>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Status Assinatura</p>
              <p className={`text-sm font-bold flex items-center justify-end gap-1 ${isAiActive ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {isAiActive ? <><Check size={14}/> {expiryDate === 'Ilimitado' ? 'Vitalício' : `Ativo até ${expiryDate}`}</> : 'Acesso Limitado'}
              </p>
            </div>
            {!isAiActive && (
                <button onClick={onShowUpgrade} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg animate-pulse-slow transition-colors" title="Desbloquear">
                    <Lock size={20} />
                </button>
            )}
          </div>

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
                  <p className="text-sm text-slate-400">
                      {isAiActive 
                        ? "Tire dúvidas sobre matérias, peça dicas de estudo ou organize seu cronograma." 
                        : "Digite sua dúvida para ver uma demonstração da capacidade do NeuroAI."}
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {msg.role === 'ai' ? <Bot size={20}/> : <User size={20}/>}
                </div>
                
                {/* Custom Content for Basic/Non-Subscriber User Upsell */}
                {msg.content === 'UPSELL_TRIGGER' ? (
                    <div className="p-6 rounded-3xl max-w-2xl w-full bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.15)] relative overflow-hidden group mx-auto">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-[40px] group-hover:bg-indigo-600/20 transition-all" />
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400"><Lock size={18} /></div>
                            <h4 className="font-bold text-white text-lg uppercase tracking-wide">
                                {user.ia_ilimitada === 'expirado' ? 'Plano Expirado' : 'Resposta Bloqueada'}
                            </h4>
                        </div>
                        
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            {user.ia_ilimitada === 'expirado' 
                                ? "Seu período de IA Ilimitada chegou ao fim. Renove agora para continuar aprendendo sem limites."
                                : "Eu tenho a resposta exata para sua dúvida, incluindo exemplos práticos. Escolha um plano de IA Ilimitada para continuar:"}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            {/* PLANO SEMANAL */}
                            <a href={KIRVANO_LINKS.ai_weekly} target="_blank" rel="noopener noreferrer" className="flex flex-col p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all text-center group/card">
                                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Semanal</div>
                                <div className="text-xl font-black text-white mb-1">R$ 9,90</div>
                                <div className="text-[10px] text-slate-500 group-hover/card:text-indigo-300">Acesso por 7 dias</div>
                            </a>

                            {/* PLANO MENSAL */}
                            <a href={KIRVANO_LINKS.ai_monthly} target="_blank" rel="noopener noreferrer" className="flex flex-col p-4 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all text-center relative shadow-lg">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Recomendado</div>
                                <div className="text-xs text-indigo-200 font-bold uppercase mb-1">Mensal</div>
                                <div className="text-xl font-black text-white mb-1">R$ 19,90</div>
                                <div className="text-[10px] text-indigo-300">Renova mensalmente</div>
                            </a>

                            {/* PLANO ANUAL */}
                            <a href={KIRVANO_LINKS.ai_yearly} target="_blank" rel="noopener noreferrer" className="flex flex-col p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 transition-all text-center group/card">
                                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Anual</div>
                                <div className="text-xl font-black text-white mb-1">R$ 49,90</div>
                                <div className="text-[10px] text-emerald-400 font-bold">Melhor Valor</div>
                            </a>
                        </div>

                        <p className="text-[10px] text-center text-slate-500 mt-2">Satisfação garantida ou seu dinheiro de volta em 7 dias.</p>
                    </div>
                ) : (
                    <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === 'ai' ? 'bg-slate-900 border border-white/10 text-slate-200' : 'bg-indigo-600 text-white'}`}>
                        {msg.content}
                    </div>
                )}
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
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-6 pr-14 text-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
            </button>
          </form>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="w-80 flex-shrink-0 flex flex-col gap-4 animate-in slide-in-from-right duration-300">
            <div className="glass-card flex-1 rounded-[2.5rem] flex flex-col overflow-hidden border-white/10 shadow-2xl">
              <div className="p-6 border-b border-white/5 bg-slate-900/30">
                <h3 className="font-black text-slate-200 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                  <HistoryIcon size={16} className="text-indigo-400" /> Histórico
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  <p className="text-center text-slate-500 text-xs py-10">O histórico exibe apenas interações recentes.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiTutor;
