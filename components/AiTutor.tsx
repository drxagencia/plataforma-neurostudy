import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  History as HistoryIcon, 
  Zap, 
  Sparkles, 
  Loader2, 
  X, 
  Crown,
  CreditCard,
  QrCode,
  Copy,
  Lock,
  Check,
  CheckCircle
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
}

const AiTutor: React.FC<AiTutorProps> = ({ user, onUpdateUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Unlimited Plan State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [pixPayload, setPixPayload] = useState('');
  const [showPixPay, setShowPixPay] = useState(false);
  const [payerName, setPayerName] = useState('');
  const [pixLoading, setPixLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Subscription Status
  const isAiActive = user.aiUnlimitedExpiry 
    ? new Date(user.aiUnlimitedExpiry).getTime() > Date.now() 
    : false;

  const expiryDate = user.aiUnlimitedExpiry 
    ? new Date(user.aiUnlimitedExpiry).toLocaleDateString() 
    : null;

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

    // BLOQUEIO DE ACESSO SE NÃO TIVER PLANO ATIVO
    if (!isAiActive) {
        setShowPlanModal(true);
        return;
    }

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
      
      if (auth.currentUser) {
        const updatedUser = await DatabaseService.getUserProfile(auth.currentUser.uid);
        if (updatedUser) onUpdateUser(updatedUser);
      }
    } catch (error: any) {
        // Se der erro 402 (Pagamento) ou erro genérico de saldo, força modal
        if (error.message.includes('402') || error.message.includes('Saldo')) {
            setShowPlanModal(true);
        } else {
            alert(error.message || "Erro ao consultar a IA.");
        }
    } finally {
      setLoading(false);
    }
  };

  // --- PLAN HANDLERS ---
  const handleSelectPlan = (type: 'weekly' | 'monthly' | 'yearly') => {
      if (type === 'weekly') {
          window.open(KIRVANO_LINKS.ai_weekly, '_blank');
      } else if (type === 'monthly') {
          window.open(KIRVANO_LINKS.ai_monthly, '_blank');
      } else if (type === 'yearly') {
          // GERA PIX DIRETAMENTE NA PLATAFORMA (R$ 49,90)
          try {
              const payload = PixService.generatePayload(49.90);
              setPixPayload(payload);
              setPayerName(user.displayName || '');
              setShowPixPay(true);
          } catch (e) {
              alert("Erro ao gerar QR Code.");
          }
      }
  };

  const handleConfirmPixPlan = async () => {
      if (!auth.currentUser) return;
      if (!payerName.trim()) { alert("Digite o nome do pagador."); return; }

      setPixLoading(true);
      try {
          const amount = 49.90;
          const label = `IA Ilimitada Anual (R$ 49,90)`;
          
          await DatabaseService.createRechargeRequest(
              auth.currentUser.uid,
              payerName,
              amount,
              'BRL', // Usamos BRL para registrar o valor financeiro
              0, // Quantidade 0 para evitar undefined
              label
          );
          alert("Solicitação enviada! Assim que confirmado, seu acesso anual será liberado.");
          setShowPlanModal(false);
          setShowPixPay(false);
      } catch (e) {
          alert("Erro ao confirmar.");
      } finally {
          setPixLoading(false);
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
                  {isAiActive ? <><Check size={14}/> Ativo até {expiryDate && expiryDate.substring(0,5)}</> : 'Inativo'}
              </p>
            </div>
            {/* Se inativo, botão de assinar brilha */}
            {!isAiActive && (
                <button onClick={() => setShowPlanModal(true)} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg animate-pulse-slow transition-colors" title="Assinar Agora">
                    <Crown size={20} />
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
                  <p className="text-sm text-slate-400">Tire dúvidas sobre matérias, peça dicas de estudo ou organize seu cronograma.</p>
                  {!isAiActive && (
                      <button onClick={() => setShowPlanModal(true)} className="mt-6 px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
                          <Lock size={16}/> Desbloquear NeuroAI
                      </button>
                  )}
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
              placeholder={isAiActive ? "Digite sua dúvida aqui..." : "Assinatura necessária para enviar..."}
              disabled={!isAiActive && messages.length > 0} // Disable input if no plan
              className={`w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-6 pr-14 text-white focus:border-indigo-500 focus:outline-none transition-all shadow-inner ${!isAiActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 shadow-lg"
            >
              {isAiActive ? <Send size={20} /> : <Lock size={20} />}
            </button>
          </form>
        </div>

        {/* History Panel (Simplified) */}
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

      {/* PLAN MODAL */}
      {showPlanModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-auto">
                  {!showPixPay ? (
                      <>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-white italic">NEUROAI ILIMITADA</h3>
                                <p className="text-slate-400 text-sm">Escolha seu plano para desbloquear o tutor 24h.</p>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* PLANO SEMANAL */}
                            <div className="p-6 rounded-3xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 transition-all flex flex-col">
                                <h4 className="text-xl font-bold text-white mb-2">Semanal</h4>
                                <div className="mb-4">
                                    <span className="text-3xl font-black text-white">R$ 9,90</span>
                                    <span className="text-xs text-slate-500">/semana</span>
                                </div>
                                <ul className="text-slate-400 text-xs space-y-2 mb-6 flex-1">
                                    <li className="flex gap-2"><Check size={14} className="text-indigo-500"/> Chat Ilimitado</li>
                                    <li className="flex gap-2"><Check size={14} className="text-indigo-500"/> Contexto de Aulas</li>
                                </ul>
                                <button onClick={() => handleSelectPlan('weekly')} className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                    Assinar (Cartão)
                                </button>
                            </div>

                            {/* PLANO MENSAL */}
                            <div className="p-6 rounded-3xl bg-indigo-900/20 border border-indigo-500/50 hover:bg-indigo-900/30 transition-all relative flex flex-col transform hover:scale-105 shadow-xl">
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                                <h4 className="text-xl font-bold text-white mb-2">Mensal</h4>
                                <div className="mb-4">
                                    <span className="text-3xl font-black text-white">R$ 24,90</span>
                                    <span className="text-xs text-slate-500">/mês</span>
                                </div>
                                <ul className="text-indigo-200 text-xs space-y-2 mb-6 flex-1">
                                    <li className="flex gap-2"><Check size={14} className="text-indigo-400"/> Chat Ilimitado</li>
                                    <li className="flex gap-2"><Check size={14} className="text-indigo-400"/> Explicação de Erros</li>
                                    <li className="flex gap-2"><Check size={14} className="text-indigo-400"/> Mapas Mentais</li>
                                </ul>
                                <button onClick={() => handleSelectPlan('monthly')} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50">
                                    Assinar (Cartão)
                                </button>
                            </div>

                            {/* PLANO ANUAL */}
                            <div className="p-6 rounded-3xl bg-slate-800/50 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                                <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">Anual <span className="text-[10px] text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/20">PIX</span></h4>
                                <div className="mb-4">
                                    <span className="text-3xl font-black text-emerald-400">R$ 49,90</span>
                                    <span className="text-xs text-slate-500">/ano</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-4">Equivalente a <strong>R$ 4,15/mês</strong>. Melhor custo benefício.</p>
                                <ul className="text-slate-300 text-xs space-y-2 mb-6 flex-1">
                                    <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Tudo do Mensal</li>
                                    <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Prioridade no Suporte</li>
                                    <li className="flex gap-2"><Check size={14} className="text-emerald-500"/> Liberação Imediata</li>
                                </ul>
                                <button onClick={() => handleSelectPlan('yearly')} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                                    <QrCode size={16}/> Gerar PIX
                                </button>
                            </div>
                        </div>
                      </>
                  ) : (
                      // PIX PAYMENT SCREEN (ONLY FOR YEARLY)
                      <div className="text-center max-w-md mx-auto">
                          <button onClick={() => setShowPixPay(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={20}/></button>
                          <h3 className="text-2xl font-bold text-white mb-2">Pagamento via PIX</h3>
                          <p className="text-slate-400 text-sm mb-6">Escaneie para liberar 1 Ano de NeuroAI.</p>
                          
                          <div className="bg-white p-4 rounded-2xl inline-block mb-6 mx-auto shadow-2xl">
                               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`} className="w-48 h-48 mix-blend-multiply" />
                          </div>
                          
                          <div className="flex gap-2 mb-6">
                              <input readOnly value={pixPayload} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 text-xs text-slate-400 truncate" />
                              <button onClick={() => {navigator.clipboard.writeText(pixPayload); alert("Copiado!");}} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors">
                                  <Copy size={18}/>
                              </button>
                          </div>

                          <div className="space-y-4">
                              <input 
                                  value={payerName} 
                                  onChange={e => setPayerName(e.target.value)} 
                                  placeholder="Nome Completo do Pagador" 
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-emerald-500 outline-none"
                              />
                              <button onClick={handleConfirmPixPlan} disabled={pixLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                  {pixLoading ? <Loader2 className="animate-spin"/> : <CheckCircle size={20}/>}
                                  {pixLoading ? "Enviando..." : "Já fiz o pagamento"}
                              </button>
                              <p className="text-[10px] text-slate-500">A liberação ocorre após validação pelo administrador.</p>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default AiTutor;