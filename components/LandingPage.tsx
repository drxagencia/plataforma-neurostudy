
import React, { useEffect, useState, useRef } from 'react';
import { Rocket, Star, Zap, Shield, CheckCircle, Skull, Play, Lock, AlertTriangle, ChevronDown, Trophy, Timer, Swords, BrainCircuit } from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { TrafficConfig } from '../types';

interface LandingPageProps {
  onStartGame: () => void;
}

// --- FAKE PROGRESS BAR COMPONENT ---
// Barra que começa rápida e fica lenta para prender a atenção
const FakeProgressBar = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                // Lógica de desaceleração:
                // 0-30%: Muito Rápido (Hook)
                if (prev < 30) return prev + 0.8;
                // 30-70%: Médio (Conteúdo)
                if (prev < 70) return prev + 0.2;
                // 70-90%: Lento (Retenção)
                if (prev < 90) return prev + 0.05;
                // 90-99%: Quase parando (Ansiedade de conclusão)
                if (prev < 99) return prev + 0.01;
                return prev;
            });
        }, 50);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mt-4 border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.3)] relative group">
            <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 relative transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
            >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px] animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-md tracking-widest opacity-80">
                CARREGANDO MÉTODO NEURO-ACELERADO... {Math.floor(progress)}%
            </div>
        </div>
    );
};

