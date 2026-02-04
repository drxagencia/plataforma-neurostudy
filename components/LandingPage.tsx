import React, { useEffect, useState } from 'react';
import { Rocket, Star, Play, Zap, Shield, CheckCircle } from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { TrafficConfig } from '../types';

interface LandingPageProps {
  onStartGame: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  const [config, setConfig] = useState<TrafficConfig>({
      vslScript: '',
      checkoutLinkMonthly: '',
      checkoutLinkYearly: ''
  });

  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const settings = await DatabaseService.getTrafficSettings();
            setConfig(settings);
        } catch (error) {
            console.error("Error loading traffic settings", error);
        }
    };
    fetchConfig();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
           <div className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 cursor-pointer" onClick={onStartGame}>
               NeuroStudy AI
           </div>
           <button 
             onClick={onStartGame}
             className="px-6 py-2.5 bg-white text-indigo-950 font-bold rounded-full hover:scale-105 transition-transform text-sm shadow-lg shadow-white/10"
           >
               Área do Aluno
           </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
          {/* Background FX */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <Star size={12} className="fill-indigo-300" /> Plataforma #1 para ENEM
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                  A Inteligência Artificial <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">que Aprova Você.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                  Estude com a única plataforma que combina correção de redação instantânea, tutoria personalizada 24h e gamificação avançada.
              </p>

              {/* VSL Area */}
              <div className="relative aspect-video w-full bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden mb-12 group animate-in fade-in zoom-in-95 duration-1000 delay-300">
                  {config.vslScript ? (
                      <div dangerouslySetInnerHTML={{ __html: config.vslScript }} className="w-full h-full" />
                  ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950 relative">
                          <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
                          <Play size={64} className="mb-4 opacity-50 relative z-10" />
                          <p className="font-bold relative z-10">Vídeo de Apresentação</p>
                      </div>
                  )}
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
                  <button 
                    onClick={onStartGame}
                    className="group relative px-10 py-5 bg-white text-indigo-950 font-black text-lg md:text-xl rounded-full shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"
                  >
                      <Rocket size={24} className="text-indigo-600 group-hover:animate-ping" />
                      ACESSAR PLATAFORMA AGORA
                  </button>
                  
                  <p className="mt-6 text-slate-500 text-sm">
                      Dúvidas? Chame nosso suporte no <a href="https://wa.me/5584996085794" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline font-bold transition-colors">WhatsApp</a>.
                  </p>
              </div>
          </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-900/50 border-t border-white/5 relative">
          <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                      { icon: <Zap className="text-yellow-400" size={32} />, title: "Correção Imediata", desc: "Envie a foto da sua redação e receba a nota com feedback detalhado em segundos." },
                      { icon: <Shield className="text-emerald-400" size={32} />, title: "Tutor 24h", desc: "Tire dúvidas, peça resumos e explicações a qualquer hora com nossa IA treinada." },
                      { icon: <Rocket className="text-indigo-400" size={32} />, title: "Gamificação", desc: "Suba de nível, conquiste rankings e torne o estudo viciante." }
                  ].map((f, i) => (
                      <div key={i} className="p-8 rounded-3xl bg-slate-950 border border-white/5 hover:border-indigo-500/30 transition-colors group">
                          <div className="mb-6 p-4 bg-slate-900 rounded-2xl w-fit group-hover:scale-110 transition-transform">{f.icon}</div>
                          <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                          <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-slate-600 text-sm bg-slate-950">
          <div className="flex items-center justify-center gap-2 mb-4">
               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                   <CheckCircle size={16} className="text-indigo-500"/>
               </div>
               <span className="font-bold text-slate-400">NeuroStudy AI</span>
          </div>
          <p>© {new Date().getFullYear()} NeuroStudy AI. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingPage;