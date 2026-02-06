
import React, { useEffect, useState, useRef } from 'react';
import { Rocket, Star, Zap, Shield, CheckCircle, Skull, Play, Lock, AlertTriangle, ChevronDown, Trophy, Timer, Swords, BrainCircuit, ArrowRight, MousePointerClick, CreditCard, QrCode, X, Check, Copy, User, Mail, Smartphone, Eye, Sparkles, Crosshair } from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { TrafficConfig, Lead } from '../types';
import { KIRVANO_LINKS } from '../constants';

interface LandingPageProps {
  onStartGame: () => void;
}

// --- FAKE PROGRESS BAR COMPONENT ---
const FakeProgressBar = ({ onHalfTime, onFinish }: { onHalfTime: () => void, onFinish: () => void }) => {
    const [progress, setProgress] = useState(75);

    useEffect(() => {
        const totalDuration = 25000;
        const intervalTime = 100;
        const steps = totalDuration / intervalTime;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            setProgress(prev => {
                if (prev >= 98.5) return 98.5;
                const increment = (99 - prev) / 150; 
                return prev + increment;
            });

            if (currentStep === Math.floor(steps / 2)) onHalfTime();
            if (currentStep >= steps) {
                onFinish();
                clearInterval(interval);
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full">
            <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1"><Lock size={10} /> Descriptografando Método...</span>
                <span className="animate-pulse text-white">Não feche a janela</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-white/20 shadow-inner relative group cursor-not-allowed">
                <div 
                    className="h-full bg-white relative transition-all duration-100 ease-linear shadow-[0_0_10px_white]"
                    style={{ width: `${progress}%` }}
                >
                </div>
            </div>
        </div>
    );
};

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  // Refs para rolagem suave
  const heroRef = useRef<HTMLDivElement>(null);
  const enemiesRef = useRef<HTMLDivElement>(null);
  const vslRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  // VSL Logic
  const [showEarlyOffer, setShowEarlyOffer] = useState(false);
  const [showFinalOffer, setShowFinalOffer] = useState(false);
  
  // Visibility Logic (Anti-Pixel confusion)
  const [showPricingSection, setShowPricingSection] = useState(false);

  // Enemy Shooting Logic
  const [deadEnemies, setDeadEnemies] = useState<number[]>([]);

  // Pricing / Checkout Logic
  // DEFAULT YEARLY AS REQUESTED
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixAmount, setPixAmount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced'>('advanced');
  const [purchasedCount, setPurchasedCount] = useState(842);
  const [config, setConfig] = useState<TrafficConfig>({ vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' });

  useEffect(() => {
    DatabaseService.getTrafficSettings().then(setConfig);
    const interval = setInterval(() => {
        setPurchasedCount(prev => prev + Math.floor(Math.random() * 3));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRevealOffer = () => {
      setShowPricingSection(true);
      // Small timeout to allow render before scroll
      setTimeout(() => {
          scrollToSection(pricingRef);
      }, 100);
  };

  const handleKillEnemy = (index: number) => {
      if (deadEnemies.includes(index)) return;
      setDeadEnemies(prev => [...prev, index]);
      
      // Vibrate on mobile
      if (navigator.vibrate) navigator.vibrate(50);
  };

  // --- ACTIONS ---
  const handleCheckout = (plan: 'basic' | 'advanced', method: 'pix' | 'card') => {
      let price = 0;
      if (plan === 'basic') {
          price = billingCycle === 'monthly' ? 9.90 : 97.00;
      } else {
          price = billingCycle === 'monthly' ? 19.90 : 197.00;
      }

      if (method === 'card') {
          let link = "https://kirvano.com";
          // Use specific Plan links from constants if available
          if (plan === 'basic') link = KIRVANO_LINKS.plan_basic;
          else if (plan === 'advanced') link = KIRVANO_LINKS.plan_advanced;
          
          window.open(link, '_blank');
      } else {
          try {
              const payload = PixService.generatePayload(price);
              setPixPayload(payload);
              setPixAmount(price);
              setShowPixModal(true);
          } catch (e) {
              alert("Erro ao gerar PIX");
          }
      }
  };

  // Helper to display price based on cycle
  const getPriceDisplay = (plan: 'basic' | 'advanced') => {
      if (billingCycle === 'monthly') {
          // Monthly Display
          const val = plan === 'basic' ? '9,90' : '19,90';
          return (
              <div className="mb-6 opacity-80">
                  <span className="text-3xl font-black text-white">R$ {val}</span>
                  <span className="text-zinc-500 text-sm font-bold">/mês</span>
              </div>
          );
      } else {
          // Yearly Display (Shown as Monthly Equivalent)
          const total = plan === 'basic' ? 97.00 : 197.00;
          const monthlyEq = (total / 12).toFixed(2).replace('.', ',');
          
          return (
              <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-white">R$ {monthlyEq}</span>
                      <span className="text-zinc-400 text-sm font-bold">/mês</span>
                  </div>
                  <p className="text-xs text-emerald-400 font-bold mt-1 bg-emerald-900/20 inline-block px-2 py-1 rounded border border-emerald-500/20">
                      ou R$ {total.toFixed(2).replace('.', ',')} à vista
                  </p>
              </div>
          );
      }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans overflow-y-auto overflow-x-hidden relative selection:bg-white selection:text-black scroll-smooth">
      
      {/* 90FPS CSS Optimizations */}
      <style>{`
        :root { --star-color: #ffffff !important; }
        .nebula-glow { opacity: 0.15 !important; background-image: none !important; will-change: transform, opacity; } 
        .star-layer { opacity: 1 !important; will-change: transform; }
        
        /* Shooting Animation */
        @keyframes muzzleFlash {
            0% { background-color: rgba(255, 255, 255, 0.8); }
            100% { background-color: transparent; }
        }
        @keyframes enemyDeath {
            0% { transform: scale(1) translate(0, 0); filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5); }
            20% { transform: scale(0.95) translate(5px, -5px); }
            40% { transform: scale(0.9) translate(-5px, 5px); }
            100% { transform: scale(0.8) translateY(20px); opacity: 0; filter: grayscale(1); }
        }
        .animate-shot {
            animation: enemyDeath 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .muzzle-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            animation: muzzleFlash 0.1s linear forwards;
            z-index: 50;
        }
      `}</style>

      {/* Background Fixado (Visível em toda a rolagem - z-0) */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
          <div className="star-layer stars-1"></div>
          <div className="star-layer stars-2"></div>
          <div className="star-layer stars-3"></div>
      </div>

      <div className="relative z-10">

          {/* === TELA 1: HERO === */}
          <section ref={heroRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20 bg-transparent">
              <div className="absolute top-8 flex flex-col items-center animate-in fade-in duration-1000">
                 <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/20 mb-4 shadow-[0_0_30px_rgba(255,255,255,0.1)] animate-pulse-slow">
                     <BrainCircuit size={40} className="text-white" />
                 </div>
                 <h3 className="text-zinc-400 font-bold tracking-[0.3em] text-xs uppercase mt-2">NeuroStudy OS</h3>
              </div>

              <div className="text-center space-y-8 max-w-4xl z-10 mt-24">
                  <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.3)] animate-in zoom-in-50 duration-1000 uppercase leading-none">
                      Você está<br/>pronto?
                  </h1>
                  <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
                      Você está prestes a entrar no <strong className="text-white">único sistema</strong> capaz de hackear sua aprovação no ENEM em tempo recorde.
                  </p>
                  
                  <div className="pt-8">
                      <button 
                        onClick={() => scrollToSection(enemiesRef)}
                        className="group relative px-12 py-5 bg-transparent overflow-hidden rounded-none border border-white/30 transition-all duration-300 hover:border-white hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                      >
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300 skew-x-12 scale-150 origin-left" />
                          <div className="relative flex items-center gap-4 text-2xl font-black text-white tracking-[0.2em] uppercase group-hover:tracking-[0.3em] transition-all duration-300">
                              <Play size={24} className="fill-white group-hover:text-white transition-colors" />
                              PRESS START
                          </div>
                      </button>
                  </div>
              </div>
              
              <div className="absolute bottom-10 animate-bounce text-zinc-600">
                  <ChevronDown size={32} />
              </div>
          </section>

          {/* === TELA 2: INIMIGOS (SHOOTER MODE) === */}
          <section ref={enemiesRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20 bg-black/20 backdrop-blur-sm cursor-[url('https://cdn.custom-cursor.com/db/cursor/32/Crosshair.png'),_crosshair]">
              <div className="max-w-6xl mx-auto w-full">
                  <div className="text-center mb-16">
                      <span className="text-white font-mono font-bold tracking-widest uppercase text-sm mb-4 block animate-pulse border border-white/20 inline-block px-4 py-1 rounded">System Alert: Threats Detected</span>
                      <h2 className="text-4xl md:text-6xl font-black text-white mb-4">ESCOLHA SEUS INIMIGOS</h2>
                      <p className="text-zinc-400 flex items-center justify-center gap-2">
                          <Crosshair size={16} /> Clique para eliminar os "Monstros" que drenam seu XP.
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                      {[
                          { title: "Procrastinação", lvl: "LVL 99 BOSS", icon: <Timer size={40} />, desc: "Rouba 4h do seu dia rolando feed.", color: "text-white" },
                          { title: "Ansiedade", lvl: "Elite Mob", icon: <AlertTriangle size={40} />, desc: "Causa debuff de 'Branco' na hora da prova.", color: "text-zinc-300" },
                          { title: "Desorganização", lvl: "Common Mob", icon: <Swords size={40} />, desc: "Impede você de saber o que estudar hoje.", color: "text-zinc-400" }
                      ].map((enemy, idx) => {
                          const isDead = deadEnemies.includes(idx);
                          return (
                          <div 
                            key={idx} 
                            onClick={() => handleKillEnemy(idx)}
                            className={`group relative bg-black/60 border border-white/10 p-8 rounded-2xl transition-all duration-300 select-none overflow-hidden ${isDead ? 'animate-shot pointer-events-none' : 'hover:bg-white/5 hover:border-white/40 cursor-[url(https://cdn.custom-cursor.com/db/cursor/32/Crosshair.png),_crosshair]'}`}
                          >
                              {isDead && (
                                  <>
                                    <div className="muzzle-overlay" />
                                    <div className="absolute inset-0 flex items-center justify-center z-20">
                                        <span className="text-red-500 font-black text-4xl -rotate-12 border-4 border-red-500 px-4 py-2 rounded-lg opacity-80">ELIMINADO</span>
                                    </div>
                                  </>
                              )}

                              <div className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded bg-white/10 text-white border border-white/20`}>
                                  {enemy.lvl}
                              </div>
                              <div className={`mb-6 text-white group-hover:scale-110 transition-transform duration-300`}>
                                  {enemy.icon}
                              </div>
                              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-zinc-200 transition-colors">{enemy.title}</h3>
                              <p className="text-zinc-500 text-sm group-hover:text-zinc-400">{enemy.desc}</p>
                              <div className="mt-6 w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-full bg-white w-[90%] shadow-[0_0_10px_white]`}></div>
                              </div>
                          </div>
                      )})}
                  </div>

                  <div className="text-center">
                      <button 
                        onClick={() => scrollToSection(vslRef)}
                        className="px-10 py-4 bg-white text-black font-black text-xl rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 transition-all flex items-center gap-3 mx-auto uppercase tracking-wide hover:bg-zinc-200"
                      >
                          <Swords size={24} />
                          Enfrentar Agora
                      </button>
                  </div>
              </div>
          </section>

          {/* === TELA 3: VSL === */}
          <section ref={vslRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20 bg-black/30 backdrop-blur-md">
              <div className="max-w-5xl w-full">
                  <div className="bg-black/80 rounded-3xl border border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.05)] backdrop-blur-xl relative overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-zinc-900/50">
                          <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-zinc-600" />
                              <div className="w-3 h-3 rounded-full bg-zinc-600" />
                              <div className="w-3 h-3 rounded-full bg-zinc-600" />
                          </div>
                          <div className="flex-1 text-center text-xs font-mono text-zinc-500">SECRET_WEAPON_FILE.mp4</div>
                      </div>

                      <div className="relative aspect-video bg-black rounded-none overflow-hidden group">
                          <video 
                            src="/video.mp4" 
                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                            controls 
                            controlsList="nodownload"
                            poster="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000&auto=format&fit=crop"
                          >
                              Seu navegador não suporta vídeos.
                          </video>
                      </div>

                      <div className="bg-black p-4 border-t border-white/10">
                          <FakeProgressBar 
                            onHalfTime={() => setShowEarlyOffer(true)} 
                            onFinish={() => setShowFinalOffer(true)} 
                          />
                      </div>
                  </div>

                  <div className="mt-10 text-center h-24 relative flex flex-col items-center justify-center">
                      {showFinalOffer ? (
                          <div className="animate-in zoom-in-50 duration-500 w-full">
                              <button 
                                onClick={handleRevealOffer}
                                className="w-full md:w-auto px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-2xl rounded-xl shadow-[0_0_60px_rgba(16,185,129,0.4)] hover:scale-105 transition-all animate-pulse-slow flex items-center justify-center gap-3 mx-auto uppercase tracking-widest border border-emerald-400/50"
                              >
                                  <Rocket size={28} className="fill-white" />
                                  LIBERAR ACESSO AGORA
                              </button>
                              <p className="text-xs text-zinc-500 mt-3 font-mono">O vídeo acabou. Sua oportunidade começou.</p>
                          </div>
                      ) : showEarlyOffer && (
                          <button 
                            onClick={handleRevealOffer}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-6 py-3 rounded-lg text-sm font-bold animate-in fade-in transition-all flex items-center gap-2 border border-white/10 hover:border-white/30"
                          >
                              <Eye size={16} /> Espiar Oferta
                          </button>
                      )}
                  </div>
              </div>
          </section>

          {/* === TELA 4: CHECKOUT / PREÇOS === */}
          <section ref={pricingRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20 bg-black/40 backdrop-blur-lg">
              {showPricingSection ? (
              <div className="max-w-6xl w-full relative animate-in slide-in-from-bottom-8 duration-700">
                  
                  <div className="text-center mb-12">
                      <div className="inline-block mb-4">
                          <span className="bg-white/5 text-white border border-white/20 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md">
                              <Sparkles size={14} /> Turma 2025 Confirmada
                          </span>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">INVESTIMENTO NA SUA APROVAÇÃO</h2>
                      <p className="text-zinc-400 max-w-xl mx-auto text-lg">Escolha como você quer jogar esse jogo: no modo difícil (sozinho) ou com as melhores armas.</p>
                      
                      <div className="flex items-center justify-center gap-4 mt-10">
                          <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500'}`}>Mensal</span>
                          <button 
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                            className="w-16 h-8 bg-zinc-900 rounded-full relative p-1 transition-colors border border-white/20 cursor-pointer"
                          >
                              <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'}`} />
                          </button>
                          <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500'}`}>
                              Anual <span className="text-emerald-400 text-[10px] ml-1 uppercase border border-emerald-500/30 px-1 rounded bg-emerald-500/10">(2 meses grátis)</span>
                          </span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
                      
                      {/* PLANO BÁSICO - Escuro e Discreto */}
                      <div 
                        onClick={() => setSelectedPlan('basic')}
                        className={`bg-black/40 border p-8 rounded-3xl relative transition-all cursor-pointer group backdrop-blur-md ${selectedPlan === 'basic' ? 'border-zinc-500 opacity-100 scale-95' : 'border-white/5 hover:border-zinc-700 opacity-60 hover:opacity-80 scale-95'}`}
                      >
                          <div className="flex justify-between items-start">
                              <div>
                                  <h3 className="text-xl font-bold text-zinc-400">Modo Sobrevivência</h3>
                                  <p className="text-zinc-600 text-xs mb-6">Apenas o conteúdo bruto.</p>
                              </div>
                          </div>
                          
                          {getPriceDisplay('basic')}

                          <ul className="space-y-4 mb-8 text-zinc-400 text-sm">
                              <li className="flex gap-2"><CheckCircle size={16} className="text-zinc-600" /> Acesso às Aulas Gravadas</li>
                              <li className="flex gap-2"><CheckCircle size={16} className="text-zinc-600" /> Banco de Questões</li>
                              <li className="flex gap-2 text-zinc-700 line-through decoration-zinc-700"><X size={16} /> Sem NeuroTutor IA</li>
                              <li className="flex gap-2 text-zinc-700 line-through decoration-zinc-700"><X size={16} /> Sem Redação IA</li>
                              <li className="flex gap-2 text-zinc-700 line-through decoration-zinc-700"><X size={16} /> Sem Simulados Exclusivos</li>
                          </ul>

                          {selectedPlan === 'basic' && (
                              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                  <button onClick={() => handleCheckout('basic', 'pix')} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border border-white/5"><QrCode size={16}/> PIX</button>
                                  <button onClick={() => handleCheckout('basic', 'card')} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border border-white/5"><CreditCard size={16}/> Cartão</button>
                              </div>
                          )}
                      </div>

                      {/* PLANO AVANÇADO - Branco/Preto Alto Contraste */}
                      <div 
                        onClick={() => setSelectedPlan('advanced')}
                        className={`bg-black/80 border p-8 rounded-3xl relative transition-all cursor-pointer transform hover:-translate-y-2 shadow-2xl backdrop-blur-xl ${selectedPlan === 'advanced' ? 'border-white shadow-[0_0_50px_rgba(255,255,255,0.1)] ring-1 ring-white/50 scale-105 z-10' : 'border-zinc-700 opacity-90'}`}
                      >
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 whitespace-nowrap border border-zinc-200">
                              <Star size={12} className="fill-black" /> Recomendado por 94%
                          </div>

                          <h3 className="text-2xl font-black text-white flex items-center gap-2 mt-2">
                              <Trophy size={24} className="text-white fill-white/20" /> MODO APROVAÇÃO
                          </h3>
                          <p className="text-zinc-300 text-xs mb-6 font-bold uppercase tracking-wide">Ecossistema Completo</p>
                          
                          {getPriceDisplay('advanced')}

                          <ul className="space-y-3 mb-8 text-white text-sm font-medium">
                              <li className="flex gap-2 items-center"><CheckCircle size={18} className="text-white fill-white/20" /> Tudo do Básico</li>
                              <li className="flex gap-2 items-center"><BrainCircuit size={18} className="text-white fill-white/20" /> NeuroTutor IA (Tire dúvidas 24h)</li>
                              <li className="flex gap-2 items-center"><CheckCircle size={18} className="text-white fill-white/20" /> Correção de Redação Instantânea</li>
                              {/* NEW ITEMS */}
                              <li className="flex gap-2 items-center"><Trophy size={18} className="text-white fill-white/20" /> Sistema de Gamificação com XP</li>
                              <li className="flex gap-2 items-center"><Swords size={18} className="text-white fill-white/20" /> Ranking Competitivo com Alunos</li>
                              
                              <li className="flex gap-2 items-center"><Shield size={18} className="text-white fill-white/20" /> Acesso à Comunidade VIP</li>
                          </ul>

                          {selectedPlan === 'advanced' && (
                              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                  <button onClick={() => handleCheckout('advanced', 'pix')} className="bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"><QrCode size={18}/> PIX</button>
                                  <button onClick={() => handleCheckout('advanced', 'card')} className="bg-white hover:bg-zinc-200 text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><CreditCard size={18}/> Cartão</button>
                              </div>
                          )}
                          
                          <div className="mt-4 text-center">
                              <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                                  <Shield size={10} /> Garantia incondicional de 7 dias.
                              </p>
                          </div>
                      </div>
                  </div>
                  
                  {/* Removed "Já tenho conta" section as requested */}
              </div>
              ) : (
                  <div className="h-64 flex flex-col items-center justify-center">
                      <p className="text-zinc-500 animate-pulse text-sm">Assista ao vídeo para desbloquear as ofertas...</p>
                  </div>
              )}
          </section>

      </div>

      {/* --- MODAL PIX --- */}
      {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in p-4">
              <div className="bg-zinc-900 border border-white/20 p-8 rounded-3xl max-w-md w-full text-center relative shadow-2xl">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">Pagamento via PIX</h3>
                  <p className="text-zinc-400 text-sm mb-6">Escaneie para liberar seu acesso imediatamente.</p>
                  
                  <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48 mix-blend-multiply" />
                  </div>
                  
                  <div className="flex gap-2 mb-6">
                      <input readOnly value={pixPayload || ''} className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 text-xs text-zinc-400 truncate" />
                      <button onClick={() => navigator.clipboard.writeText(pixPayload || '')} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white"><Copy size={18}/></button>
                  </div>

                  <p className="text-emerald-400 font-bold text-2xl mb-6">R$ {pixAmount.toFixed(2)}</p>
                  
                  <button onClick={onStartGame} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                      <Check size={20} /> Já realizei o pagamento
                  </button>
              </div>
          </div>
      )}

    </div>
  );
};

export default LandingPage;
