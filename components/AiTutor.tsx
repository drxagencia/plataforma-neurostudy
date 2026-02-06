
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Eraser, Wallet, History, Plus, AlertTriangle, X, Copy, Check, QrCode, CheckCircle, AlertCircle, BrainCircuit, Infinity, CreditCard, Crown, Rocket, Zap, ArrowRight, Circle, Diamond } from 'lucide-react';
import { AiService } from '../services/aiService';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { Transaction, UserProfile, ChatMessage } from '../types';
import { auth } from '../services/firebaseConfig';
import { KIRVANO_LINKS } from '../constants';

interface AiTutorProps {
    user: UserProfile;
    onUpdateUser: (u: UserProfile) => void;
}

// --- PROFESSIONAL RENDERER COMPONENT ---
const ProfessionalMarkdown: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    // Split text preserving newlines to handle blocks
    const lines = text.split('\n');

    return (
        <div className="space-y-4 font-sans text-sm md:text-base leading-relaxed">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                
                // 1. HEADERS (### Title)
                if (trimmed.startsWith('###')) {
                    const content = trimmed.replace(/^###\s*/, '');
                    return (
                        <div key={idx} className="flex items-center gap-3 mt-6 mb-3 animate-in slide-in-from-left-2 duration-500">
                            <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                {content}
                            </h3>
                        </div>
                    );
                }

                // 2. LISTS (- item)
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    const content = trimmed.replace(/^[-*]\s*/, '');
                    return (
                        <div key={idx} className="flex gap-3 pl-2 group">
                            <div className="mt-1.5 min-w-[16px]">
                                <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                            <p className="text-slate-200">
                                {parseInlineStyles(content)}
                            </p>
                        </div>
                    );
                }

                // 3. BLOCKQUOTES / HIGHLIGHTS (> text)
                if (trimmed.startsWith('>')) {
                    const content = trimmed.replace(/^>\s*/, '');
                    return (
                        <div key={idx} className="my-4 p-4 rounded-xl bg-indigo-900/20 border-l-4 border-indigo-500 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Sparkles size={40} />
                            </div>
                            <div className="flex gap-3 relative z-10">
                                <Zap size={20} className="text-yellow-400 shrink-0 mt-0.5 fill-yellow-400" />
                                <p className="text-indigo-100 font-medium italic">
                                    {parseInlineStyles(content)}
                                </p>
                            </div>
                        </div>
                    );
                }

                // 4. EMPTY LINES
                if (!trimmed) return <div key={idx} className="h-2"></div>;

                // 5. STANDARD PARAGRAPHS
                return (
                    <p key={idx} className="text-slate-300">
                        {parseInlineStyles(line)}
                    </p>
                );
            })}
        </div>
    );
};

// Helper to parse **bold** inside lines
const parseInlineStyles = (text: string) => {
    // Split by **
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            // Stylized Bold: Gradient Text - Updated to brighter colors (Cyan/Sky) for better contrast on dark bg
            return (
                <span key={i} className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-200 to-sky-300 animate-pulse-slow">
                    {part.slice(2, -2)}
                </span>
            );
        }
        return part;
    });
};

