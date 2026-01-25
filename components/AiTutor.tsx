import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Eraser, Wallet, History, Plus, AlertTriangle, X, Copy, Check, QrCode, CheckCircle, AlertCircle } from 'lucide-react';
import { AiService, ChatMessage } from '../services/aiService';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { Transaction } from '../types';
import { auth } from '../services/firebaseConfig';

const AiTutor: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Olá! Sou o NeuroTutor. Posso te ajudar com dúvidas de matérias, criar resumos ou explicar questões difíceis. O que vamos estudar hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Recharge & PIX State
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (auth.currentUser) {
        fetchFinancialData();
    }
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 4000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const fetchFinancialData = async () => {
      if (!auth.currentUser) return;
      const profile = await DatabaseService.getUserProfile(auth.currentUser.uid);
      if (profile) setBalance(profile.balance);
      const trans = await DatabaseService.getUserTransactions(auth.currentUser.uid);
      setTransactions(trans);
  };

  const triggerNotification = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
  };

  // Simple Markdown Parser for visual formatting
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-indigo-200">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (balance <= 0.05) {
        triggerNotification('error', 'Saldo Insuficiente para realizar esta ação.');
        setShowRecharge(true);
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
      const responseText = await AiService.sendMessage(userMsg.content, messages);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: responseText
      };
      
      setMessages(prev => [...prev, aiMsg]);
      fetchFinancialData(); 
    } catch (error: any) {
      if (error.message.includes('402')) {
          triggerNotification('error', 'Seu saldo acabou durante a requisição.');
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

  const handleGeneratePix = () => {
      const val = parseFloat(rechargeAmount);
      if (!rechargeAmount || isNaN(val) || val < 10) {
          triggerNotification('error', 'O valor mínimo de recarga é R$ 10,00');
          return;
      }
      
      try {
          const payload = PixService.generatePayload(val);
          setPixPayload(payload);
          setCopied(false);
      } catch (e) {
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
      if (!auth.currentUser || !rechargeAmount) return;

      try {
          // Send real name
          await DatabaseService.createRechargeRequest(auth.currentUser.uid, auth.currentUser.displayName || 'Usuário Sem Nome', parseFloat(rechargeAmount));
          handleCloseRecharge();
          // Delay notification slightly for effect
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
  };

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
            <Bot className="text-indigo-400" /> NeuroTutor <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">BETA</span>
          </h2>
          <p className="text-slate-400 text-sm">IA cobrada por uso.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-slate-900 border border-white/10 px-4 py-2 rounded-xl">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Seu Saldo</span>
                    <span className={`font-mono font-bold ${balance > 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                        R$ {balance.toFixed(4)}
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

                    <div className={`max-w-[80%] p-4 rounded-2xl leading-relaxed shadow-md ${
                    msg.role === 'ai' 
                        ? 'bg-slate-800/80 border border-white/5 text-slate-100 rounded-tl-none' 
                        : 'bg-indigo-600 text-white rounded-tr-none'
                    }`}>
                    <div className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
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
                          {transactions.map(t => (
                              <div key={t.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-bold text-slate-300 truncate max-w-[120px]">{t.description}</span>
                                      <span className={`text-xs font-mono font-bold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {t.type === 'credit' ? '+' : '-'} R$ {t.amount.toFixed(4)}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                                      <span>{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString()}</span>
                                  </div>
                              </div>
                          ))}
                          {transactions.length === 0 && <p className="text-center text-slate-500 text-xs mt-4">Nenhuma transação.</p>}
                      </div>
                  </div>
              </div>
          )}

          {/* BEAUTIFUL RECHARGE MODAL OVERLAY */}
          {showRecharge && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-[#0f172a] border border-indigo-500/20 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                  {/* Decorative Glows */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  <button 
                    onClick={handleCloseRecharge}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full"
                  >
                    <X size={20} />
                  </button>

                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-emerald-400">
                          <Wallet size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-white">Recarregar Saldo</h3>
                      <p className="text-slate-400 text-sm">Adicione créditos para usar a IA.</p>
                  </div>

                  {!pixPayload ? (
                    // Step 1: Input Amount
                    <div className="space-y-6 relative z-10">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl text-center hover:border-emerald-500/50 transition-colors">
                            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block tracking-widest">Valor da Recarga</label>
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-2xl text-emerald-500 font-bold">R$</span>
                                <input 
                                    type="number" 
                                    value={rechargeAmount}
                                    onChange={e => setRechargeAmount(e.target.value)}
                                    className="bg-transparent text-5xl font-bold text-white outline-none w-32 text-center placeholder:text-slate-700"
                                    placeholder="20"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Mínimo R$ 10,00</p>
                        </div>
                        <button 
                            onClick={handleGeneratePix}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:-translate-y-1"
                        >
                            <QrCode size={20} /> Gerar PIX
                        </button>
                    </div>
                  ) : (
                    // Step 2: Show QR Code
                    <div className="space-y-6 text-center animate-in slide-in-from-bottom-4 relative z-10">
                        <div className="bg-white p-4 rounded-xl inline-block shadow-xl border-4 border-white">
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

                        <div className="pt-4 border-t border-white/5">
                            <button 
                                onClick={handleConfirmPayment}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                <Check size={20} /> Já fiz o pagamento
                            </button>
                            <p className="text-[10px] text-slate-500 mt-3">
                                A liberação ocorre após verificação do administrador.
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