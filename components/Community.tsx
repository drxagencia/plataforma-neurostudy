
import React, { useState, useEffect } from 'react';
import { CommunityPost, UserProfile } from '../types';
import { DatabaseService } from '../services/databaseService';
import { auth } from '../services/firebaseConfig';
import { MessageCircle, Heart, Share2, Send, Loader2, AlertCircle, Clock, CornerDownRight } from 'lucide-react';

interface CommunityProps {
    user: UserProfile;
}

const Community: React.FC<CommunityProps> = ({ user }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timerString, setTimerString] = useState<string | null>(null);

  // Replies State
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 1. Fetch Posts
  useEffect(() => {
    fetchPosts();
    // Start local timer loop
    const timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay(); // Initial call
    return () => clearInterval(timerInterval);
  }, []);

  // 2. Timer Logic using props (No DB fetch)
  const updateTimerDisplay = () => {
      if (!user.lastPostedAt) {
          setTimerString(null);
          return;
      }
      
      const nextPostTime = user.lastPostedAt + (24 * 60 * 60 * 1000);
      const diff = nextPostTime - Date.now();

      if (diff <= 0) {
          setTimerString(null); // Timer finished
      } else {
          // Format HH:MM:SS
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          setTimerString(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
  };

  const fetchPosts = async () => {
    const data = await DatabaseService.getPosts();
    setPosts(data);
    setLoading(false);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !auth.currentUser) return;

    if (timerString) {
        setErrorMsg(`Aguarde ${timerString} para postar novamente.`);
        return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await DatabaseService.createPost({
        authorName: user.displayName || 'Estudante',
        authorAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
        content: newPost,
        timestamp: Date.now(),
        likes: 0
      }, user.uid);
      
      setNewPost('');
      // Force refresh posts. Note: User prop won't update instantly here without parent refresh,
      // but for Community limiting, the backend rejection handles it, and we optimistically assume timer started.
      fetchPosts(); 
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
      if (!auth.currentUser) return;
      
      // Optimistic UI Update (Instant feedback)
      setPosts(prev => prev.map(p => p.id === postId ? {...p, likes: (p.likes || 0) + 1} : p));

      // Database Transaction
      try {
        await DatabaseService.likePost(postId, auth.currentUser.uid);
      } catch (e) {
        console.error("Like failed", e);
        // Revert on fail
        setPosts(prev => prev.map(p => p.id === postId ? {...p, likes: (p.likes || 0) - 1} : p));
      }
  };

  const handleReplySubmit = async (postId: string) => {
      if (!auth.currentUser || !replyContent.trim()) return;
      
      try {
          await DatabaseService.replyPost(postId, {
              author: user.displayName || 'User',
              content: replyContent
          });
          
          setReplyContent('');
          setReplyingTo(null);
          fetchPosts(); // Reload to show new reply
      } catch (e) {
          alert("Erro ao responder");
      }
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
            placeholder={timerString ? `Você poderá postar novamente em ${timerString}` : "No que você está pensando? Dúvidas, dicas..."}
            disabled={!!timerString}
            className="w-full bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none min-h-[80px] disabled:opacity-50"
          />
          
          {errorMsg && (
             <div className="flex items-center gap-2 text-red-400 text-sm mt-2 p-2 bg-red-900/10 rounded-lg">
                <AlertCircle size={14} />
                {errorMsg}
             </div>
          )}

          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
             <div className={`flex gap-2 text-xs items-center ${timerString ? 'text-yellow-400 font-mono font-bold' : 'text-slate-500'}`}>
                <Clock size={12} /> 
                {timerString ? `Próximo post em: ${timerString}` : 'Limite: 1 post a cada 24h'}
             </div>
             <button 
               type="submit" 
               disabled={!newPost.trim() || submitting || !!timerString}
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
                 
                 {/* Replies Section */}
                 {post.replies && post.replies.length > 0 && (
                     <div className="mt-4 space-y-3 pl-4 border-l-2 border-white/5">
                         {post.replies.map((reply, idx) => (
                             <div key={idx} className="bg-slate-800/50 p-3 rounded-xl">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-xs font-bold text-indigo-300">{reply.author}</span>
                                     <span className="text-[10px] text-slate-500">{new Date(reply.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 <p className="text-slate-300 text-xs">{reply.content}</p>
                             </div>
                         ))}
                     </div>
                 )}

                 {/* Action Bar */}
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
                    className={`flex items-center gap-2 transition-colors ${replyingTo === post.id ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-400'}`}
                   >
                     <MessageCircle size={18} />
                     <span className="text-xs font-medium">Responder</span>
                   </button>
                 </div>

                 {/* Reply Input */}
                 {replyingTo === post.id && (
                     <div className="mt-4 flex gap-2 animate-in fade-in items-start">
                         <CornerDownRight size={16} className="text-slate-600 mt-3" />
                         <div className="flex-1 flex gap-2">
                            <textarea 
                                className="flex-1 glass-input rounded-xl px-3 py-2 text-sm min-h-[40px] resize-none" 
                                placeholder="Escreva sua resposta..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                            />
                            <button 
                                onClick={() => handleReplySubmit(post.id)} 
                                disabled={!replyContent.trim()}
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white h-[40px] w-[40px] flex items-center justify-center"
                            >
                                <Send size={16}/>
                            </button>
                         </div>
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
