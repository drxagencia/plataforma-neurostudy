
import React, { useEffect, useState } from 'react';
import { 
  Zap, Brain, CheckCircle2, PlayCircle, 
  Sword, Crown, Sparkles, Check, X, Timer, CreditCard, Gift,
  Copy, Crosshair, ArrowDown, Clock, AlertTriangle, QrCode, Play, ChevronDown, Unlock,
  PenTool, Users, ShieldCheck, Loader2, Rocket
} from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { PixelService } from '../services/pixelService'; // NEW IMPORT

interface LandingPageProps {
  onStartGame: () => void;
}

// KIRVANO LINKS (Placeholders)
const KIRVANO_LINKS = {
    basic_monthly: "https://kirvano.com/checkout/...",
    basic_yearly: "https://kirvano.com/checkout/...",
    pro_monthly: "https://kirvano.com/checkout/...",
    pro_yearly: "https://kirvano.com/checkout/..."
};

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  const [timeLeft, setTimeLeft] = useState(4 * 60 * 60 + 59 * 60); 
  
  // INTERACTIVE STAGES
  const [activeEnemy, setActiveEnemy] = useState<string | null>(null);
  const [defeatedEnemies, setDefeatedEnemies] = useState<string[]>([]);
  
  // VSL / VIDEO STATE
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [offerUnlocked, setOfferUnlocked] = useState(false);

  // CHECKOUT STATE
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced' | null>(null);
  
  // CHECKOUT FLOW
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  
  // PAYMENT VERIFICATION LOGIC (ANTI-FRAUD FRICTION)
  const [paymentCheckAttempt, setPaymentCheckAttempt] = useState(0);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  
  // SUCCESS / THANK YOU PAGE
  const [showThankYou, setShowThankYou] = useState(false);
  
  // DATA COLLECTION
  const [studentName, setStudentName] = useState('');
  const [pixIdentifier, setPixIdentifier] = useState(''); 
  const [contactInfo, setContactInfo] = useState(''); 
  
  const [loading, setLoading] = useState(false);

  // Initialize Pixel PageView
  useEffect(() => {
      PixelService.trackPageView();
  }, []);

  // Timer (Optimized: Updates only once per second, acceptable)
  useEffect(() => {
      const interval = setInterval(() => {
          setTimeLeft(prev => (prev > 0 ? prev - 1 : 4 * 60 * 60)); 
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  // Video Completion Logic (CSS Driven now, this just handles the final trigger)
  useEffect(() => {
      let timer: any;
      if (isVideoPlaying) {
          // Mock video length: 8 seconds for demo
          const VIDEO_DURATION = 8000; 
          timer = setTimeout(() => {
              setVideoCompleted(true);
              setIsVideoPlaying(false);
          }, VIDEO_DURATION);
      }
      return () => clearTimeout(timer);
  }, [isVideoPlaying]);

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scrollToSection = (id: string) => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- INTERACTION LOGIC ---
  const handleEnemyClick = (enemy: string) => {
      if (defeatedEnemies.includes(enemy)) return;
      setActiveEnemy(enemy);
      // FASTER ANIMATION (600ms)
      setTimeout(() => {
          setDefeatedEnemies(prev => [...prev, enemy]);
          setActiveEnemy(null);
      }, 600); 
  };

  const handleRevealOffer = () => {
      // TRACK PIXEL: ViewContent (Offer Revealed)
      PixelService.trackViewContent('NeuroStudy Offers', ['basic_plan', 'pro_plan']);
      
      setOfferUnlocked(true);
      setTimeout(() => scrollToSection('pricing'), 100);
  };

  // --- CHECKOUT LOGIC ---
  const handleOpenCheckout = (plan: 'basic' | 'advanced') => {
      setSelectedPlan(plan);
      setShowCheckout(true);
      setCheckoutStep(1);
      setPaymentMethod(null);
      setPixPayload(null);
      setPaymentCheckAttempt(0); // Reset verification attempts
  };

  const handleMethodSelect = (method: 'pix' | 'card') => {
      setPaymentMethod(method);
      
      // Calculate Price for Pixel Tracking
      let amount = 0;
      if (selectedPlan === 'basic') amount = billingCycle === 'monthly' ? 9.90 : 97.00;
      else amount = billingCycle === 'monthly' ? 19.90 : 197.00;

      // TRACK PIXEL: InitiateCheckout
      PixelService.trackInitiateCheckout(amount);

      if (method === 'card') {
          let link = '';
          if (selectedPlan === 'basic') link = billingCycle === 'monthly' ? KIRVANO_LINKS.basic_monthly : KIRVANO_LINKS.basic_yearly;
          else link = billingCycle === 'monthly' ? KIRVANO_LINKS.pro_monthly : KIRVANO_LINKS.pro_yearly;
          window.open(link, '_blank');
          return;
      }
      if (method === 'pix') {
          const payload = PixService.generatePayload(amount);
          setPixPayload(payload);
          setCheckoutStep(2);
      }
  };

  const handlePixPaid = () => {
    setIsVerifyingPayment(true);

    // Simulate Network Request
    setTimeout(() => {
        setIsVerifyingPayment(false);

        if (paymentCheckAttempt === 0) {
            // First attempt: Reject to ensure payment actually happened (Security Friction)
            alert("⚠️ PAGAMENTO NÃO IDENTIFICADO.\n\nO sistema bancário ainda não confirmou o recebimento. Se você acabou de pagar, aguarde cerca de 10 a 15 segundos e clique no botão novamente.");
            setPaymentCheckAttempt(1);
        } else {
            // Second attempt: Approve
            setCheckoutStep(3);
        }
    }, 2000);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!studentName || !pixIdentifier || !contactInfo || !selectedPlan) return;
      
      setLoading(true);
      
      let amount = 0;
      if (selectedPlan === 'basic') amount = billingCycle === 'monthly' ? 9.90 : 97.00;
      else amount = billingCycle === 'monthly' ? 19.90 : 197.00;

      try {
          await DatabaseService.createLead({
              name: studentName,
              contact: contactInfo,
              planId: selectedPlan === 'advanced' ? (billingCycle === 'monthly' ? 'PRO_MONTHLY' : 'PRO_YEARLY') : (billingCycle === 'monthly' ? 'BASIC_MONTHLY' : 'BASIC_YEARLY'),
              amount: amount,
              billing: billingCycle,
              paymentMethod: 'pix',
              pixIdentifier: pixIdentifier,
              timestamp: new Date().toISOString()
          });
          
          // TRACK PIXEL: Purchase (Internal PIX Only)
          PixelService.trackPurchase(amount);

          // Close modal and Show Thank You Page
          setShowCheckout(false);
          setShowThankYou(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (error) {
          alert("Erro ao salvar. Tente novamente.");
      } finally {
          setLoading(false);
      }
  };

  // --- THANK YOU PAGE RENDER ---
  if (showThankYou) {
      return (
          <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
              {/* Background FX */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
                  <div className="star-layer stars-1"></div>
              </div>

              <div className="max-w-2xl w-full text-center relative z-10 animate-in zoom-in-95 duration-700">
                  <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(16,185,129,0.4)] animate-bounce">
                      <ShieldCheck size={64} className="text-white" />
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                      COMPRA <span className="text-emerald-400">CONFIRMADA!</span>
                  </h1>
                  
                  <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8">
                      <p className="text-xl text-slate-300 mb-6">
                          Parabéns, <strong className="text-white">{studentName}</strong>! Você acaba de dar o passo mais importante para sua aprovação.
                      </p>
                      
                      <div className="space-y-4 text-left bg-black/20 p-6 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                              <CheckCircle2 className="text-emerald-500" size={20} />
                              <span className="text-slate-300">Acesso liberado no sistema.</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <CheckCircle2 className="text-emerald-500" size={20} />
                              <span className="text-slate-300">Credenciais enviadas para: <strong className="text-white">{contactInfo}</strong></span>
                          </div>
                          <div className="flex items-center gap-3">
                              <CheckCircle2 className="text-emerald-500" size={20} />
                              <span className="text-slate-300">Bônus e Materiais desbloqueados.</span>
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={onStartGame}
                    className="group relative px-10 py-5 bg-white text-indigo-950 font-black text-lg md:text-xl rounded-full shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"
                  >
                      <Rocket size={24} className="text-indigo-600 group-hover:animate-ping" />
                      ACESSAR PLATAFORMA AGORA
                  </button>
                  
                  <p className="mt-6 text-slate-500 text-sm">
                      Dúvidas? Chame nosso suporte no WhatsApp.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#050b14] text-white font-sans overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* CUSTOM ANIMATIONS (Optimized) */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; will-change: transform; }
        .animate-shake { animation: shake 0.4s ease-in-out; will-change: transform; }
        .bg-grid-pattern {
            background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
            background-size: 30px 30px;
        }
      `}</style>

      {/* --- HUD --- */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050b14]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain size={24} className="text-emerald-500" />
            <span className="font-bold tracking-wider text-lg">Neuro<span className="text-emerald-400">Study</span></span>
          </div>
          <button onClick={onStartGame} className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-widest border border-transparent hover:border-white/10 px-3 py-1.5 rounded-lg transition-all">
            Login
          </button>
        </div>
      </div>

      {/* --- STAGE 1: HERO (ENTRY) --- */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 overflow-hidden pt-20 bg-grid-pattern">
        {/* Background Ambience */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] bg-emerald-500/10 rounded-full blur-[100px] opacity-50" />
        </div>

        <div className="text-center z-10 max-w-4xl w-full">
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm animate-fade-in-up">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] md:text-xs font-mono text-emerald-300 tracking-wide uppercase">System Online v2.4</span>
            </div>

            <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.1] animate-slide-up">
              GAME <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">OVER</span><br/>
              PARA O ESTUDO CHATO
            </h1>

            <p className="text-zinc-400 text-base md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up px-4">
              Transforme sua aprovação na missão principal. Uma plataforma gamificada feita para quem quer resultados reais.
            </p>

            <button 
              onClick={() => scrollToSection('stage-battle')}
              className="group relative px-8 py-4 md:px-10 md:py-5 bg-white text-black font-black text-base md:text-lg rounded-xl hover:scale-105 transition-transform flex items-center gap-3 mx-auto shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] animate-float"
            >
                PRESS START <PlayCircle size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
        </div>

        <div className="absolute bottom-8 animate-bounce text-zinc-600">
            <ArrowDown size={24} />
        </div>
      </section>

      {/* --- STAGE 2: CHOOSE YOUR ENEMY (INTERACTIVE) --- */}
      <section id="stage-battle" className="py-20 md:py-32 px-4 bg-[#080f1a] relative border-t border-white/5">
          <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-black mb-4">ESCOLHA SEU <span className="text-red-500">INIMIGO</span></h2>
              <p className="text-zinc-400 mb-12 text-sm md:text-base">Clique nos problemas para eliminá-los com o Método NeuroStudy.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                  {[
                      { id: 'procrastination', label: 'PROCRASTINAÇÃO', icon: Clock },
                      { id: 'anxiety', label: 'ANSIEDADE', icon: AlertTriangle },
                      { id: 'lost', label: 'ESTUDO PERDIDO', icon: Crosshair }
                  ].map(enemy => (
                      <div 
                        key={enemy.id}
                        onClick={() => handleEnemyClick(enemy.id)}
                        className={`relative h-56 md:h-64 rounded-3xl border-2 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-6 overflow-hidden group touch-manipulation ${
                            defeatedEnemies.includes(enemy.id) 
                            ? 'bg-emerald-900/20 border-emerald-500/50 scale-95' 
                            : activeEnemy === enemy.id 
                                ? 'bg-red-900/40 border-red-500 scale-105 animate-shake' 
                                : 'bg-slate-900/50 border-white/10 hover:border-red-500/50 hover:bg-slate-800'
                        }`}
                      >
                          {/* Normal State */}
                          <div className={`transition-opacity duration-200 ${defeatedEnemies.includes(enemy.id) || activeEnemy === enemy.id ? 'opacity-0' : 'opacity-100'}`}>
                              <enemy.icon size={48} className="text-slate-500 mb-4 mx-auto group-hover:text-red-400 transition-colors" />
                              <h3 className="text-xl font-black text-zinc-300 group-hover:text-white">{enemy.label}</h3>
                              <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Toque para atacar</p>
                          </div>

                          {/* Active Attack State */}
                          <div className={`absolute inset-0 flex items-center justify-center bg-red-500/20 transition-opacity duration-100 ${activeEnemy === enemy.id ? 'opacity-100' : 'opacity-0'}`}>
                              <Sword size={64} className="text-red-500 animate-pulse" />
                          </div>

                          {/* Defeated State */}
                          <div className={`absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 backdrop-blur-sm transition-all duration-300 ${defeatedEnemies.includes(enemy.id) ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-150'}`}>
                              <CheckCircle2 size={48} className="text-emerald-400 mb-2" />
                              <h3 className="text-lg font-bold text-white">ELIMINADO</h3>
                              <p className="text-xs text-emerald-300 font-mono mt-1 text-center px-4">
                                  {enemy.id === 'procrastination' ? '+ Gamificação Imersiva' : enemy.id === 'anxiety' ? '+ Tutor IA 24h' : '+ Metodologia Ágil'}
                              </p>
                          </div>
                      </div>
                  ))}
              </div>

              {/* SEE MORE BUTTON */}
              <div className="mt-16 animate-in slide-in-from-bottom-8 duration-700">
                  <button 
                    onClick={() => scrollToSection('video-section')}
                    className="flex flex-col items-center gap-2 mx-auto text-slate-400 hover:text-white transition-colors group"
                  >
                      <span className="text-xs md:text-sm font-bold uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Ver a Solução</span>
                      <ChevronDown size={24} className="animate-bounce text-emerald-500" />
                  </button>
              </div>
          </div>
      </section>

      {/* --- STAGE 3: THE VIDEO (VSL) --- */}
      <section id="video-section" className="py-24 md:py-32 px-4 relative bg-[#02050a] border-t border-white/5 overflow-hidden">
          {/* Background FX */}
          <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10 text-center">
              <div className="inline-block px-4 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6">
                  Vídeo Exclusivo
              </div>
              <h2 className="text-3xl md:text-6xl font-black mb-8 leading-tight">
                  DESCUBRA O <span className="text-indigo-500">SEGREDO</span> DOS<br className="hidden md:block"/>
                  ESTUDANTES DE ELITE
              </h2>

              {/* VIDEO CONTAINER */}
              <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-2xl md:rounded-3xl bg-black border border-slate-800 shadow-[0_0_40px_rgba(79,70,229,0.15)] overflow-hidden group">
                  {/* FAKE VIDEO PLACEHOLDER */}
                  {!isVideoPlaying && !videoCompleted ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-20">
                          <button 
                            onClick={() => setIsVideoPlaying(true)}
                            className="w-20 h-20 md:w-24 md:h-24 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                          >
                              <Play size={32} className="md:w-10 md:h-10 fill-white ml-1 text-white" />
                          </button>
                          <p className="mt-4 text-xs md:text-sm font-bold text-white uppercase tracking-widest animate-pulse">Toque para assistir</p>
                      </div>
                  ) : videoCompleted ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 animate-in fade-in duration-500 px-4 text-center">
                          <CheckCircle2 size={50} className="text-emerald-500 mb-4" />
                          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Vídeo Finalizado</h3>
                          <p className="text-slate-400 mb-6 text-sm">Você desbloqueou uma oportunidade única.</p>
                          <button 
                            onClick={handleRevealOffer}
                            className="px-8 py-3 bg-white text-black font-black rounded-full hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm md:text-base"
                          >
                              CONTINUAR <ArrowDown size={18} />
                          </button>
                      </div>
                  ) : null}

                  {/* FAKE CONTENT */}
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                      <div className="text-slate-700 font-black text-6xl md:text-9xl opacity-10 select-none">NEURO</div>
                  </div>

                  {/* FAKE PROGRESS BAR - CSS ANIMATED FOR PERFORMANCE */}
                  <div className="absolute bottom-0 left-0 w-full h-1.5 md:h-2 bg-slate-800">
                      <div 
                        className={`h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]`}
                        style={{ 
                            width: isVideoPlaying ? '100%' : '0%',
                            transition: isVideoPlaying ? 'width 8s linear' : 'none'
                        }}
                      />
                  </div>
              </div>

              {/* FAKE CONTROLS HINT */}
              {isVideoPlaying && (
                  <div className="mt-4 flex justify-between text-[10px] md:text-xs text-slate-500 font-mono px-2">
                      <span>PROCESSANDO CONTEÚDO...</span>
                      <span>AO VIVO</span>
                  </div>
              )}
          </div>
      </section>

      {/* --- LIGHTNING OFFER TRIGGER (APPEARS AFTER VIDEO) --- */}
      {videoCompleted && !offerUnlocked && (
          <section className="py-12 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-700">
              <div className="max-w-4xl mx-auto text-center relative z-10 px-6">
                  <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1 text-white text-[10px] md:text-xs font-bold uppercase mb-4 animate-pulse">
                      <Timer size={14} /> Oferta por tempo limitado
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                      OFERTA RELÂMPAGO <br/>DESBLOQUEADA
                  </h2>
                  <p className="text-indigo-100 text-base md:text-lg mb-8 max-w-2xl mx-auto">
                      Você assistiu à apresentação e provou que está comprometido. Liberamos uma condição especial exclusiva para você agora.
                  </p>
                  <button 
                    onClick={handleRevealOffer}
                    className="group relative w-full md:w-auto px-10 py-5 bg-white text-indigo-900 font-black text-lg md:text-xl rounded-full shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"
                  >
                      <Unlock size={24} className="text-indigo-600" />
                      QUERO VER A OFERTA
                  </button>
              </div>
              
              <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
          </section>
      )}

      {/* --- STAGE 4: THE ARMORY (OFFERS) - HIDDEN UNTIL UNLOCKED --- */}
      {offerUnlocked && (
      <section id="pricing" className="py-24 md:py-32 px-4 relative bg-[#050b14] border-t border-white/5 animate-in fade-in slide-in-from-bottom-20 duration-1000">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">OFERTAS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">EXCLUSIVAS</span></h2>
            
            {/* BILLING TOGGLE */}
            <div className="inline-flex bg-slate-900 p-1 rounded-2xl border border-white/10 relative">
                <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Mensal
                </button>
                <button 
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all relative z-10 ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Anual <span className="ml-1 bg-emerald-500 text-black text-[9px] md:text-[10px] px-1.5 py-0.5 rounded font-black">-20%</span>
                </button>
                
                {/* Sliding Background */}
                <div className={`absolute top-1 bottom-1 w-[50%] bg-white/10 rounded-xl transition-all duration-300 ${billingCycle === 'monthly' ? 'left-1' : 'left-[49%]'}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8 items-center max-w-4xl mx-auto">
            
            {/* BASIC CARD */}
            <div className="bg-[#0f1722] border border-white/5 rounded-3xl p-6 md:p-8 hover:border-white/20 transition-all group order-2 md:order-1">
                <h3 className="text-lg font-bold text-zinc-400 uppercase tracking-widest mb-4">Iniciante</h3>
                
                <div className="mb-6">
                    {billingCycle === 'yearly' ? (
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm text-zinc-500">12x de</span>
                                <span className="text-3xl md:text-4xl font-black text-white">R$ 8,08</span>
                            </div>
                            <p className="text-zinc-500 text-xs md:text-sm mt-1">Total à vista: R$ 97,00</p>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl md:text-4xl font-black text-white">R$ 9,90</span>
                            <span className="text-zinc-500 font-bold">/mês</span>
                        </div>
                    )}
                </div>

                <ul className="space-y-3 mb-8 text-sm text-zinc-400">
                    <li className="flex items-center"><Check size={16} className="mr-2 text-zinc-600"/> Acesso às Aulas</li>
                    <li className="flex items-center"><Check size={16} className="mr-2 text-zinc-600"/> Banco de Questões (Limitado)</li>
                    <li className="flex items-center opacity-50 line-through"><X size={16} className="mr-2"/> IA Tutor Pessoal</li>
                </ul>

                <button 
                    onClick={() => handleOpenCheckout('basic')}
                    className="w-full py-4 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-colors text-zinc-300 text-sm md:text-base"
                >
                    Selecionar Básico
                </button>
            </div>

            {/* PRO CARD (HERO) */}
            <div className="relative bg-[#0f1722]/80 backdrop-blur-xl border-2 border-indigo-500 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(79,70,229,0.15)] transform md:scale-110 scale-100 z-10 flex flex-col order-1 md:order-2 my-4 md:my-0">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-lg border-4 border-[#050b14]">
                  Mais Vendido
                </div>

                <h3 className="text-lg font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-2">
                    <Crown size={18} className="fill-current" /> Pro Player
                </h3>

                <div className="mb-6">
                    {billingCycle === 'yearly' ? (
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm text-indigo-300">12x de</span>
                                <span className="text-4xl md:text-5xl font-black text-white">R$ 16,41</span>
                            </div>
                            <p className="text-indigo-300/60 text-xs md:text-sm mt-1 font-bold">Total à vista: R$ 197,00 (Economia Real)</p>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl md:text-5xl font-black text-white">R$ 19,90</span>
                            <span className="text-indigo-300 font-bold">/mês</span>
                        </div>
                    )}
                </div>

                <div className="h-px w-full bg-indigo-500/20 mb-6" />

                <ul className="space-y-4 mb-8 flex-1 text-sm md:text-base">
                    <li className="flex items-center text-white font-bold"><CheckCircle2 size={18} className="text-emerald-400 mr-3 fill-emerald-900" /> Tudo do Básico</li>
                    <li className="flex items-center text-white"><Sparkles size={18} className="text-indigo-400 mr-3" /> IA Tutor Ilimitada (NeuroAI)</li>
                    <li className="flex items-center text-white"><PenTool size={18} className="text-indigo-400 mr-3" /> Correção de Redação Detalhada</li>
                    <li className="flex items-center text-white"><Users size={18} className="text-indigo-400 mr-3" /> Comunidade VIP</li>
                </ul>

                <button 
                    onClick={() => handleOpenCheckout('advanced')}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-5 rounded-xl shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center text-base md:text-lg gap-2 animate-pulse-glow"
                >
                    <Zap size={20} className="fill-white" /> DESBLOQUEAR AGORA
                </button>
            </div>

          </div>
          
          <div className="mt-12 flex justify-center">
             <div className="bg-red-900/10 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-2 text-red-300 text-xs font-mono font-bold animate-pulse">
                 <Timer size={14} /> OFERTA EXPIRA EM: {formatTime(timeLeft)}
             </div>
          </div>
        </div>
      </section>
      )}

      {/* --- CHECKOUT MODAL (RESPONSIVE) --- */}
      {showCheckout && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 p-0 md:p-4">
              <div className="bg-[#0f1722] w-full md:max-w-md rounded-t-3xl md:rounded-3xl border-t md:border border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] md:max-h-none animate-in slide-in-from-bottom-full duration-500">
                  <button onClick={() => setShowCheckout(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-20"><X size={20}/></button>
                  
                  {/* Step Header */}
                  <div className="bg-slate-900/50 p-6 border-b border-white/5 text-center">
                      <h3 className="text-xl font-bold text-white">
                          {checkoutStep === 1 ? 'Forma de Pagamento' : checkoutStep === 2 ? 'Pagamento PIX' : 'Dados de Acesso'}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">Passo {checkoutStep} de 3</p>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      
                      {/* STEP 1: CHOOSE METHOD */}
                      {checkoutStep === 1 && (
                          <div className="space-y-4">
                              <p className="text-sm text-zinc-400 mb-4 text-center">Como deseja pagar pelo plano <strong className="text-white uppercase">{selectedPlan === 'basic' ? 'Iniciante' : 'Pro Player'}</strong>?</p>
                              
                              <button 
                                onClick={() => handleMethodSelect('pix')}
                                className="w-full p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/10 hover:bg-emerald-900/20 transition-all flex items-center gap-4 group active:scale-95"
                              >
                                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                      <QrCode size={20} />
                                  </div>
                                  <div className="text-left">
                                      <span className="block font-bold text-white">PIX (Instantâneo)</span>
                                      <span className="text-xs text-emerald-400">Liberação imediata + Bônus</span>
                                  </div>
                              </button>

                              <button 
                                onClick={() => handleMethodSelect('card')}
                                className="w-full p-4 rounded-xl border border-indigo-500/30 bg-indigo-900/10 hover:bg-indigo-900/20 transition-all flex items-center gap-4 group active:scale-95"
                              >
                                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                      <CreditCard size={20} />
                                  </div>
                                  <div className="text-left">
                                      <span className="block font-bold text-white">Cartão de Crédito</span>
                                      <span className="text-xs text-indigo-400">Parcelamento disponível</span>
                                  </div>
                              </button>
                          </div>
                      )}

                      {/* STEP 2: PIX DISPLAY */}
                      {checkoutStep === 2 && pixPayload && (
                          <div className="text-center">
                              <div className="bg-white p-3 rounded-xl inline-block mb-4">
                                  <img 
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`} 
                                      className="w-40 h-40 mix-blend-multiply" 
                                  />
                              </div>
                              <div className="flex gap-2 mb-6">
                                  <input readOnly value={pixPayload} className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 text-xs text-zinc-500 font-mono truncate" />
                                  <button onClick={() => {navigator.clipboard.writeText(pixPayload); alert("Copiado!");}} className="p-2 bg-zinc-800 rounded-lg text-white"><Copy size={16}/></button>
                              </div>
                              <button 
                                onClick={handlePixPaid}
                                disabled={isVerifyingPayment}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all animate-pulse flex items-center justify-center gap-2"
                              >
                                  {isVerifyingPayment ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                  {isVerifyingPayment ? 'Verificando...' : 'JÁ REALIZEI O PAGAMENTO'}
                              </button>
                          </div>
                      )}

                      {/* STEP 3: IDENTIFICATION (DATA COLLECTION) */}
                      {checkoutStep === 3 && (
                          <form onSubmit={handleFinalSubmit} className="space-y-4">
                              <div className="bg-emerald-900/20 p-3 rounded-lg border border-emerald-500/20 mb-4 text-center">
                                  <p className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                                      <Gift size={14} /> Pagamento Detectado! Finalize o cadastro.
                                  </p>
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Quem pagou o PIX? (Nome do Comprovante)</label>
                                  <input required value={pixIdentifier} onChange={e => setPixIdentifier(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" placeholder="Ex: Maria Silva" />
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Seu Nome de Aluno</label>
                                  <input required value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" placeholder="Como quer ser chamado?" />
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email ou WhatsApp para Acesso</label>
                                  <input required value={contactInfo} onChange={e => setContactInfo(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none" placeholder="Onde enviamos o login?" />
                              </div>

                              <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all mt-4"
                              >
                                  {loading ? 'Processando...' : 'RESGATAR ACESSO AGORA'}
                              </button>
                          </form>
                      )}

                  </div>
              </div>
          </div>
      )}

      {/* --- SUCCESS PAGE (THANK YOU) --- */}
      {showThankYou && (
          <div className="fixed inset-0 z-[200] bg-[#050b14] flex items-center justify-center p-4 animate-in zoom-in-95 duration-500">
              {/* Background FX */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
                  <div className="star-layer stars-1"></div>
              </div>

              <div className="max-w-2xl w-full text-center relative z-10">
                  <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(16,185,129,0.4)] animate-bounce">
                      <ShieldCheck size={64} className="text-white" />
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                      COMPRA <span className="text-emerald-400">CONFIRMADA!</span>
                  </h1>
                  
                  <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8">
                      <p className="text-xl text-slate-300 mb-6">
                          Parabéns, <strong className="text-white">{studentName}</strong>! Você acaba de dar o passo mais importante para sua aprovação.
                      </p>
                      
                      <div className="space-y-4 text-left bg-black/20 p-6 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                              <CheckCircle2 className="text-emerald-500" size={20} />
                              <span className="text-slate-300">Acesso liberado no sistema.</span>
                          </div>
                          <div className="flex items-center gap-3">
                              <CheckCircle2 className="text-emerald-500" size={20} />
                              <span className="text-slate-300">Credenciais enviadas para: <strong className="text-white">{contactInfo}</strong></span>
                          </div>
                          <div className="flex items-center gap-3">
                              <CheckCircle2 className="text-emerald-500" size={20} />
                              <span className="text-slate-300">Bônus e Materiais desbloqueados.</span>
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={onStartGame}
                    className="group relative px-10 py-5 bg-white text-indigo-950 font-black text-lg md:text-xl rounded-full shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"
                  >
                      <Rocket size={24} className="text-indigo-600 group-hover:animate-ping" />
                      ACESSAR PLATAFORMA AGORA
                  </button>
                  
                  <p className="mt-6 text-slate-500 text-sm">
                      Dúvidas? Chame nosso suporte no WhatsApp.
                  </p>
              </div>
          </div>
      )}

      {/* FOOTER */}
      <footer className="py-12 bg-[#02050a] text-center border-t border-white/5 pb-safe">
        <p className="text-zinc-600 text-xs">© 2024 NeuroStudy AI. Todos os direitos reservados.</p>
      </footer>

    </div>
  );
};

export default LandingPage;
