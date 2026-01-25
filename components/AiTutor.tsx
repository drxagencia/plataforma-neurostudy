import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Eraser, Wallet, History, Plus, AlertTriangle } from 'lucide-react';
import { AiService, ChatMessage } from '../services/aiService';
import { DatabaseService } from '../services/databaseService';
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
  const [rechargeAmount, setRechargeAmount] = useState('');
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

  const fetchFinancialData = async () => {
      if (!auth.currentUser) return;
      const profile = await DatabaseService.getUserProfile(auth.currentUser.uid);
      if (profile) setBalance(profile.balance);
      const trans = await DatabaseService.getUserTransactions(auth.currentUser.uid);
      setTransactions(trans);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (balance <= 0.05) {
        setError("Saldo insuficiente para enviar mensagem.");
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
      // Refresh balance after cost deduction
      fetchFinancialData(); 
    } catch (error: any) {
      if (error.message.includes('402')) {
          setError("Saldo insuficiente. Por favor, recarregue.");
          setShowRecharge(true);
      } else if (error.message.includes('403')) {
          setError("Seu plano não permite o uso do chat livre.");
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

  const handleRequestRecharge = async () => {
      if (!rechargeAmount || isNaN(parseFloat(rechargeAmount))) return;
      if (!auth.currentUser) return;
      
      try {
          await DatabaseService.createRechargeRequest(auth.currentUser.uid, auth.currentUser.displayName || 'User', parseFloat(rechargeAmount));
          alert("Solicitação enviada! Aguarde a aprovação do Admin.");
          setShowRecharge(false);
          setRechargeAmount('');
      } catch (e) {
          alert("Erro ao solicitar recarga.");
      }
  };

  return (
    <div className="h-full flex flex-col max-h-[85vh] relative animate-slide-up">
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

      <div className="flex-1 flex gap-6 overflow-hidden">
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
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                </div>
                ))}
                
                {isLoading && (
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                    <div className="bg-slate-800/80 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-400 text-sm">
                        <span>Processando resposta e calculando custos...</span>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                <Send size={20} />
                </button>
            </form>
          </div>

          {/* Side Panels (Recharge / History) */}
          {(showHistory || showRecharge) && (
              <div className="w-80 flex-shrink-0 flex flex-col gap-4 animate-in slide-in-from-right duration-300">
                  
                  {/* Recharge Panel */}
                  {showRecharge && (
                      <div className="glass-card p-6 rounded-2xl border-emerald-500/30">
                          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                              <Wallet className="text-emerald-400" size={20} /> Recarregar
                          </h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Valor da Recarga (R$)</label>
                                  <input 
                                    type="number" 
                                    value={rechargeAmount}
                                    onChange={e => setRechargeAmount(e.target.value)}
                                    className="w-full glass-input p-3 rounded-lg text-lg font-mono text-emerald-400"
                                    placeholder="50.00"
                                  />
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded-lg text-xs text-slate-400">
                                  <p className="mb-2 font-bold text-slate-300">Chave PIX:</p>
                                  <p className="font-mono text-white select-all bg-black/20 p-2 rounded truncate">
                                      000.000.000-00
                                  </p>
                                  <p className="mt-2 text-[10px]">Envie o comprovante para o suporte após solicitar.</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => setShowRecharge(false)} className="flex-1 py-2 text-slate-400 text-sm hover:text-white">Cancelar</button>
                                  <button onClick={handleRequestRecharge} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Solicitar</button>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* History Panel */}
                  {showHistory && (
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
                                          {t.tokensUsed && <span>{Math.round(t.tokensUsed)} tokens</span>}
                                      </div>
                                  </div>
                              ))}
                              {transactions.length === 0 && <p className="text-center text-slate-500 text-xs mt-4">Nenhuma transação.</p>}
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

export default AiTutor;