// --- COUNTDOWN TIMER ---
const Countdown = () => {
    const [time, setTime] = useState({ m: 14, s: 59 });

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(prev => {
                if (prev.s === 0) {
                    if (prev.m === 0) return prev;
                    return { m: prev.m - 1, s: 59 };
                }
                return { ...prev, s: prev.s - 1 };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 text-red-400 font-mono font-bold text-xl bg-red-950/30 px-4 py-2 rounded-lg border border-red-500/30 animate-pulse">
            <Timer size={20} />
            <span>00:{time.m.toString().padStart(2, '0')}:{time.s.toString().padStart(2, '0')}</span>
        </div>
    );
};

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  const [config, setConfig] = useState<TrafficConfig>({
      vslScript: '',
      checkoutLinkMonthly: '',
      checkoutLinkYearly: ''
  });
  
  const [showCheckout, setShowCheckout] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [purchasedCount, setPurchasedCount] = useState(842);

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

    // Fake social proof ticker
    const interval = setInterval(() => {
        setPurchasedCount(prev => prev + Math.floor(Math.random() * 3));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const scrollToCheckout = () => {
      setShowCheckout(true);
      setTimeout(() => {
          checkoutRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-indigo-500/30 relative">
      
      {/* --- ESTRELAS E AMBIENTAÇÃO (Copiado do App.tsx para manter consistência) --- */}
      <div className="stars-container fixed inset-0 z-0 pointer-events-none">
          <div className="star-layer stars-1"></div>
          <div className="star-layer stars-2"></div>
          <div className="star-layer stars-3"></div>
          <div className="nebula-glow fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.1),transparent_70%)]"></div>
      </div>

      {/* --- HERO SECTION: START GAME --- */}
      <section className="h-screen flex flex-col items-center justify-center relative z-10 px-6">
          <div className="absolute top-10 flex flex-col items-center animate-in fade-in duration-1000">
             <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/50 mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-pulse-slow">
                 <BrainCircuit size={40} className="text-indigo-400" />
             </div>
             <h3 className="text-indigo-300 font-bold tracking-[0.3em] text-xs uppercase">NeuroStudy OS v2.0</h3>
          </div>

          <div className="text-center space-y-8 max-w-4xl">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-[0_0_35px_rgba(255,255,255,0.2)] animate-in zoom-in-50 duration-1000">
                  READY PLAYER ONE?
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                  Você está prestes a entrar no <strong className="text-white">único sistema</strong> capaz de hackear sua aprovação no ENEM em tempo recorde.
              </p>
              
              <div className="pt-8 animate-bounce">
                  <button 
                    onClick={() => {
                        document.getElementById('enemies-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="group relative px-12 py-6 bg-transparent overflow-hidden rounded-none"
                  >
                      <div className="absolute inset-0 w-full h-full bg-indigo-600/20 border-2 border-indigo-500 skew-x-[-20deg] group-hover:bg-indigo-600 group-hover:shadow-[0_0_50px_rgba(99,102,241,0.6)] transition-all duration-300" />
                      <div className="relative flex items-center gap-4 text-2xl font-black text-white tracking-widest uppercase">
                          <Play size={24} className="fill-white" />
                          PRESS START
                      </div>
                  </button>
              </div>
          </div>
          
          <div className="absolute bottom-10 text-slate-600 text-xs uppercase tracking-widest animate-pulse">
              Scroll to Continue
          </div>
      </section>

      {/* --- SECTION 2: CHOOSE YOUR ENEMIES (PAIN POINTS) --- */}
      <section id="enemies-section" className="py-24 relative z-10 bg-gradient-to-b from-black via-slate-950 to-black border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                  <span className="text-red-500 font-bold tracking-widest uppercase text-sm mb-2 block animate-pulse">Warning: Threats Detected</span>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4">ESCOLHA SEUS INIMIGOS</h2>
                  <p className="text-slate-400">Quais destes "Monstros" estão drenando seu XP diário?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                      { title: "Procrastinação", lvl: "LVL 99 BOSS", icon: <Timer size={40} />, desc: "Rouba 4h do seu dia rolando feed.", color: "red" },
                      { title: "Ansiedade", lvl: "Elite Mob", icon: <AlertTriangle size={40} />, desc: "Causa debuff de 'Branco' na hora da prova.", color: "orange" },
                      { title: "Desorganização", lvl: "Common Mob", icon: <Swords size={40} />, desc: "Impede você de saber o que estudar hoje.", color: "yellow" }
                  ].map((enemy, idx) => (
                      <div key={idx} className="group relative bg-slate-900/50 border border-white/10 p-8 rounded-2xl hover:bg-red-950/20 hover:border-red-500/50 transition-all duration-500 cursor-crosshair">
                          <div className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded bg-${enemy.color}-500/20 text-${enemy.color}-400 border border-${enemy.color}-500/30`}>
                              {enemy.lvl}
                          </div>
                          <div className={`mb-6 text-${enemy.color}-500 group-hover:scale-110 transition-transform duration-300`}>
                              {enemy.icon}
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">{enemy.title}</h3>
                          <p className="text-slate-400 text-sm">{enemy.desc}</p>
                          <div className="mt-6 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full bg-${enemy.color}-500 w-[90%]`}></div>
                          </div>
                          <p className="text-[10px] text-right mt-1 text-slate-500 uppercase">HP Points</p>
                      </div>
                  ))}
              </div>

              <div className="mt-16 text-center">
                  <p className="text-2xl font-bold text-white mb-6">Você precisa de uma <span className="text-indigo-400">Arma Lendária</span> para vencê-los.</p>
                  <ChevronDown size={40} className="mx-auto text-indigo-500 animate-bounce" />
              </div>
          </div>
      </section>

      {/* --- SECTION 3: THE WEAPON (VSL & FAKE BAR) --- */}
      <section className="py-20 relative z-10 px-6">
          <div className="max-w-5xl mx-auto">
              <div className="bg-slate-900/80 p-1 rounded-3xl border border-indigo-500/30 shadow-[0_0_100px_rgba(79,70,229,0.15)] backdrop-blur-xl relative">
                  {/* Monitor Header */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-slate-950/50 rounded-t-2xl">
                      <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/50" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                          <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      </div>
                      <div className="flex-1 text-center text-xs font-mono text-slate-500">SECRET_WEAPON_FILE.mp4</div>
                  </div>

                  {/* Video Container */}
                  <div className="relative aspect-video bg-black rounded-b-xl overflow-hidden group">
                      <video 
                        src="/video.mp4" 
                        className="w-full h-full object-cover" 
                        controls 
                        controlsList="nodownload"
                        poster="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000&auto=format&fit=crop"
                      >
                          Seu navegador não suporta vídeos.
                      </video>
                      
                      {/* Fake overlay for play if needed, but native controls are better for VSL usually, 
                          UNLESS the prompt implies the video should autoplay or look like a game cutscene. 
                          Keeping native controls for usability but adding the fake bar BELOW. */}
                  </div>
              </div>

              {/* THE FAKE PROGRESS BAR (Psychological Hook) */}
              <div className="mt-6 max-w-3xl mx-auto">
                  <div className="flex justify-between text-xs text-indigo-300 font-bold mb-1 uppercase tracking-wider">
                      <span>Sincronizando Conhecimento...</span>
                      <span className="animate-pulse text-emerald-400">Conexão Segura</span>
                  </div>
                  <FakeProgressBar />
                  <p className="text-center text-slate-500 text-xs mt-4">
                      <Lock size={12} className="inline mr-1" />
                      Este vídeo sairá do ar automaticamente quando o contador atingir o limite.
                  </p>
              </div>

              <div className="mt-12 text-center">
                  <button 
                    onClick={scrollToCheckout}
                    className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-xl shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:scale-105 transition-all animate-pulse-slow flex items-center gap-3 mx-auto"
                  >
                      <Rocket size={24} />
                      DESBLOQUEAR ACESSO AGORA
                  </button>
              </div>
          </div>
      </section>

      {/* --- SECTION 4: THE LOOT (CHECKOUT) --- */}
      <div ref={checkoutRef}>
        {showCheckout && (
          <section className="py-24 relative z-10 bg-slate-950 border-t border-indigo-500/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.1),transparent_70%)] pointer-events-none" />
              
              <div className="max-w-6xl mx-auto px-6 relative">
                  {/* Urgency Header */}
                  <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-12 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-red-500/20 rounded-lg text-red-500 animate-bounce">
                              <AlertTriangle size={24} />
                          </div>
                          <div>
                              <h4 className="text-red-400 font-bold uppercase tracking-wider">Oferta por tempo limitado</h4>
                              <p className="text-red-200/60 text-sm">O preço subirá em breve.</p>
                          </div>
                      </div>
                      <Countdown />
                  </div>

                  <div className="text-center mb-16">
                      <h2 className="text-4xl md:text-6xl font-black text-white mb-6">ESCOLHA SEU EQUIPAMENTO</h2>
                      <p className="text-slate-400 text-lg">Junte-se a <span className="text-emerald-400 font-bold">{purchasedCount} estudantes</span> que evoluíram hoje.</p>
                  </div>

                  {/* Pricing Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                      {/* Basic */}
                      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative hover:border-slate-600 transition-all opacity-80 hover:opacity-100">
                          <h3 className="text-xl font-bold text-slate-300">Iniciante</h3>
                          <div className="my-4">
                              <span className="text-4xl font-black text-white">R$ 37</span>
                              <span className="text-slate-500">/mês</span>
                          </div>
                          <ul className="space-y-3 mb-8 text-slate-400 text-sm">
                              <li className="flex gap-2"><CheckCircle size={16} /> Acesso Básico</li>
                              <li className="flex gap-2"><CheckCircle size={16} /> Sem Tutor IA</li>
                              <li className="flex gap-2"><CheckCircle size={16} /> Sem Correção Redação</li>
                          </ul>
                          <button 
                             onClick={() => window.open(config.checkoutLinkMonthly, '_blank')}
                             className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                          >
                              Equipar Básico
                          </button>
                      </div>

                      {/* PRO (Highlighted) */}
                      <div className="bg-gradient-to-b from-indigo-900/40 to-slate-900 border-2 border-indigo-500 p-8 rounded-3xl relative transform scale-105 shadow-[0_0_60px_rgba(99,102,241,0.15)] z-10">
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                              Recomendado
                          </div>
                          <h3 className="text-2xl font-black text-white flex items-center gap-2">
                              <Trophy size={24} className="text-yellow-400" /> PRO GAMER
                          </h3>
                          <p className="text-indigo-200/60 text-xs mt-1">O pacote completo para aprovação.</p>
                          
                          <div className="my-6">
                              <span className="text-slate-500 line-through text-lg">R$ 197</span>
                              <div className="flex items-end gap-1">
                                  <span className="text-6xl font-black text-white">R$ 47</span>
                                  <span className="text-indigo-300 font-bold mb-2">/mês</span>
                              </div>
                          </div>

                          <ul className="space-y-4 mb-8 text-slate-300 font-medium">
                              <li className="flex gap-3 items-center"><CheckCircle size={20} className="text-emerald-400" /> Correção de Redação IA</li>
                              <li className="flex gap-3 items-center"><CheckCircle size={20} className="text-emerald-400" /> Tutor 24h (Tira-dúvidas)</li>
                              <li className="flex gap-3 items-center"><CheckCircle size={20} className="text-emerald-400" /> Ranking Global</li>
                              <li className="flex gap-3 items-center"><CheckCircle size={20} className="text-emerald-400" /> Acesso Imediato</li>
                          </ul>

                          <button 
                             onClick={() => window.open(config.checkoutLinkMonthly, '_blank')}
                             className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl rounded-xl shadow-lg shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                          >
                              <Zap size={24} className="fill-white" /> DESBLOQUEAR TUDO
                          </button>
                          <p className="text-center text-[10px] text-slate-500 mt-3">Garantia de 7 dias ou seu dinheiro de volta.</p>
                      </div>

                      {/* Anual */}
                      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative hover:border-emerald-500/30 transition-all">
                          <h3 className="text-xl font-bold text-emerald-400">Anual (VIP)</h3>
                          <p className="text-slate-500 text-xs">Pague 1x e use o ano todo.</p>
                          <div className="my-4">
                              <span className="text-4xl font-black text-white">R$ 97</span>
                              <span className="text-slate-500">/ano</span>
                          </div>
                          <ul className="space-y-3 mb-8 text-slate-400 text-sm">
                              <li className="flex gap-2"><CheckCircle size={16} /> Tudo do PRO</li>
                              <li className="flex gap-2"><CheckCircle size={16} /> + Bônus Exclusivos</li>
                              <li className="flex gap-2"><CheckCircle size={16} /> Economia de 70%</li>
                          </ul>
                          <button 
                             onClick={() => window.open(config.checkoutLinkYearly, '_blank')}
                             className="w-full py-3 bg-slate-800 border border-white/10 text-white font-bold rounded-xl hover:bg-emerald-900/20 hover:text-emerald-400 transition-colors"
                          >
                              Assinar Anual
                          </button>
                      </div>
                  </div>

                  <div className="mt-20 border-t border-white/5 pt-10 text-center text-slate-500 text-sm pb-10">
                      <div className="flex justify-center gap-6 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                          <Shield size={32} />
                          <Lock size={32} />
                          <CheckCircle size={32} />
                      </div>
                      <p>Compra processada via Pagamento Seguro. Seus dados estão protegidos.</p>
                      <button onClick={onStartGame} className="mt-4 text-indigo-500 hover:text-indigo-400 underline">
                          Já sou aluno, fazer login
                      </button>
                  </div>
              </div>
          </section>
        )}
      </div>

    </div>
  );
};

export default LandingPage;
