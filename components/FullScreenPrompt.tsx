
import React, { useState, useEffect } from 'react';
import { Maximize, Monitor, X, Check } from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { auth } from '../services/firebaseConfig';

const FullScreenPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show only if not in fullscreen and hasn't been dismissed this session
    const hasSeenPrompt = sessionStorage.getItem('seen_fullscreen_prompt');
    const isFullScreen = document.fullscreenElement || (window.innerWidth === screen.width && window.innerHeight === screen.height);
    
    // Check if device is desktop-ish (width > 1024) to avoid annoyance on mobile where F11 concept differs
    if (!hasSeenPrompt && !isFullScreen && window.innerWidth > 1024) {
      // Small delay for entrance animation
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('seen_fullscreen_prompt', 'true');
    // Award XP for engaging with the prompt (assuming they press F11 or click the button)
    if (auth.currentUser) {
        DatabaseService.processXpAction(auth.currentUser.uid, 'FULLSCREEN_MODE');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-700">
      <div className="max-w-3xl w-full mx-4 relative">
        {/* Abstract Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        
        <div className="relative z-10 glass-card p-12 rounded-3xl border border-indigo-500/30 shadow-[0_0_100px_rgba(99,102,241,0.2)] text-center flex flex-col items-center gap-8 transform transition-all animate-in slide-in-from-bottom-8 duration-700">
            
            <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border-4 border-indigo-500/20 shadow-2xl relative group">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <Monitor size={64} className="text-white relative z-10 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-900 p-2 rounded-full border-4 border-slate-950">
                    <Maximize size={24} />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-5xl font-black text-white tracking-tight font-display">
                    Modo Imersivo
                </h2>
                <p className="text-xl text-slate-300 font-sans max-w-xl mx-auto leading-relaxed">
                    Para a melhor experiência na plataforma <strong>NeuroStudy</strong>, recomendamos utilizar o navegador em tela cheia.
                </p>
                <div className="py-4">
                    <span className="inline-block px-6 py-3 rounded-xl bg-slate-800 border border-white/10 text-indigo-300 font-mono text-2xl font-bold shadow-lg tracking-widest">
                        Pressione F11
                    </span>
                </div>
            </div>

            <button 
                onClick={handleDismiss}
                className="group px-10 py-4 bg-white text-slate-950 font-bold text-lg rounded-2xl hover:bg-indigo-50 transition-all shadow-xl shadow-white/10 hover:scale-105 active:scale-95 flex items-center gap-3"
            >
                <Check size={24} className="text-emerald-600" />
                <span>Entendi, vamos lá!</span>
            </button>

            <p className="text-slate-500 text-sm mt-4">
                Ganhe XP extra por estudar em modo focado.
            </p>
        </div>
      </div>
    </div>
  );
};

export default FullScreenPrompt;
