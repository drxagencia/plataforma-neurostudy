import React, { useState, useEffect } from 'react';
import { CommunityPost } from '../types';
import { DatabaseService } from '../services/databaseService';
import { auth } from '../services/firebaseConfig';
import { MessageCircle, Heart, Share2, Send, Loader2, AlertCircle, Clock } from 'lucide-react';

const Community: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Replies State
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    fetchPosts();
    // Check timer
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkTimer = async () => {
      if(!auth.currentUser) return;
      // In a real optimized app, we'd cache lastPostedAt locally to avoid DB hits every second
      // For this structure, we assume user profile is loaded in App level or we check roughly
  };

  const fetchPosts = async () => {
    const data = await DatabaseService.getPosts();
    setPosts(data);
    setLoading(false);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !auth.currentUser) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await DatabaseService.createPost({
        authorName: auth.currentUser.displayName || 'Estudante',
        authorAvatar: auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser.displayName}`,
        content: newPost,
        timestamp: Date.now(),
        likes: 0
      }, auth.currentUser.uid);
      
      setNewPost('');
      fetchPosts(); 
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
      if (!auth.currentUser) return;
      await DatabaseService.likePost(postId, auth.currentUser.uid);
      // Optimistic update
      setPosts(prev => prev.map(p => p.id === postId ? {...p, likes: p.likes + 1} : p));
  };

  const handleReplySubmit = async (postId: string) => {
      if (!auth.currentUser || !replyContent.trim()) return;
      await DatabaseService.replyPost(postId, {
          author: auth.currentUser.displayName || 'User',
          content: replyContent
      });
      setReplyContent('');
      setReplyingTo(null);
      fetchPosts();
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Comunidade</h2>
        <p className="text-slate-400">Troque conhecimentos. Mostrando as últimas 50 mensagens.</p>
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
          
          {errorMsg && (
             <div className="flex items-center gap-2 text-red-400 text-sm mt-2 p-2 bg-red-900/10 rounded-lg">
                <AlertCircle size={14} />
                {errorMsg}
             </div>
          )}

          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
             <div className="flex gap-2 text-xs text-slate-500 items-center">
                <Clock size={12} /> Limite: 1 post a cada 24h
             </div>
             <button 
               type="submit" 
               disabled={!newPost.trim() || submitting}
               className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
             >
               {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
               Publicar
             </button>
          </div>
        </div>
      </form>

      {/* Feed */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
        {posts.map((post) => (
          <div key={post.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:bg-slate-900/60 transition-colors animate-in slide-in-from-bottom-2">
             <div className="flex items-start gap-4">
               <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-bold text-slate-200">{post.authorName}</h4>
                     <span className="text-xs text-slate-500">
                       {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(post.timestamp).toLocaleDateString()}
                     </span>
                   </div>
                 </div>
                 <p className="text-slate-300 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                 
                 {/* Replies Display would go here (requires DB struct update to fetch) */}
                 
                 <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                   <button 
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-2 text-slate-500 hover:text-pink-500 transition-colors group"
                   >
                     <Heart size={18} className="group-hover:fill-pink-500/20" />
                     <span className="text-xs font-medium">{post.likes}</span>
                   </button>
                   <button 
                    onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors"
                   >
                     <MessageCircle size={18} />
                     <span className="text-xs font-medium">Responder</span>
                   </button>
                 </div>

                 {replyingTo === post.id && (
                     <div className="mt-4 flex gap-2 animate-in fade-in">
                         <input 
                            className="flex-1 glass-input rounded-lg px-3 py-2 text-sm" 
                            placeholder="Escreva sua resposta..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                         />
                         <button onClick={() => handleReplySubmit(post.id)} className="p-2 bg-indigo-600 rounded-lg text-white"><Send size={16}/></button>
                     </div>
                 )}
               </div>
             </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-center text-slate-500 mt-10">Nenhuma postagem ainda.</p>
        )}
      </div>
    </div>
  );
};

export default Community;