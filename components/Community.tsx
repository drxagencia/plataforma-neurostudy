import React, { useState } from 'react';
import { CommunityPost } from '../types';
import { MessageCircle, Heart, Share2, Send } from 'lucide-react';

const MOCK_POSTS: CommunityPost[] = [
  {
    id: '1',
    authorName: 'Ana Silva',
    authorAvatar: 'https://picsum.photos/seed/u1/100',
    content: 'Alguém tem resumo de Eletroquímica pra compartilhar? Tô travada na parte de pilhas 🔋',
    timestamp: Date.now() - 3600000,
    likes: 12
  },
  {
    id: '2',
    authorName: 'Carlos Mendes',
    authorAvatar: 'https://picsum.photos/seed/u2/100',
    content: 'Acabei de fazer o simulado de Humanas. A questão sobre Revolução Industrial tava bem difícil, o que acharam?',
    timestamp: Date.now() - 7200000,
    likes: 24
  },
  {
    id: '3',
    authorName: 'Beatriz Costa',
    authorAvatar: 'https://picsum.photos/seed/u3/100',
    content: 'Dica do dia: Usem o Anki para memorizar fórmulas de Física! Salvou minha vida na prova de ontem.',
    timestamp: Date.now() - 10200000,
    likes: 56
  }
];

const Community: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS);
  const [newPost, setNewPost] = useState('');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    const post: CommunityPost = {
      id: Date.now().toString(),
      authorName: 'Você', // In real app, use auth user
      authorAvatar: 'https://picsum.photos/seed/me/100',
      content: newPost,
      timestamp: Date.now(),
      likes: 0
    };

    setPosts([post, ...posts]);
    setNewPost('');
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Comunidade</h2>
        <p className="text-slate-400">Troque conhecimentos com outros estudantes.</p>
      </div>

      {/* New Post Input */}
      <form onSubmit={handlePost} className="mb-8 relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="No que você está pensando? Dúvidas, dicas..."
            className="w-full bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none min-h-[80px]"
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
             <div className="flex gap-2">
                {/* Formatting tools placeholders could go here */}
             </div>
             <button 
               type="submit" 
               disabled={!newPost.trim()}
               className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
             >
               <Send size={16} />
               Publicar
             </button>
          </div>
        </div>
      </form>

      {/* Feed */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-20">
        {posts.map((post) => (
          <div key={post.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:bg-slate-900/60 transition-colors">
             <div className="flex items-start gap-4">
               <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-full border border-white/10" />
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-bold text-slate-200">{post.authorName}</h4>
                     <span className="text-xs text-slate-500">
                       {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                   </div>
                 </div>
                 <p className="text-slate-300 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                 
                 <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                   <button className="flex items-center gap-2 text-slate-500 hover:text-pink-500 transition-colors group">
                     <Heart size={18} className="group-hover:fill-pink-500/20" />
                     <span className="text-xs font-medium">{post.likes}</span>
                   </button>
                   <button className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors">
                     <MessageCircle size={18} />
                     <span className="text-xs font-medium">Responder</span>
                   </button>
                   <button className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors ml-auto">
                     <Share2 size={16} />
                   </button>
                 </div>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Community;