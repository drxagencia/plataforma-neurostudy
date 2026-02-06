
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, SupportTicket, ChatMessage } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AiService } from '../services/aiService';
import { Send, LifeBuoy, Bot, User, Loader2, CheckCircle, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import { auth } from '../services/firebaseConfig';

interface SupportProps {
    user: UserProfile;
}

const TypingIndicator = () => (
    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-700 text-slate-300">
            <Bot size={20}/>
        </div>
        <div className="bg-slate-800 text-slate-400 p-4 rounded-2xl rounded-tl-none flex items-center gap-1 min-w-[80px]">
            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
        </div>
    </div>
);

const Support: React.FC<SupportProps> = ({ user }) => {
    const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        loadTicket();
    }, [user.uid]);

    // Clear notification when viewing
    useEffect(() => {
        if (activeTicket && user.hasSupportNotification) {
            DatabaseService.clearSupportNotification(user.uid);
        }
    }, [activeTicket, user]);

    const loadTicket = async () => {
        setLoading(true);
        const ticket = await DatabaseService.getSupportTicket(user.uid);
        if (ticket) {
            setActiveTicket(ticket);
            // Convert support messages to chat messages
            const chatMsgs = ticket.messages.map((m, idx) => ({
                id: idx.toString(),
                role: m.role === 'admin' ? 'ai' : m.role, // Admin shows as "AI/Support" side
                content: m.content
            })) as ChatMessage[];
            setMessages(chatMsgs);
        } else {
            // Initial AI greeting
            setMessages([{
                id: 'init',
                role: 'ai',
                content: `Olá, ${user.displayName.split(' ')[0]}! Sou o assistente de suporte da NeuroStudy. Como posso ajudar você hoje?`
            }]);
        }
        setLoading(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages, sending]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || sending) return;

        const userMsgText = input;
        setInput('');
        setSending(true);

        // Optimistic UI Update
        const newHistory = [...messages, { id: Date.now().toString(), role: 'user' as const, content: userMsgText }];
        setMessages(newHistory);

        try {
            // 1. If Ticket is OPEN/ANSWERED, send directly to DB (Human Chat Mode)
            if (activeTicket) {
                await DatabaseService.replySupportTicket(user.uid, userMsgText, 'user');
                // Refresh ticket to confirm sync
                const updatedTicket = await DatabaseService.getSupportTicket(user.uid);
                if (updatedTicket) setActiveTicket(updatedTicket);
            } 
            // 2. If NO Ticket, talk to AI (AI Mode with Escalation Check)
            else {
                const response = await AiService.sendSupportMessage(userMsgText, newHistory);
                
                try {
                    const parsed = JSON.parse(response);
                    
                    if (parsed.type === 'escalate') {
                        // CREATE TICKET IMMEDIATELY
                        await DatabaseService.createSupportTicket(user.uid, parsed.name, user.email, parsed.issue);
                        
                        const confirmMsg = "Recebido! Suas informações foram salvas e nosso suporte humano foi notificado. Você receberá uma notificação aqui nesta aba assim que respondermos. Obrigado!";
                        
                        // Update UI immediately with success message
                        setMessages([...newHistory, { id: (Date.now()+1).toString(), role: 'ai', content: confirmMsg }]);
                        
                        // Set active ticket state to switch UI mode
                        const newTicket = await DatabaseService.getSupportTicket(user.uid);
                        setActiveTicket(newTicket);
                    } else {
                        // Normal chat response
                        setMessages([...newHistory, { id: (Date.now()+1).toString(), role: 'ai', content: parsed.content || "Entendido." }]);
                    }
                } catch (jsonError) {
                    console.error("JSON Parse Error", jsonError);
                    // Fallback if AI messes up JSON (unlikely with response_format, but safe)
                    setMessages([...newHistory, { id: (Date.now()+1).toString(), role: 'ai', content: response }]);
                }
            }
        } catch (e) {
            console.error(e);
            setMessages([...newHistory, { id: 'err', role: 'ai', content: "Erro de conexão. Tente novamente." }]);
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async () => {
        if (!confirm("Isso irá fechar o chamado e apagar o histórico de suporte. Confirmar?")) return;
        setLoading(true);
        await DatabaseService.resolveSupportTicket(user.uid);
        setActiveTicket(null);
        setMessages([{
            id: 'new',
            role: 'ai',
            content: "Chamado finalizado. Se precisar de mais alguma coisa, estou aqui!"
        }]);
        setLoading(false);
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto pb-20 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                        <LifeBuoy className="text-indigo-400" /> Suporte
                    </h2>
                    <p className="text-slate-400 text-sm">Fale com nossa IA ou escale para um humano.</p>
                </div>
                {activeTicket && (
                    <button 
                        onClick={handleResolve}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <CheckCircle size={16} /> Problema Resolvido
                    </button>
                )}
            </div>

            <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-2xl flex flex-col overflow-hidden relative">
                {/* Status Bar for Active Ticket */}
                {activeTicket && (
                    <div className="bg-indigo-900/20 border-b border-indigo-500/20 p-3 flex justify-between items-center">
                        <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare size={14} /> Ticket #{activeTicket.id.substring(0,6)} Aberto
                        </span>
                        <span className={`text-[10px] px-2 py-1 rounded border uppercase font-bold ${activeTicket.status === 'answered' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                            {activeTicket.status === 'answered' ? 'Nova Resposta' : 'Aguardando Suporte'}
                        </span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg, idx) => {
                        // Admin role maps to 'ai' for visual purposes, but we can distinguish style
                        const isAdmin = activeTicket && activeTicket.messages[idx]?.role === 'admin';
                        
                        return (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? (isAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300') : 'bg-slate-800 text-slate-400'}`}>
                                    {msg.role === 'ai' ? (isAdmin ? <User size={20}/> : <Bot size={20}/>) : <User size={20}/>}
                                </div>
                                <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'ai' ? (isAdmin ? 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-100' : 'bg-slate-800 text-slate-200') : 'bg-white/10 text-white'}`}>
                                    {isAdmin && <p className="text-[10px] text-indigo-400 font-bold mb-1 uppercase">Suporte Humano</p>}
                                    {msg.content}
                                </div>
                            </div>
                        )
                    })}
                    {sending && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 bg-slate-950 border-t border-white/5 relative">
                    <input 
                        className="w-full glass-input p-4 pr-12 rounded-xl"
                        placeholder={activeTicket ? "Responda ao suporte..." : "Descreva seu problema..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={sending}
                    />
                    <button 
                        disabled={!input.trim() || sending}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-50 transition-colors"
                    >
                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Support;
