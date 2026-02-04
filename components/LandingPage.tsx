import React, { useEffect, useState, useRef } from 'react';
import { Rocket, Star, Zap, Shield, CheckCircle, Skull, Play, Lock, AlertTriangle, ChevronDown, Trophy, Timer, Swords, BrainCircuit, ArrowRight, MousePointerClick, CreditCard, QrCode, X, Check, Copy, User, Mail, Smartphone, Eye, Sparkles } from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { TrafficConfig, Lead } from '../types';

interface LandingPageProps {
  onStartGame: () => void;
}

// --- FAKE PROGRESS BAR COMPONENT (PSYCHOLOGICAL HACK) ---
const FakeProgressBar = ({ onHalfTime, onFinish }: { onHalfTime: () => void, onFinish: () => void }) => {
    const [progress, setProgress] = useState(75); // Começa em 75% para dar sensação de quase lá

    useEffect(() => {
        const totalDuration = 25000; // 25 segundos simulados para o restante
        const intervalTime = 100;
        const steps = totalDuration / intervalTime;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            
            // Simula desaceleração no final (Paradoxo de Zenão visual)
            setProgress(prev => {
                if (prev >= 98.5) return 98.5; // Trava visualmente no finalzinho
                // Avança bem devagar pois já começou em 75%
                const increment = (99 - prev) / 150; 
                return prev + increment;
            });

            // Triggers
            if (currentStep === Math.floor(steps / 2)) {
                onHalfTime();
            }
            if (currentStep >= steps) {
                onFinish();
                clearInterval(interval);
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full">
            <div className="flex justify-between text-[10px] text-indigo-300 font-bold mb-1 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1"><Lock size={10} /> Sincronizando Conhecimento...</span>
                <span className="animate-pulse text-red-400">Não feche a página</span>
            </div>
            <div className="w-full bg-black h-3 rounded-full overflow-hidden border border-white/10 shadow-inner relative group cursor-not-allowed">
                <div 
                    className="h-full bg-blue-600 relative transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-blue-400 blur-[2px] animate-pulse" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-md tracking-widest opacity-90 uppercase z-10">
                    Renderizando Módulo Secreto... {Math.floor(progress)}%
                </div>
            </div>
        </div>
    );
};

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  // State de Navegação (Slide Vertical)
  const [currentStep, setCurrentStep] = useState(0); // 0: Hero, 1: Enemies, 2: VSL, 3: Pricing
  
  // VSL Logic
  const [showEarlyOffer, setShowEarlyOffer] = useState(false);
  const [showFinalOffer, setShowFinalOffer] = useState(false);

  // Pricing / Checkout Logic
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixAmount, setPixAmount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced'>('advanced');
  const [purchasedCount, setPurchasedCount] = useState(842);
  const [config, setConfig] = useState<TrafficConfig>({ vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' });

  useEffect(() => {
    // Load config (though we will largely ignore config links for price hardcoding as requested, but keep for card links fallback)
    DatabaseService.getTrafficSettings().then(setConfig);

    // Fake ticker
    const interval = setInterval(() => {
        setPurchasedCount(prev => prev + Math.floor(Math.random() * 3));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const scrollToStep = (step: number) => {
      setCurrentStep(step);
  };

  // --- ACTIONS ---

  const handleCheckout = (plan: 'basic' | 'advanced', method: 'pix' | 'card') => {
      // Prices Logic
      let price = 0;
      if (plan === 'basic') {
          price = billingCycle === 'monthly' ? 9.90 : 97.00;
      } else {
          price = billingCycle === 'monthly' ? 19.90 : 197.00;
      }

      if (method === 'card') {
          // Open Kirvano Link (Use config or placeholders if empty)
          // Since we changed prices, the config links might be old, but we adhere to logic:
          const link = billingCycle === 'yearly' ? config.checkoutLinkYearly : config.checkoutLinkMonthly;
          // Fallback if config empty
          const finalLink = link || "https://kirvano.com"; 
          window.open(finalLink, '_blank');
      } else {
          // PIX Generation
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

  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans overflow-hidden relative selection:bg-indigo-500/30">
      
      {/* Background (Fixed & Visible Everywhere) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Deep Space Gradient Base */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,27,75,0.8),#020617_80%)]" />
          
          {/* Stars Layers */}
          <div className="star-layer stars-1"></div>
          <div className="star-layer stars-2"></div>
          
          {/* Nebula Glows */}
          <div className="nebula-glow fixed inset-0"></div>
      </div>

      {/* --- MAIN SLIDER CONTAINER --- */}
      <div 
        className="h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] relative z-10"
        style={{ transform: `translateY(-${currentStep * 100}vh)` }}
      >

          {/* === TELA 1: HERO === */}
          <section className="h-screen w-full flex flex-col items-center justify-center relative px-6 shrink-0 bg-transparent">
              <div className="absolute top-10 flex flex-col items-center animate-in fade-in duration-1000">
                 <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/50 mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-pulse-slow">
                     <BrainCircuit size={40} className="text-indigo-400" />
                 </div>
                 <h3 className="text-indigo-300 font-bold tracking-[0.3em] text-xs uppercase">NeuroStudy OS</h3>
              </div>

              <div className="text-center space-y-8 max-w-4xl z-10">
                  <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-[0_0_35px_rgba(255,255,255,0.2)] animate-in zoom-in-50 duration-1000">
                      READY PLAYER ONE?
                  </h1>
                  <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                      Você está prestes a entrar no <strong className="text-white">único sistema</strong> capaz de hackear sua aprovação no ENEM em tempo recorde.
                  </p>
                  
                  <div className="pt-8">
                      {/* Novo Botão Press Start (No Bounce, Hover Effect) */}
                      <button 
                        onClick={() => scrollToStep(1)}
                        className="group relative px-12 py-5 bg-transparent overflow-hidden rounded-none border border-indigo-500/50 transition-all duration-300 hover:border-indigo-400 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]"
                      >
                          <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all duration-300 skew-x-12 scale-150 origin-left" />
                          <div className="relative flex items-center gap-4 text-2xl font-black text-white tracking-[0.2em] uppercase group-hover:tracking-[0.3em] transition-all duration-300">
                              <Play size={24} className="fill-white group-hover:text-indigo-300 transition-colors" />
                              PRESS START
                          </div>
                      </button>
                  </div>
              </div>
          </section>

          {/* === TELA 2: INIMIGOS === */}
          <section className="h-screen w-full flex flex-col items-center justify-center relative px-6 shrink-0 bg-black/40 backdrop-blur-sm">
              <div className="max-w-6xl mx-auto w-full">
                  <div className="text-center mb-12">
                      <span className="text-red-500 font-bold tracking-widest uppercase text-sm mb-2 block animate-pulse">Warning: Threats Detected</span>
                      <h2 className="text-4xl md:text-6xl font-black text-white mb-4">ESCOLHA SEUS INIMIGOS</h2>
                      <p className="text-slate-400">Quais destes "Monstros" estão drenando seu XP diário?</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
                              <div className="mt-6 w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full bg-${enemy.color}-500 w-[90%]`}></div>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="text-center">
                      <button 
                        onClick={() => scrollToStep(2)}
                        className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-xl rounded-xl shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:scale-105 transition-all flex items-center gap-3 mx-auto uppercase tracking-wide"
                      >
                          <Swords size={24} />
                          Enfrentar Agora
                      </button>
                  </div>
              </div>
          </section>

          {/* === TELA 3: VSL & TIMER === */}
          <section className="h-screen w-full flex flex-col items-center justify-center relative px-6 shrink-0 bg-slate-950/60 backdrop-blur-md">
              <div className="max-w-5xl w-full">
                  <div className="bg-slate-900/80 rounded-3xl border border-indigo-500/30 shadow-[0_0_100px_rgba(79,70,229,0.15)] backdrop-blur-xl relative overflow-hidden">
                      {/* Monitor Header */}
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-slate-950/50">
                          <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500/50" />
                              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                              <div className="w-3 h-3 rounded-full bg-green-500/50" />
                          </div>
                          <div className="flex-1 text-center text-xs font-mono text-slate-500">SECRET_WEAPON_FILE.mp4</div>
                      </div>

                      {/* Video Container (No bottom rounding) */}
                      <div className="relative aspect-video bg-black rounded-none overflow-hidden group">
                          <video 
                            src="/video.mp4" 
                            className="w-full h-full object-cover" 
                            controls 
                            controlsList="nodownload"
                            poster="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000&auto=format&fit=crop"
                          >
                              Seu navegador não suporta vídeos.
                          </video>
                      </div>

                      {/* FAKE PROGRESS BAR (GLUED TO PLAYER) */}
                      <div className="bg-slate-950 p-4 border-t border-white/5">
                          <FakeProgressBar 
                            onHalfTime={() => setShowEarlyOffer(true)} 
                            onFinish={() => setShowFinalOffer(true)} 
                          />
                      </div>
                  </div>

                  {/* Dynamic CTAs (Below Monitor) */}
                  <div className="mt-8 text-center h-24 relative flex flex-col items-center justify-center">
                      {showFinalOffer ? (
                          <div className="animate-in zoom-in-50 duration-500 w-full">
                              <button 
                                onClick={() => scrollToStep(3)}
                                className="w-full md:w-auto px-12 py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-2xl rounded-xl shadow-[0_0_60px_rgba(16,185,129,0.6)] hover:scale-105 transition-all animate-pulse-slow flex items-center justify-center gap-3 mx-auto uppercase tracking-widest border border-emerald-400/50"
                              >
                                  <Rocket size={28} className="fill-white" />
                                  LIBERAR ACESSO AGORA
                              </button>
                              <p className="text-xs text-slate-500 mt-2">O vídeo acabou. Sua oportunidade começou.</p>
                          </div>
                      ) : showEarlyOffer && (
                          <button 
                            onClick={() => scrollToStep(3)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-6 py-3 rounded-lg text-sm font-bold animate-in fade-in transition-all flex items-center gap-2 border border-white/5 hover:border-white/20"
                          >
                              <Eye size={16} /> Espiar Oferta
                          </button>
                      )}
                  </div>
              </div>
          </section>

          {/* === TELA 4: CHECKOUT / PREÇOS === */}
          <section className="h-screen w-full flex flex-col items-center justify-center relative px-6 shrink-0 bg-slate-950/80 backdrop-blur-md">
              <div className="max-w-6xl w-full relative">
                  
                  <div className="text-center mb-10">
                      <div className="inline-block mb-4 animate-bounce">
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                              <Sparkles size={14} className="fill-emerald-400" /> Turma Confirmada 2025
                          </span>
                      </div>
                      <h2 className="text-4xl md:text-5xl font-black text-white mb-2">INVESTIMENTO NA SUA APROVAÇÃO</h2>
                      <p className="text-slate-400 max-w-xl mx-auto">Escolha como você quer jogar esse jogo: no modo difícil (sozinho) ou com as melhores armas.</p>
                      
                      {/* Toggle Mensal/Anual */}
                      <div className="flex items-center justify-center gap-4 mt-8">
                          <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500'}`}>Mensal</span>
                          <button 
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                            className="w-16 h-8 bg-slate-800 rounded-full relative p-1 transition-colors border border-white/10 cursor-pointer"
                          >
                              <div className={`w-6 h-6 bg-indigo-500 rounded-full shadow-md transition-transform ${billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'}`} />
                          </button>
                          <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-500'}`}>
                              Anual <span className="text-emerald-400 text-[10px] ml-1 uppercase">(2 meses grátis)</span>
                          </span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
                      
                      {/* PLANO BÁSICO - ANCORAGEM (Parecer menos atrativo) */}
                      <div 
                        onClick={() => setSelectedPlan('basic')}
                        className={`bg-slate-900/60 border p-8 rounded-3xl relative transition-all cursor-pointer group ${selectedPlan === 'basic' ? 'border-slate-600 opacity-100 scale-95' : 'border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-80 scale-95'}`}
                      >
                          <div className="flex justify-between items-start">
                              <div>
                                  <h3 className="text-xl font-bold text-slate-400">Modo Sobrevivência</h3>
                                  <p className="text-slate-600 text-xs mb-6">Apenas o conteúdo bruto.</p>
                              </div>
                          </div>
                          
                          <div className="mb-6 opacity-80">
                              <span className="text-3xl font-black text-white">R$ {billingCycle === 'monthly' ? '9,90' : '97,00'}</span>
                              <span className="text-slate-500 text-sm font-bold">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                          </div>

                          <ul className="space-y-4 mb-8 text-slate-400 text-sm">
                              <li className="flex gap-2"><CheckCircle size={16} /> Acesso às Aulas Gravadas</li>
                              <li className="flex gap-2"><CheckCircle size={16} /> Banco de Questões</li>
                              <li className="flex gap-2 text-slate-600 line-through decoration-slate-600/50"><X size={16} /> Sem NeuroTutor IA</li>
                              <li className="flex gap-2 text-slate-600 line-through decoration-slate-600/50"><X size={16} /> Sem Redação IA</li>
                              <li className="flex gap-2 text-slate-600 line-through decoration-slate-600/50"><X size={16} /> Sem Simulados Exclusivos</li>
                          </ul>

                          {selectedPlan === 'basic' && (
                              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                  <button onClick={() => handleCheckout('basic', 'pix')} className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border border-white/5"><QrCode size={16}/> PIX</button>
                                  <button onClick={() => handleCheckout('basic', 'card')} className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border border-white/5"><CreditCard size={16}/> Cartão</button>
                              </div>
                          )}
                      </div>

                      {/* PLANO AVANÇADO - HERO (Destaque Total) */}
                      <div 
                        onClick={() => setSelectedPlan('advanced')}
                        className={`bg-gradient-to-b from-indigo-900/80 to-slate-900 border p-8 rounded-3xl relative transition-all cursor-pointer transform hover:-translate-y-2 shadow-2xl ${selectedPlan === 'advanced' ? 'border-emerald-500 shadow-emerald-500/20 ring-1 ring-emerald-500/50 scale-105 z-10' : 'border-indigo-500/50 opacity-90'}`}
                      >
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-900 px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 whitespace-nowrap">
                              <Star size={12} className="fill-slate-900" /> Recomendado por 94%
                          </div>

                          <h3 className="text-2xl font-black text-white flex items-center gap-2 mt-2">
                              <Trophy size={24} className="text-yellow-400 fill-yellow-400/20" /> MODO APROVAÇÃO
                          </h3>
                          <p className="text-emerald-400 text-xs mb-6 font-bold uppercase tracking-wide">Ecossistema Completo</p>
                          
                          <div className="mb-2">
                              <span className="text-5xl font-black text-white">R$ {billingCycle === 'monthly' ? '19,90' : '197,00'}</span>
                              <span className="text-slate-400 text-sm font-bold">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                          </div>
                          {billingCycle === 'yearly' && (
                              <p className="text-[10px] text-emerald-400 font-bold mb-6 bg-emerald-900/20 inline-block px-2 py-1 rounded">Menos de R$ 0,60 por dia</p>
                          )}

                          <ul className="space-y-3 mb-8 text-slate-200 text-sm font-medium">
                              <li className="flex gap-2 items-center"><CheckCircle size={18} className="text-emerald-500 fill-emerald-500/20" /> Tudo do Básico</li>
                              <li className="flex gap-2 items-center"><BrainCircuit size={18} className="text-emerald-500 fill-emerald-500/20" /> NeuroTutor IA (Tire dúvidas 24h)</li>
                              <li className="flex gap-2 items-center"><CheckCircle size={18} className="text-emerald-500 fill-emerald-500/20" /> Correção de Redação Instantânea</li>
                              <li className="flex gap-2 items-center"><Trophy size={18} className="text-emerald-500 fill-emerald-500/20" /> Simulados com Ranking</li>
                              <li className="flex gap-2 items-center"><Shield size={18} className="text-emerald-500 fill-emerald-500/20" /> Acesso à Comunidade VIP</li>
                          </ul>

                          {selectedPlan === 'advanced' && (
                              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                  <button onClick={() => handleCheckout('advanced', 'pix')} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"><QrCode size={18}/> PIX</button>
                                  <button onClick={() => handleCheckout('advanced', 'card')} className="bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"><CreditCard size={18}/> Cartão</button>
                              </div>
                          )}
                          
                          <div className="mt-4 text-center">
                              <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                  <Shield size={10} /> Garantia incondicional de 7 dias.
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="mt-16 text-center">
                      <p className="text-slate-500 text-xs flex items-center justify-center gap-2">
                          <span className="text-emerald-500 font-bold ml-4 flex items-center gap-1"><User size={14}/> {purchasedCount} alunos entraram hoje para vencer.</span>
                      </p>
                      <button onClick={onStartGame} className="mt-6 text-slate-600 hover:text-white text-xs underline transition-colors">
                          Já tenho conta, fazer login
                      </button>
                  </div>
              </div>
          </section>

      </div>

      {/* --- MODAL PIX --- */}
      {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in p-4">
              <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-3xl max-w-md w-full text-center relative shadow-2xl">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">Pagamento via PIX</h3>
                  <p className="text-slate-400 text-sm mb-6">Escaneie para liberar seu acesso imediatamente.</p>
                  
                  <div className="bg-white p-4 rounded-2xl inline-block mb-6">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48 mix-blend-multiply" />
                  </div>
                  
                  <div className="flex gap-2 mb-6">
                      <input readOnly value={pixPayload || ''} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 text-xs text-slate-400 truncate" />
                      <button onClick={() => navigator.clipboard.writeText(pixPayload || '')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white"><Copy size={18}/></button>
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