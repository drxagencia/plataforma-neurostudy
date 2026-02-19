
import React, { useEffect, useState, useRef } from 'react';
// Added Crown to lucide-react imports
import { Rocket, Star, Zap, Shield, CheckCircle, Skull, Play, Lock, AlertTriangle, ChevronDown, Trophy, Timer, Swords, BrainCircuit, ArrowRight, MousePointerClick, CreditCard, QrCode, X, Check, Copy, User, Mail, Smartphone, Eye, Sparkles, Crosshair, Loader2, PenTool, Crown } from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { TrafficConfig, Lead } from '../types';
import { KIRVANO_LINKS } from '../constants';

interface LandingPageProps {
  onStartGame: () => void;
}

// --- STARRY BACKGROUND COMPONENT ---
const StarryBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        
        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        // Stars Setup
        const stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.3 + 0.1, // Velocidade base lenta
            opacity: Math.random() * 0.7 + 0.3
        }));

        let scrollVelocity = 0;
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const delta = Math.abs(currentScrollY - lastScrollY);
            // Aumenta a velocidade baseado na intensidade do scroll
            scrollVelocity = Math.min(delta * 0.3, 20); 
            lastScrollY = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll);

        let animationFrame: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            
            // Fundo Gradiente Estilizado (Céu Noturno Profundo)
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#000000'); // Pure Black top
            gradient.addColorStop(1, '#050505'); // Almost Black bottom
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            // Decaimento da velocidade do scroll (volta ao normal suavemente)
            scrollVelocity *= 0.92;
            if(scrollVelocity < 0.01) scrollVelocity = 0;
            
            stars.forEach(star => {
                // Movimento: Para cima (Y diminui)
                // Velocidade efetiva = base + fator de scroll
                const effectiveSpeed = star.speed + (scrollVelocity * star.speed * 2);
                star.y -= effectiveSpeed;

                // Reset quando sai da tela (loop infinito)
                if (star.y < 0) {
                    star.y = height;
                    star.x = Math.random() * width;
                }

                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.beginPath();
                
                // Efeito Warp: Estica a estrela quando rápido
                if (scrollVelocity > 0.5) {
                    const length = Math.min(star.size + (scrollVelocity * 3), 40);
                    // Desenha um traço vertical
                    ctx.rect(star.x, star.y, star.size, length);
                } else {
                    // Desenha círculo normal
                    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                }
                
                ctx.fill();
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="fixed inset-0 z-0 pointer-events-none"
        />
    );
};

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
            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/10 shadow-inner relative group cursor-not-allowed">
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
  const heroRef = useRef<HTMLDivElement>(null);
  const enemiesRef = useRef<HTMLDivElement>(null);
  const vslRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const [showEarlyOffer, setShowEarlyOffer] = useState(false);
  const [showFinalOffer, setShowFinalOffer] = useState(false);
  const [showPricingSection, setShowPricingSection] = useState(false);
  const [deadEnemies, setDeadEnemies] = useState<number[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixAmount, setPixAmount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced'>('advanced');
  const [config, setConfig] = useState<TrafficConfig>({ vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' });

  const [checkoutForm, setCheckoutForm] = useState({ fullName: '', email: '', password: '', payerName: '' });
  const [pixCooldown, setPixCooldown] = useState(0);
  const [hasClickedOnce, setHasClickedOnce] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    DatabaseService.getTrafficSettings().then(setConfig);
  }, []);

  useEffect(() => {
      let timer: any;
      if (pixCooldown > 0) {
          timer = setInterval(() => { setPixCooldown(prev => prev - 1); }, 1000);
      } else if (pixCooldown === 0 && hasClickedOnce) {
          // Quando o contador chega a 0 e já foi clicado, exibe mensagem para tentar de novo
          setSubmitError("Confirmação pendente. Tente novamente.");
      }
      return () => clearInterval(timer);
  }, [pixCooldown, hasClickedOnce]);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRevealOffer = () => {
      setShowPricingSection(true);
      setTimeout(() => { scrollToSection(pricingRef); }, 100);
  };

  const handleKillEnemy = (index: number) => {
      if (deadEnemies.includes(index)) return;
      setDeadEnemies(prev => [...prev, index]);
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleCheckout = (plan: 'basic' | 'advanced', method: 'pix' | 'card') => {
      if (billingCycle === 'monthly') {
          const link = plan === 'basic' ? KIRVANO_LINKS.plan_basic : KIRVANO_LINKS.plan_advanced;
          window.open(link, '_blank');
          return;
      }

      if (method === 'card') {
          const link = plan === 'basic' ? KIRVANO_LINKS.plan_basic : KIRVANO_LINKS.plan_advanced;
          window.open(link, '_blank');
      } else {
          const price = plan === 'basic' ? 94.00 : 197.00;
          try {
              const payload = PixService.generatePayload(price);
              setPixPayload(payload);
              setPixAmount(price);
              setCheckoutForm({ fullName: '', email: '', password: '', payerName: '' });
              setHasClickedOnce(false);
              setPixCooldown(0);
              setSubmitError(null);
              setShowPixModal(true);
          } catch (e) { alert("Erro ao gerar PIX"); }
      }
  };

  const handleConfirmPix = async () => {
      if (!checkoutForm.fullName.trim() || !checkoutForm.email.trim() || !checkoutForm.password.trim() || !checkoutForm.payerName.trim()) {
          setSubmitError("Preencha todos os dados.");
          return;
      }
      
      // Lógica de "Fake Loading" para validação bancária (5 segundos)
      if (!hasClickedOnce) {
          setHasClickedOnce(true);
          setPixCooldown(5); // Reduzido de 15s para 5s conforme solicitado
          setSubmitError(null); // Limpa erro anterior para mostrar o contador
          return;
      }
      
      // Se estiver no cooldown, não faz nada
      if (pixCooldown > 0) return;

      setSubmitError(null);
      try {
          await DatabaseService.createLead({
              name: checkoutForm.fullName,
              contact: checkoutForm.email,
              planId: selectedPlan === 'basic' ? 'Basic' : 'Advanced',
              amount: pixAmount,
              billing: billingCycle,
              paymentMethod: 'pix',
              pixIdentifier: checkoutForm.payerName,
              status: 'pending_pix',
              password: checkoutForm.password,
              payerName: checkoutForm.payerName,
              timestamp: new Date().toISOString()
          });
          setSubmitSuccess(true);
          setTimeout(() => { setShowPixModal(false); setSubmitSuccess(false); setHasClickedOnce(false); }, 4000);
      } catch (e) { setSubmitError("Erro ao enviar confirmação."); }
  };

  const getPriceDisplay = (plan: 'basic' | 'advanced') => {
      if (billingCycle === 'monthly') {
          const val = plan === 'basic' ? '9,90' : '19,90';
          return (
              <div className="mb-6 opacity-90">
                  <span className="text-3xl md:text-4xl font-black text-white">R$ {val}</span>
                  <span className="text-slate-500 text-sm font-bold ml-1">/mês</span>
              </div>
          );
      } else {
          const total = plan === 'basic' ? 94.00 : 197.00;
          const monthlyEq = (total / 12).toFixed(2).replace('.', ',');
          return (
              <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                      <span className="text-5xl md:text-6xl font-black text-white tracking-tighter">R$ {monthlyEq}</span>
                      <span className="text-slate-400 text-sm font-bold">/mês</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-black mt-2 bg-emerald-900/10 inline-block px-3 py-1 rounded-lg border border-emerald-500/10 uppercase tracking-widest">
                      R$ {total.toFixed(2).replace('.', ',')} total (Anual)
                  </p>
              </div>
          );
      }
  };

  return (
    <div className="min-h-screen w-full bg-[#000] text-slate-200 font-sans overflow-y-auto overflow-x-hidden relative selection:bg-indigo-500/30 selection:text-white scroll-smooth">
      <style>{`
        @keyframes muzzleFlash { 0% { background-color: rgba(255, 255, 255, 0.8); } 100% { background-color: transparent; } }
        @keyframes enemyDeath { 0% { transform: scale(1); filter: brightness(2); } 100% { transform: scale(0.8) translateY(20px); opacity: 0; } }
        .animate-shot { animation: enemyDeath 0.4s forwards; }
      `}</style>

      {/* STARRY BACKGROUND CANVAS */}
      <StarryBackground />

      {/* Overlay Decor (Nebula Globs) - Reduced opacity for subtle dark theme */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 mix-blend-screen">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/20 blur-[150px] rounded-full animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[150px] rounded-full animate-pulse-slow delay-1000" />
      </div>

      <div className="relative z-10">
          {/* HERO SECTION */}
          <section ref={heroRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-4 py-24 md:py-20 animate-in fade-in duration-1000">
              <div className="text-center space-y-8 max-w-5xl z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-indigo-300 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] backdrop-blur-md animate-in slide-in-from-top-4 duration-700">
                      <Sparkles size={12} /> Sistema NeuroAI Ativado
                  </div>
                  <h1 className="text-5xl md:text-[8rem] font-black tracking-tighter text-white uppercase leading-[0.9] drop-shadow-2xl animate-in zoom-in-95 duration-700 delay-100">
                      APROVAÇÃO<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-slate-200 to-purple-400">HACKEADA</span>
                  </h1>
                  <p className="text-lg md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light animate-in slide-in-from-bottom-4 duration-700 delay-200">
                      Você está a um passo do sistema que utiliza <strong className="text-slate-100">Inteligência Artificial</strong> e gamificação para garantir sua vaga na Federal.
                  </p>
                  <div className="pt-8 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                      <button onClick={() => scrollToSection(enemiesRef)} className="group relative px-12 py-5 md:px-16 md:py-6 bg-white text-black transition-all hover:scale-105 hover:bg-slate-200 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                          <div className="relative flex items-center gap-3 text-lg md:text-2xl font-black tracking-[0.1em] uppercase italic">
                              <Play size={20} className="fill-black" /> PRESS START
                          </div>
                      </button>
                  </div>
              </div>
          </section>

          {/* PROBLEM KILLER SECTION */}
          <section ref={enemiesRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-4 py-24 bg-black/30 backdrop-blur-sm cursor-crosshair border-y border-white/5">
              <div className="max-w-6xl mx-auto w-full">
                  <div className="text-center mb-16 animate-in slide-in-from-bottom-10 duration-700">
                      <h2 className="text-4xl md:text-7xl font-black text-white mb-4 uppercase italic tracking-tighter">Elimine os Obstáculos</h2>
                      <p className="text-slate-500 text-sm md:text-lg uppercase tracking-widest font-bold">Clique nos alvos para limpar seu caminho</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16">
                      {[
                        { title: 'Procrastinação', desc: 'A NeuroAI organiza seu dia.', color: 'border-white/10 hover:border-red-500/40' },
                        { title: 'Ansiedade', desc: 'Simulados que dão confiança.', color: 'border-white/10 hover:border-amber-500/40' },
                        { title: 'Confusão', desc: 'O Mentor tira todas as dúvidas.', color: 'border-white/10 hover:border-indigo-500/40' }
                      ].map((e, i) => (
                          <div key={i} onClick={() => handleKillEnemy(i)} className={`group relative bg-black/40 border ${e.color} p-8 md:p-12 rounded-[2rem] transition-all duration-300 hover:scale-[1.02] active:scale-95 backdrop-blur-md ${deadEnemies.includes(i) ? 'animate-shot pointer-events-none brightness-50' : 'shadow-lg hover:shadow-2xl'}`}>
                              <div className="absolute top-4 right-4"><Crosshair size={20} className="text-slate-600 group-hover:text-white transition-colors" /></div>
                              <h3 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase italic">{e.title}</h3>
                              <p className="text-slate-400 text-sm">{e.desc}</p>
                              {deadEnemies.includes(i) && <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-[2rem] animate-in zoom-in"><Check size={64} className="text-emerald-500" /></div>}
                          </div>
                      ))}
                  </div>
                  <button onClick={() => scrollToSection(vslRef)} className="w-full md:w-auto px-10 py-5 bg-indigo-600/90 text-white font-black text-lg md:text-xl rounded-2xl flex items-center justify-center gap-4 mx-auto hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 hover:scale-105">ASSISTIR ARMA SECRETA <ArrowRight/></button>
              </div>
          </section>

          {/* VSL SECTION */}
          <section ref={vslRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-4 py-24">
              <div className="max-w-5xl w-full">
                  <div className="bg-black/40 rounded-[2rem] md:rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative backdrop-blur-xl animate-in zoom-in-95 duration-1000">
                      <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 pointer-events-none group-hover:text-slate-700 transition-colors">
                              <Play size={80} strokeWidth={1} />
                              <p className="font-black uppercase tracking-[0.5em] mt-4 text-xs md:text-base">Vídeo Exclusivo</p>
                          </div>
                          <video src="/video.mp4" className="w-full h-full object-cover relative z-10" controls poster="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000" />
                      </div>
                      <div className="p-6 md:p-10 bg-black/60 border-t border-white/5">
                          <FakeProgressBar onHalfTime={() => setShowEarlyOffer(true)} onFinish={() => setShowFinalOffer(true)} />
                      </div>
                  </div>
                  <div className="mt-12 text-center h-24">
                      {(showFinalOffer || showEarlyOffer) && (
                          <button onClick={handleRevealOffer} className="w-full md:w-auto px-10 py-6 md:px-20 md:py-8 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xl md:text-3xl rounded-[2rem] shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-in slide-in-from-bottom-4 flex items-center justify-center gap-4 mx-auto uppercase italic tracking-tighter hover:scale-105 transition-transform">
                             <Rocket size={28}/> Revelar Oferta VIP
                          </button>
                      )}
                  </div>
              </div>
          </section>

          {/* PRICING SECTION */}
          <section ref={pricingRef} className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-24 relative overflow-hidden bg-black/20 backdrop-blur-sm">
              {showPricingSection && (
                  <div className="max-w-5xl w-full animate-in slide-in-from-bottom-12 duration-700">
                      <div className="text-center mb-16">
                          <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter text-white">Escolha sua Patente</h2>
                          
                          <div className="flex items-center justify-center gap-6 mt-10">
                              <span className={`text-xs md:text-sm font-black uppercase tracking-widest transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-600'}`}>Mensal</span>
                              <button onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} className="w-16 h-8 md:w-20 md:h-10 bg-slate-800 rounded-full relative p-1 transition-all border border-white/10">
                                  <div className={`w-6 h-6 md:w-8 md:h-8 bg-white rounded-full transition-all shadow-lg ${billingCycle === 'yearly' ? 'translate-x-8 md:translate-x-10' : ''}`} />
                              </button>
                              <div className="flex flex-col items-start">
                                  <span className={`text-xs md:text-sm font-black uppercase tracking-widest transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-600'}`}>Anual</span>
                                  <span className="text-[9px] text-emerald-400 font-black bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20">-20% OFF</span>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                          {['basic', 'advanced'].map(p => (
                              <div key={p} onClick={() => setSelectedPlan(p as any)} className={`relative p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border transition-all duration-500 cursor-pointer flex flex-col backdrop-blur-xl ${selectedPlan === p ? 'border-indigo-500/50 bg-indigo-900/10 scale-[1.02] shadow-2xl' : 'border-white/5 bg-black/40 opacity-60 hover:opacity-100 hover:border-white/10'}`}>
                                  {p === 'advanced' && <div className="absolute top-0 right-8 md:right-12 -translate-y-1/2 bg-indigo-600 text-white text-[9px] md:text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg animate-pulse-slow">Recomendado</div>}
                                  
                                  <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-8 flex items-center gap-3 text-white">
                                      {p === 'basic' ? <Skull size={24} className="text-slate-500" /> : <Crown size={24} className="text-indigo-400" />}
                                      {p === 'basic' ? 'Patente Soldado' : 'Patente Elite'}
                                  </h3>
                                  
                                  {getPriceDisplay(p as any)}

                                  <ul className="space-y-4 mb-12 flex-1">
                                      <li className="flex gap-3 text-sm font-medium text-slate-300"><CheckCircle size={18} className="text-emerald-500 shrink-0"/> Grade de Aulas Completa</li>
                                      <li className="flex gap-3 text-sm font-medium text-slate-300"><CheckCircle size={18} className="text-emerald-500 shrink-0"/> Banco de 5.000+ Questões</li>
                                      {p === 'advanced' && (
                                          <>
                                            <li className="flex gap-3 text-sm font-black text-white"><BrainCircuit size={18} className="text-indigo-400 shrink-0"/> NeuroTutor IA Ilimitado</li>
                                            <li className="flex gap-3 text-sm font-black text-white"><PenTool size={18} className="text-indigo-400 shrink-0"/> Corretor de Redação via Foto</li>
                                            <li className="flex gap-3 text-sm font-black text-white"><Trophy size={18} className="text-indigo-400 shrink-0"/> Ranking Competitivo VIP</li>
                                          </>
                                      )}
                                  </ul>

                                  {selectedPlan === p && (
                                      <div className="space-y-4 animate-in fade-in zoom-in-95">
                                          <button onClick={() => handleCheckout(p as any, 'pix')} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 hover:scale-[1.02]">
                                              <QrCode size={20}/> Pagar via PIX
                                          </button>
                                          <button onClick={() => handleCheckout(p as any, 'card')} className="w-full bg-white text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3 hover:scale-[1.02]">
                                              <CreditCard size={20}/> Pagar via Cartão
                                          </button>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </section>
      </div>

      {/* PIX MODAL (SÓ PARA ANUAL) */}
      {showPixModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-slate-900/80 border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] max-w-4xl w-full flex flex-col md:flex-row gap-8 md:gap-12 relative shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-6 right-6 md:top-8 md:right-8 text-slate-500 hover:text-white transition-colors"><X size={28}/></button>
                  
                  {submitSuccess ? (
                      <div className="w-full py-20 text-center animate-in zoom-in-50">
                          <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_60px_rgba(16,185,129,0.3)] animate-bounce">
                              <Check size={64} className="text-white"/>
                          </div>
                          <h3 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 text-white">Solicitado!</h3>
                          <p className="text-slate-400 text-lg font-light">Validando seu acesso. Verifique seu e-mail em instantes.</p>
                      </div>
                  ) : (
                      <>
                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white">Inscrição de Elite</h3>
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Preencha seus dados para liberação</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome Completo</label><input className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 md:p-5 text-sm outline-none focus:border-indigo-500 transition-all text-white" placeholder="Como no seu RG" value={checkoutForm.fullName} onChange={e => setCheckoutForm({...checkoutForm, fullName: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Seu Melhor E-mail</label><input className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 md:p-5 text-sm outline-none focus:border-indigo-500 transition-all text-white" placeholder="Onde receberá o acesso" value={checkoutForm.email} onChange={e => setCheckoutForm({...checkoutForm, email: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Crie sua Senha</label><input className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 md:p-5 text-sm outline-none focus:border-indigo-500 transition-all text-white" type="password" placeholder="Mínimo 6 caracteres" value={checkoutForm.password} onChange={e => setCheckoutForm({...checkoutForm, password: e.target.value})} /></div>
                                <div className="p-6 bg-emerald-900/10 border border-emerald-500/20 rounded-[2rem]">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Conferência de Pagamento</label>
                                    <input className="w-full bg-black/50 border-none rounded-xl p-4 text-xs font-bold text-white outline-none" placeholder="Nome impresso no comprovante" value={checkoutForm.payerName} onChange={e => setCheckoutForm({...checkoutForm, payerName: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center bg-black/20 rounded-[3rem] p-8 md:p-10 border border-white/5 shadow-inner backdrop-blur-md">
                            <p className="text-emerald-400 font-black text-4xl md:text-5xl mb-8 italic tracking-tighter">R$ {pixAmount.toFixed(2)}</p>
                            <div className="bg-white p-5 rounded-[2rem] mb-8 shadow-2xl relative group">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48 mix-blend-multiply" />
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem]"><Eye size={32} className="text-zinc-500" /></div>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(pixPayload || ''); alert("Código copiado!"); }} className="text-slate-400 text-xs uppercase font-black hover:text-white mb-8 flex items-center gap-3 transition-colors bg-white/5 border border-white/5 px-6 py-3 rounded-full hover:bg-white/10"><Copy size={14}/> Copiar Código Pix</button>
                            
                            {/* --- ERROR & COUNTDOWN DISPLAY --- */}
                            <div className="h-6 mb-4 flex items-center justify-center">
                                {pixCooldown > 0 ? (
                                    <p className="text-yellow-400 text-xs font-black uppercase tracking-wider animate-pulse flex items-center gap-2">
                                        <Loader2 size={12} className="animate-spin"/> Validando transação... {pixCooldown}s
                                    </p>
                                ) : submitError ? (
                                    <p className="text-red-400 text-xs font-black uppercase tracking-wider animate-shake">
                                        {submitError}
                                    </p>
                                ) : null}
                            </div>
                            
                            <button 
                                onClick={handleConfirmPix} 
                                disabled={pixCooldown > 0}
                                className={`w-full py-6 md:py-7 rounded-3xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] italic ${pixCooldown > 0 ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105'}`}
                            >
                                {pixCooldown > 0 ? 'AGUARDE...' : <><CheckCircle size={22}/> JÁ FIZ O PAGAMENTO</>}
                            </button>
                            <p className="text-[10px] text-slate-600 font-bold mt-4 uppercase text-center">Liberação instantânea após conferência automática</p>
                        </div>
                      </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default LandingPage;