const AiTutor: React.FC<AiTutorProps> = ({ user, onUpdateUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Olá! Sou a **NeuroAI**. Posso te ajudar com dúvidas de matérias, criar resumos ou explicar questões difíceis. O que vamos estudar hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Use user prop for balance, only fetch history
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Recharge & PIX State
  const [rechargeTab, setRechargeTab] = useState<'credits' | 'unlimited'>('credits');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedUnlimitedPlan, setSelectedUnlimitedPlan] = useState<{id: string, label: string, price: number, months: number, badge?: string} | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payerName, setPayerName] = useState(''); // NEW: For admin verification
  
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const unlimitedPlans = [
      { id: 'monthly', label: '1 Mês Infinito', price: 37, months: 1, color: 'bg-slate-900' },
      { id: 'semester', label: '6 Meses Infinitos', price: 57, months: 6, color: 'bg-indigo-900/10' },
      { id: 'yearly', label: '1 Ano Infinito', price: 97, months: 12, color: 'bg-gradient-to-br from-indigo-900/30 to-purple-900/30', badge: 'MELHOR VALOR' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (auth.currentUser) {
        fetchHistory();
    }
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 4000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const fetchHistory = async () => {
      if (!auth.currentUser) return;
      const trans = await DatabaseService.getUserTransactions(auth.currentUser.uid);
      setTransactions(trans);
  };

  const updateBalanceLocally = async () => {
      if (!auth.currentUser) return;
      // Fetch latest profile to get new balance calculated by backend
      const updatedUser = await DatabaseService.getUserProfile(auth.currentUser.uid);
      if (updatedUser) {
          onUpdateUser(updatedUser);
          fetchHistory(); // Refresh history to show new debit
      }
  };

  const triggerNotification = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if balance is strictly greater than 0. If it is 0 or negative, block.
    if (user.balance <= 0) { 
        triggerNotification('error', 'Seu saldo está zerado ou negativo. Recarregue para continuar.');
        setTimeout(() => setShowRecharge(true), 500);
        return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Need to pass UID for balance check in backend
      const responseText = await AiService.sendMessage(userMsg.content, messages, "NeuroAI Tutor");
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: responseText
      };
      
      setMessages(prev => [...prev, aiMsg]);
      await updateBalanceLocally();
      
      // Award XP for interaction
      if (auth.currentUser) {
          await DatabaseService.processXpAction(auth.currentUser.uid, 'AI_CHAT_MESSAGE');
      }

    } catch (error: any) {
      if (error.message.includes('402')) {
          triggerNotification('error', 'Saldo insuficiente para processar a resposta.');
          setShowRecharge(true);
      } else if (error.message.includes('403')) {
          triggerNotification('error', 'Seu plano não permite o uso do chat livre.');
      } else {
          const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: 'Desculpe, tive um problema de conexão. Poderia tentar novamente?'
          };
          setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentAction = () => {
      let val = 0;

      // --- LOGIC FOR CREDITS (AVULSO) ---
      if (rechargeTab === 'credits') {
          const normalizedAmount = rechargeAmount.replace(',', '.');
          val = parseFloat(normalizedAmount);

          if (!normalizedAmount || isNaN(val)) {
              triggerNotification('error', 'Por favor, digite um valor válido.');
              return;
          }

          if (val < 10) {
              triggerNotification('error', 'O valor mínimo de recarga é R$ 10,00');
              return;
          }

          if (paymentMethod === 'card') {
              const link = KIRVANO_LINKS.balance_recharge;
              window.open(link, '_blank');
              triggerNotification('success', 'Redirecionando para pagamento seguro...');
              return;
          }
      } 
      // --- LOGIC FOR UNLIMITED (SUBSCRIPTIONS) ---
      else {
          if (!selectedUnlimitedPlan) {
              triggerNotification('error', 'Selecione um plano.');
              return;
          }
          val = selectedUnlimitedPlan.price;

          if (paymentMethod === 'card') {
              let link = '';
              if (selectedUnlimitedPlan.id === 'monthly') link = KIRVANO_LINKS.ai_unlimited_monthly;
              else if (selectedUnlimitedPlan.id === 'semester') link = KIRVANO_LINKS.ai_unlimited_semester;
              else if (selectedUnlimitedPlan.id === 'yearly') link = KIRVANO_LINKS.ai_unlimited_yearly;
              
              window.open(link, '_blank');
              triggerNotification('success', 'Redirecionando para assinatura VIP...');
              return;
          }
      }
      
      // --- PIX LOGIC (Common for both) ---
      try {
          const payload = PixService.generatePayload(val);
          setPixPayload(payload);
          setCopied(false);
      } catch (e) {
          console.error(e);
          triggerNotification('error', 'Erro ao gerar QR Code.');
      }
  };

  const handleCopyPix = () => {
      if (pixPayload) {
          navigator.clipboard.writeText(pixPayload);
          setCopied(true);
          triggerNotification('success', 'Código PIX copiado!');
          setTimeout(() => setCopied(false), 3000);
      }
  };

  const handleConfirmPayment = async () => {
      let val = 0;
      let planLabel = undefined;

      if (rechargeTab === 'credits') {
          const normalizedAmount = rechargeAmount.replace(',', '.');
          val = parseFloat(normalizedAmount);
      } else {
          if (selectedUnlimitedPlan) {
              val = selectedUnlimitedPlan.price;
              planLabel = `Compra: ${selectedUnlimitedPlan.label}`;
          }
      }

      if (!auth.currentUser || isNaN(val)) return;
      if (!payerName.trim()) {
          triggerNotification('error', 'Digite o nome do pagador para conferência.');
          return;
      }

      try {
          await DatabaseService.createRechargeRequest(
              auth.currentUser.uid, 
              payerName, // Send the user-provided payer name
              val, 
              'BRL', 
              undefined, 
              planLabel
          );
          
          handleCloseRecharge();
          setTimeout(() => {
              triggerNotification('success', 'Comprovante enviado! Aguarde a aprovação.');
          }, 300);
      } catch (e) {
          triggerNotification('error', 'Erro ao enviar solicitação.');
      }
  };

  const handleCloseRecharge = () => {
      setShowRecharge(false);
      setRechargeAmount('');
      setPixPayload(null);
      setSelectedUnlimitedPlan(null);
      setRechargeTab('credits');
      setPaymentMethod('pix');
      setPayerName('');
  };

  const isBasic = user.plan === 'basic';

  return (
    <div className="h-full flex flex-col max-h-[85vh] relative animate-slide-up">
      
      {/* GLOBAL NOTIFICATION TOAST */}
      {notification && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-top-4 duration-300 ${
            notification.type === 'error' 
            ? 'bg-red-500/90 border-red-400/50 text-white' 
            : 'bg-emerald-500/90 border-emerald-400/50 text-white'
        }`}>
            {notification.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
            <span className="font-bold text-sm md:text-base">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 opacity-80 hover:opacity-100"><X size={18}/></button>
        </div>
      )}

      {/* Header & Balance Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 flex-shrink-0 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-indigo-400" /> NeuroAI <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">BETA</span>
          </h2>
          <p className="text-slate-400 text-sm">Inteligência Artificial por demanda.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-slate-900 border border-white/10 px-4 py-2 rounded-xl">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Seu Saldo</span>
                    <span className={`font-mono font-bold ${user.balance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        R$ {user.balance.toFixed(2)}
                    </span>
                </div>
                <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
                <button onClick={() => setShowRecharge(true)} className="p-2 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors" title="Recarregar">
                    <Plus size={20} />
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${showHistory ? 'text-indigo-400 bg-white/5' : 'text-slate-400'}`} title="Histórico">
                    <History size={20} />
                </button>
            </div>
            
            <button 
                onClick={() => setMessages([messages[0]])}
                className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10"
                title="Limpar conversa"
            >
                <Eraser size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden relative">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl mb-4 flex items-center gap-2 text-sm animate-in fade-in">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 glass-card rounded-2xl mb-4 bg-slate-900/40">
                {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'ai' 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' 
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                    {msg.role === 'ai' ? <Sparkles size={20} /> : <UserIcon size={20} />}
                    </div>

                    <div className={`max-w-[90%] p-5 rounded-2xl leading-relaxed shadow-md ${
                    msg.role === 'ai' 
                        ? 'bg-slate-800/80 border border-white/5 text-slate-100 rounded-tl-none' 
                        : 'bg-indigo-600 text-white rounded-tr-none'
                    }`}>
                    {msg.role === 'ai' 
                        ? <ProfessionalMarkdown text={msg.content} />
                        : <p className="whitespace-pre-wrap">{msg.content}</p>
                    }
                    </div>
                </div>
                ))}
                
                {isLoading && (
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                    <div className="bg-slate-800/80 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-400 text-sm">
                        <span>Processando...</span>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="relative flex-shrink-0">
                <div className={`absolute -top-6 right-0 text-[10px] uppercase tracking-wider font-bold ${isBasic ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isBasic ? 'Consumo: 2x (Plano Básico)' : 'Consumo: Otimizado (50% OFF)'}
                </div>
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida aqui..."
                disabled={isLoading}
                className="w-full glass-input rounded-xl py-4 pl-6 pr-14 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 shadow-lg"
                />
                <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:bg-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                <Send size={20} />
                </button>
            </form>
          </div>

          {/* History Panel (Side) */}
          {showHistory && (
              <div className="w-80 flex-shrink-0 flex flex-col gap-4 animate-in slide-in-from-right duration-300">
                  <div className="glass-card flex-1 rounded-2xl flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-white/5 bg-slate-900/30">
                          <h3 className="font-bold text-slate-300 flex items-center gap-2">
                              <History size={18} /> Histórico
                          </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                          {transactions.map(t => {
                              // Display the exact amount stored in DB, which now includes the multiplier
                              const displayAmount = t.amount;

                              return (
                              <div key={t.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-bold text-slate-300 truncate max-w-[120px]">{t.description}</span>
                                      <span className={`text-xs font-mono font-bold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {t.type === 'credit' ? '+' : '-'} R$ {displayAmount.toFixed(2)}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                                      <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          )})}
                          {transactions.length === 0 && <p className="text-center text-slate-500 text-xs mt-4">Nenhuma transação.</p>}
                      </div>
                  </div>
              </div>
          )}

          {/* BEAUTIFUL RECHARGE MODAL OVERLAY */}
          {showRecharge && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 p-4">
              <div className="bg-[#0f172a] border border-indigo-500/20 rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                  {/* Decorative Glows */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  <button 
                    onClick={handleCloseRecharge}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full z-20"
                  >
                    <X size={20} />
                  </button>

                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-emerald-400">
                          <Wallet size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-white">Recarregar Saldo</h3>
                      <p className="text-slate-400 text-sm">Escolha como deseja adicionar créditos à IA.</p>
                  </div>

                  {!pixPayload ? (
                    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar px-2">
                        {/* Tabs */}
                        <div className="flex bg-slate-900 border border-white/10 rounded-xl p-1 mb-6 flex-shrink-0 relative">
                            <button 
                                onClick={() => setRechargeTab('credits')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${rechargeTab === 'credits' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Saldo Avulso
                                {rechargeTab === 'credits' && <div className="absolute inset-0 bg-slate-800 rounded-lg -z-10 shadow-md" />}
                            </button>
                            <button 
                                onClick={() => setRechargeTab('unlimited')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative z-10 flex items-center justify-center gap-2 ${rechargeTab === 'unlimited' ? 'text-white' : 'text-yellow-500 hover:text-yellow-300'}`}
                            >
                                <Crown size={14} className={rechargeTab === 'unlimited' ? 'fill-white' : 'fill-yellow-500'} />
                                Acesso Ilimitado
                                {rechargeTab === 'unlimited' && <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-lg -z-10 shadow-lg" />}
                            </button>
                        </div>

                        {rechargeTab === 'credits' ? (
                            // Credit Recharge Form
                            <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-center">
                                <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl text-center hover:border-emerald-500/50 transition-colors">
                                    <label className="text-xs text-slate-400 font-bold uppercase mb-2 block tracking-widest">Valor da Recarga</label>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-2xl text-emerald-500 font-bold">R$</span>
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            value={rechargeAmount}
                                            onChange={e => setRechargeAmount(e.target.value)}
                                            className="bg-transparent text-5xl font-bold text-white outline-none w-40 text-center placeholder:text-slate-700"
                                            placeholder="20.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">Mínimo R$ 10,00</p>
                                </div>

                                {/* Payment Method Toggle */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'pix' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                    >
                                        <QrCode size={18} /> PIX
                                    </button>
                                    <button 
                                        onClick={() => setPaymentMethod('card')}
                                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'card' ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                    >
                                        <CreditCard size={18} /> Cartão
                                    </button>
                                </div>

                                <button 
                                    onClick={handlePaymentAction}
                                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:-translate-y-1 ${paymentMethod === 'card' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
                                >
                                    {paymentMethod === 'card' ? <CreditCard size={20}/> : <QrCode size={20} />} 
                                    {paymentMethod === 'card' ? 'Pagar com Cartão' : 'Gerar PIX'}
                                </button>
                            </div>
                        ) : (
                            // Unlimited Plans Grid (UPDATED UI)
                            <div className="space-y-6 relative z-10">
                                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-4 rounded-xl text-center mb-6 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/5 animate-pulse" />
                                    <h4 className="text-white font-bold text-sm relative z-10 flex items-center justify-center gap-2">
                                        <Sparkles size={16} className="text-yellow-400" /> Vantagens VIP
                                    </h4>
                                    <p className="text-indigo-200 text-xs mt-1 relative z-10">Uso ilimitado sem descontar saldo • Respostas mais rápidas</p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {unlimitedPlans.map((plan, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => setSelectedUnlimitedPlan(plan)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden ${
                                                selectedUnlimitedPlan?.label === plan.label 
                                                ? 'border-yellow-500 bg-slate-800 shadow-lg shadow-yellow-900/20' 
                                                : `border-transparent hover:border-white/10 ${plan.color}`
                                            }`}
                                        >
                                            {plan.badge && (
                                                <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-bl-lg">
                                                    {plan.badge}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedUnlimitedPlan?.label === plan.label ? 'bg-yellow-500 text-slate-900' : 'bg-black/20 text-white/50'}`}>
                                                    {selectedUnlimitedPlan?.label === plan.label ? <Check size={20}/> : <Infinity size={20}/>}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-lg">{plan.label}</h4>
                                                    <p className="text-xs text-slate-400">Apenas R$ {(plan.price / plan.months).toFixed(2)}/mês</p>
                                                </div>
                                            </div>
                                            <div className="text-right mt-2">
                                                <span className="block text-2xl font-black text-white">R$ {plan.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Payment Method Toggle for Unlimited (ONLY SHOW IF PLAN SELECTED) */}
                                {selectedUnlimitedPlan && (
                                    <div className="animate-in slide-in-from-bottom-2 fade-in">
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <button 
                                                onClick={() => setPaymentMethod('pix')}
                                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'pix' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                            >
                                                <QrCode size={18} /> PIX
                                            </button>
                                            <button 
                                                onClick={() => setPaymentMethod('card')}
                                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'card' ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                            >
                                                <CreditCard size={18} /> Cartão
                                            </button>
                                        </div>

                                        <button 
                                            onClick={handlePaymentAction}
                                            className={`w-full mt-4 py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] ${paymentMethod === 'card' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}`}
                                        >
                                            {paymentMethod === 'card' ? <CreditCard size={20}/> : <QrCode size={20} />} 
                                            {paymentMethod === 'card' ? 'Assinar Agora' : `Pagar R$ ${selectedUnlimitedPlan.price},00`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                  ) : (
                    // Step 2: Show QR Code (Same for both flows)
                    <div className="space-y-6 text-center animate-in slide-in-from-bottom-4 relative z-10 flex-1 flex flex-col justify-center">
                        <div className="bg-white p-4 rounded-xl inline-block shadow-xl border-4 border-white mx-auto">
                             <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`}
                                alt="QR Code PIX"
                                className="w-40 h-40 mix-blend-multiply" 
                             />
                        </div>
                        
                        <div className="space-y-2 text-left">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Copia e Cola</p>
                            <div className="flex gap-2">
                                <input 
                                    readOnly 
                                    value={pixPayload}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-xs text-slate-400 font-mono truncate"
                                />
                                <button 
                                    onClick={handleCopyPix}
                                    className={`p-3 rounded-lg transition-colors border ${copied ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'}`}
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Nome do Pagador (Comprovante)</label>
                                <input 
                                    value={payerName} 
                                    onChange={e => setPayerName(e.target.value)}
                                    placeholder="Nome completo de quem fez o PIX"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <button 
                                onClick={handleConfirmPayment}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                <Check size={20} /> Já fiz o pagamento
                            </button>
                            <p className="text-[10px] text-slate-500 mt-1">
                                A liberação ocorre após conferência pelo administrador.
                            </p>
                        </div>
                    </div>
                  )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default AiTutor;