import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Eraser } from 'lucide-react';
import { AiService, ChatMessage } from '../services/aiService';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await AiService.sendMessage(userMsg.content, messages);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: responseText
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Desculpe, tive um problema de conexão. Poderia tentar novamente?'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-h-[85vh] relative animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Bot className="text-indigo-400" /> NeuroTutor <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">BETA</span>
          </h2>
          <p className="text-slate-400">Inteligência Artificial avançada para tirar suas dúvidas.</p>
        </div>
        <button 
          onClick={() => setMessages([messages[0]])}
          className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Limpar conversa"
        >
          <Eraser size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 glass-card rounded-2xl mb-4 bg-slate-900/40">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
              msg.role === 'ai' 
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' 
                : 'bg-slate-700 text-slate-300'
            }`}>
              {msg.role === 'ai' ? <Sparkles size={20} /> : <UserIcon size={20} />}
            </div>

            {/* Bubble */}
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
                <span>Pensando...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
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
  );
};

export default AiTutor;