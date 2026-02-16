
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
  CheckCircle,
  Crown,
  CreditCard,
  QrCode,
  Copy
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
  
  // Recharge State
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('10,00');
  
  // Unlimited Plan State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planCycle, setPlanCycle] = useState<'monthly' | 'semester' | 'yearly'>('yearly');
  const [pixPayload, setPixPayload] = useState('');
  const [showPixPay, setShowPixPay] = useState(false);
  const [payerName, setPayerName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    
    // Sanitização robusta para moeda brasileira
    // Remove tudo que não é dígito ou vírgula
    const cleanString = rechargeAmount.replace(/[^0-9,]/g, '');
    // Substitui vírgula por ponto para conversão
    const numericAmount = parseFloat(cleanString.replace(',', '.'));
    
    if (isNaN(numericAmount) || numericAmount < 1) {
        alert("Por favor, insira um valor válido (mínimo R$ 1,00).");
        return;
    }

    setLoading(true);
    try {
      await DatabaseService.createRechargeRequest(
        auth.currentUser.uid,
        user.displayName || 'Usuário',
        numericAmount,
        'BRL',
        undefined,
        'Recarga de Saldo NeuroAI'
      );
      alert("Solicitação de recarga enviada! Aguarde a aprovação do administrador.");
      setShowRechargeModal(false);
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao processar recarga: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- UNLIMITED PLAN HANDLERS ---
  const handlePlanCheckout = () => {
      if (planCycle === 'monthly') {
          window.open(KIRVANO_LINKS.ai_unlimited_monthly, '_blank');
          return;
      }

      // Generate PIX for Semester/Yearly
      const amount = planCycle === 'semester' ? 59.90 : 97.00;
      try {
          const payload = PixService.generatePayload(amount);
          setPixPayload(payload);
          setShowPixPay(true);
          setPayerName(user.displayName || '');
      } catch (e) {
          alert("Erro ao gerar PIX.");
      }
  };

  const handleConfirmPixPlan = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
          const amount = planCycle === 'semester' ? 59.90 : 97.00;
          const label = `Plano IA Ilimitado (${planCycle === 'semester' ? 'Semestral' : 'Anual'})`;
          
          await DatabaseService.createRechargeRequest(
              auth.currentUser.uid,
              payerName,
              amount,
              'BRL',
              undefined,
              label
          );
          alert("Solicitação enviada! Liberaremos seu plano ilimitado em breve.");
          setShowPlanModal(false);
          setShowPixPay(false);
      } catch (e) {
          alert("Erro ao confirmar.");
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
          {/* Unlimited Plan Button */}
          <button 
            onClick={() => setShowPlanModal(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all hover:scale-105"
          >
              <Crown size={16} /> Plano Ilimitado
          </button>

          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Saldo NeuroAI</p>
              <p className="text-lg font-bold text-white">R$ {user.balance.toFixed(2)}</p>
            </div>
            <button onClick={() => setShowRechargeModal(true)} className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all" title="Recarregar">
              <Plus size={20} />
            </button>
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
                  <button onClick={() => setShowPlanModal(true)} className="mt-4 text-xs text-indigo-400 underline hover:text-indigo-300">
                      Ver opções de Plano Ilimitado
                  </button>
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

        {/* History Panel */}
        {showHistory && (
          <div className="w-80 flex-shrink-0 flex flex-col gap-4 animate-in slide-in-from-right duration-300">
            <div className="glass-card flex-1 rounded-[2.5rem] flex flex-col overflow-hidden border-white/10 shadow-2xl">
              <div className="p-6 border-b border-white/5 bg-slate-900/30">
                <h3 className="font-black text-slate-200 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                  <HistoryIcon size={16} className="text-indigo-400" /> Atividade NeuroAI
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
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
                      {t.type === 'debit' && <span className="opacity-50 italic">Uso IA</span>}
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
              <p className="text-slate-400 text-sm">O saldo é consumido apenas quando você usa a IA (R$ 0,10 por mensagem aprox).</p>
              <div className="grid grid-cols-3 gap-2">
                {['10,00', '20,00', '50,00'].map(val => (
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
                  type="text" 
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none" 
                  placeholder="Ex: 15,00"
                />
              </div>
              <button onClick={handleRecharge} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                <CheckCircle size={20} /> Solicitar Créditos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN UNLIMITED MODAL (Same as before) */}
      {showPlanModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-y-auto">
              {/* ... (Existing Plan Modal Code) ... */}
              <div className="bg-slate-900 border border-purple-500/30 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 my-auto">
                  {!showPixPay ? (
                      <>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-3xl font-black text-white italic">IA ILIMITADA</h3>
                                <p className="text-purple-400 text-xs font-bold uppercase tracking-widest">Acelere seus estudos</p>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div 
                                onClick={() => setPlanCycle('yearly')}
                                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative ${planCycle === 'yearly' ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800 border-transparent hover:bg-slate-800/80'}`}
                            >
                                {planCycle === 'yearly' && <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">MELHOR OFERTA</div>}
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-white">Plano Anual</h4>
                                    <span className="text-xl font-black text-white">R$ 97,00</span>
                                </div>
                                <p className="text-slate-400 text-xs mt-1">Acesso ilimitado por 12 meses. Equivalente a R$ 8,08/mês.</p>
                            </div>

                            <div 
                                onClick={() => setPlanCycle('semester')}
                                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${planCycle === 'semester' ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800 border-transparent hover:bg-slate-800/80'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-white">Semestral</h4>
                                    <span className="text-xl font-black text-white">R$ 59,90</span>
                                </div>
                                <p className="text-slate-400 text-xs mt-1">Acesso ilimitado por 6 meses.</p>
                            </div>

                            <div 
                                onClick={() => setPlanCycle('monthly')}
                                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${planCycle === 'monthly' ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800 border-transparent hover:bg-slate-800/80'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-white">Mensal (Cartão)</h4>
                                    <span className="text-xl font-black text-white">R$ 14,90</span>
                                </div>
                                <p className="text-slate-400 text-xs mt-1">Cobrança recorrente via Kirvano.</p>
                            </div>
                        </div>

                        <button onClick={handlePlanCheckout} className="w-full py-4 bg-white text-purple-900 font-black text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                            {planCycle === 'monthly' ? <CreditCard size={20}/> : <QrCode size={20}/>}
                            {planCycle === 'monthly' ? 'ASSINAR NO CARTÃO' : 'GERAR PIX DE ACESSO'}
                        </button>
                      </>
                  ) : (
                      <div className="text-center">
                          <button onClick={() => setShowPixPay(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={20}/></button>
                          <h3 className="text-2xl font-bold text-white mb-2">Pagamento via PIX</h3>
                          <p className="text-slate-400 text-sm mb-6">Escaneie para liberar o Plano Ilimitado.</p>
                          
                          <div className="bg-white p-4 rounded-2xl inline-block mb-6 mx-auto">
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
                                  placeholder="Nome do Pagador" 
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                              />
                              <button onClick={handleConfirmPixPlan} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all">
                                  {loading ? "Processando..." : "Já fiz o pagamento"}
                              </button>
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
