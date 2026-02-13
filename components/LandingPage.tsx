
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
      }
      return () => clearInterval(timer);
  }, [pixCooldown]);

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
      // REGRA: PLANO MENSAL -> TUDO VAI PARA KIRVANO
      if (billingCycle === 'monthly') {
          const link = plan === 'basic' ? KIRVANO_LINKS.plan_basic : KIRVANO_LINKS.plan_advanced;
          window.open(link, '_blank');
          return;
      }

      // REGRA: PLANO ANUAL
      if (method === 'card') {
          // Cartão Anual -> Kirvano
          const link = plan === 'basic' ? KIRVANO_LINKS.plan_basic : KIRVANO_LINKS.plan_advanced;
          window.open(link, '_blank');
      } else {
          // Pix Anual -> Modal Interno de Lead
          const price = plan === 'basic' ? 94.00 : 197.00;
          try {
              const payload = PixService.generatePayload(price);
              setPixPayload(payload);
              setPixAmount(price);
              setCheckoutForm({ fullName: '', email: '', password: '', payerName: '' });
              setHasClickedOnce(false);
              setPixCooldown(0);
              setShowPixModal(true);
          } catch (e) { alert("Erro ao gerar PIX"); }
      }
  };

  const handleConfirmPix = async () => {
      if (!checkoutForm.fullName.trim() || !checkoutForm.email.trim() || !checkoutForm.password.trim() || !checkoutForm.payerName.trim()) {
          setSubmitError("Preencha todos os dados.");
          return;
      }
      if (!hasClickedOnce) {
          setHasClickedOnce(true);
          setPixCooldown(15);
          setSubmitError("Validando transação com o sistema bancário... (15s)");
          return;
      }
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
                  <span className="text-4xl font-black text-white">R$ {val}</span>
                  <span className="text-zinc-500 text-sm font-bold ml-1">/mês</span>
              </div>
          );
      } else {
          const total = plan === 'basic' ? 94.00 : 197.00;
          const monthlyEq = (total / 12).toFixed(2).replace('.', ',');
          return (
              <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                      <span className="text-6xl font-black text-white tracking-tighter">R$ {monthlyEq}</span>
                      <span className="text-zinc-400 text-sm font-bold">/mês</span>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-black mt-2 bg-emerald-900/30 inline-block px-3 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest">
                      R$ {total.toFixed(2).replace('.', ',')} total (Anual)
                  </p>
              </div>
          );
      }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white font-sans overflow-y-auto overflow-x-hidden relative selection:bg-indigo-500 selection:text-white scroll-smooth">
      <style>{`
        @keyframes muzzleFlash { 0% { background-color: rgba(255, 255, 255, 0.8); } 100% { background-color: transparent; } }
        @keyframes enemyDeath { 0% { transform: scale(1); filter: brightness(2); } 100% { transform: scale(0.8) translateY(20px); opacity: 0; } }
        .animate-shot { animation: enemyDeath 0.4s forwards; }
        .star-layer { opacity: 0.3; background: radial-gradient(circle at 50% 50%, #fff 1%, transparent 1.5%); background-size: 50px 50px; }
      `}</style>

      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10">
          {/* HERO SECTION */}
          <section ref={heroRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20">
              <div className="text-center space-y-10 max-w-5xl z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-black uppercase tracking-[0.3em] animate-fade-in">
                      <Sparkles size={14} /> Sistema NeuroAI Ativado
                  </div>
                  <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter text-white uppercase leading-[0.85] drop-shadow-2xl">
                      APROVAÇÃO<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-white to-purple-500">HACKEADA</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
                      Você está a um passo do sistema que utiliza <strong className="text-white">Inteligência Artificial</strong> e gamificação para garantir sua vaga na Federal.
                  </p>
                  <div className="pt-8">
                      <button onClick={() => scrollToSection(enemiesRef)} className="group relative px-16 py-6 bg-white text-black transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] rounded-2xl">
                          <div className="relative flex items-center gap-4 text-2xl font-black tracking-[0.1em] uppercase italic">
                              <Play size={24} className="fill-black" /> PRESS START
                          </div>
                      </button>
                  </div>
              </div>
          </section>

          {/* PROBLEM KILLER SECTION */}
          <section ref={enemiesRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20 bg-zinc-950/40 backdrop-blur-sm cursor-crosshair">
              <div className="max-w-6xl mx-auto w-full">
                  <div className="text-center mb-20">
                      <h2 className="text-5xl md:text-7xl font-black text-white mb-4 uppercase italic">Elimine os Obstáculos</h2>
                      <p className="text-zinc-500 text-lg uppercase tracking-widest font-bold">Clique nos alvos para limpar seu caminho até a faculdade</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                      {[
                        { title: 'Procrastinação', desc: 'A NeuroAI organiza seu dia.', color: 'border-red-500/30' },
                        { title: 'Ansiedade', desc: 'Simulados que dão confiança.', color: 'border-amber-500/30' },
                        { title: 'Confusão', desc: 'O Mentor tira todas as dúvidas.', color: 'border-indigo-500/30' }
                      ].map((e, i) => (
                          <div key={i} onClick={() => handleKillEnemy(i)} className={`group relative bg-zinc-900/50 border-2 ${e.color} p-12 rounded-[2.5rem] transition-all hover:scale-105 active:scale-95 ${deadEnemies.includes(i) ? 'animate-shot pointer-events-none brightness-50' : 'hover:border-white/40'}`}>
                              <div className="absolute top-4 right-4"><Crosshair size={20} className="text-zinc-700" /></div>
                              <h3 className="text-3xl font-black text-white mb-4 uppercase">{e.title}</h3>
                              <p className="text-zinc-500 text-sm">{e.desc}</p>
                              {deadEnemies.includes(i) && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 rounded-[2.5rem]"><Check size={64} className="text-emerald-500" /></div>}
                          </div>
                      ))}
                  </div>
                  <button onClick={() => scrollToSection(vslRef)} className="px-12 py-5 bg-indigo-600 text-white font-black text-xl rounded-2xl flex items-center gap-4 mx-auto hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20">ASSISTIR ARMA SECRETA <ArrowRight/></button>
              </div>
          </section>

          {/* VSL SECTION */}
          <section ref={vslRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20">
              <div className="max-w-5xl w-full">
                  <div className="bg-zinc-900/40 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative">
                      <div className="aspect-video bg-black relative flex items-center justify-center">
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-800 pointer-events-none">
                              <Play size={120} strokeWidth={1} />
                              <p className="font-black uppercase tracking-[0.5em] mt-4">Vídeo Exclusivo</p>
                          </div>
                          <video src="/video.mp4" className="w-full h-full object-cover relative z-10" controls poster="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000" />
                      </div>
                      <div className="p-10 bg-zinc-950/80">
                          <FakeProgressBar onHalfTime={() => setShowEarlyOffer(true)} onFinish={() => setShowFinalOffer(true)} />
                      </div>
                  </div>
                  <div className="mt-12 text-center">
                      {(showFinalOffer || showEarlyOffer) && (
                          <button onClick={handleRevealOffer} className="px-20 py-8 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-3xl rounded-[2rem] shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-bounce-slow flex items-center gap-4 mx-auto uppercase italic tracking-tighter">
                             <Rocket size={32}/> Revelar Oferta VIP
                          </button>
                      )}
                  </div>
              </div>
          </section>

          {/* PRICING SECTION */}
          <section ref={pricingRef} className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
              {showPricingSection && (
                  <div className="max-w-5xl w-full animate-in slide-in-from-bottom-12 duration-700">
                      <div className="text-center mb-20">
                          <h2 className="text-6xl font-black mb-6 uppercase tracking-tighter">Escolha sua Patente</h2>
                          
                          <div className="flex items-center justify-center gap-6 mt-10">
                              <span className={`text-sm font-black uppercase tracking-widest transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-600'}`}>Mensal</span>
                              <button onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} className="w-20 h-10 bg-zinc-800 rounded-full relative p-1.5 transition-all border border-white/5">
                                  <div className={`w-7 h-7 bg-white rounded-full transition-all shadow-lg ${billingCycle === 'yearly' ? 'translate-x-10' : ''}`} />
                              </button>
                              <div className="flex flex-col items-start">
                                  <span className={`text-sm font-black uppercase tracking-widest transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-600'}`}>Anual</span>
                                  <span className="text-[10px] text-emerald-400 font-black bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">-20% OFF</span>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          {['basic', 'advanced'].map(p => (
                              <div key={p} onClick={() => setSelectedPlan(p as any)} className={`relative p-12 rounded-[3.5rem] border-2 transition-all duration-500 cursor-pointer flex flex-col ${selectedPlan === p ? 'border-white bg-zinc-900/50 scale-105 shadow-[0_0_80px_rgba(255,255,255,0.1)]' : 'border-zinc-800 opacity-40 hover:opacity-70'}`}>
                                  {p === 'advanced' && <div className="absolute top-0 right-12 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em] shadow-xl">Recomendado</div>}
                                  
                                  <h3 className="text-3xl font-black uppercase italic mb-8 flex items-center gap-3">
                                      {p === 'basic' ? <Skull size={28} className="text-zinc-500" /> : <Crown size={28} className="text-indigo-400" />}
                                      {p === 'basic' ? 'Patente Soldado' : 'Patente Elite'}
                                  </h3>
                                  
                                  {getPriceDisplay(p as any)}

                                  <ul className="space-y-4 mb-12 flex-1">
                                      <li className="flex gap-3 text-sm font-medium text-zinc-300"><CheckCircle size={18} className="text-emerald-500 shrink-0"/> Grade de Aulas Completa</li>
                                      <li className="flex gap-3 text-sm font-medium text-zinc-300"><CheckCircle size={18} className="text-emerald-500 shrink-0"/> Banco de 5.000+ Questões</li>
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
                                          <button onClick={() => handleCheckout(p as any, 'pix')} className="w-full bg-emerald-600 py-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3">
                                              <QrCode size={20}/> Pagar via PIX
                                          </button>
                                          <button onClick={() => handleCheckout(p as any, 'card')} className="w-full bg-white text-black py-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-3">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 p-4 backdrop-blur-xl">
              <div className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem] max-w-4xl w-full flex flex-col md:flex-row gap-12 relative shadow-3xl overflow-y-auto max-h-[95vh] custom-scrollbar">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={28}/></button>
                  
                  {submitSuccess ? (
                      <div className="w-full py-20 text-center animate-in zoom-in-50">
                          <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
                              <Check size={64} className="text-white"/>
                          </div>
                          <h3 className="text-5xl font-black uppercase italic tracking-tighter mb-4">Solicitado!</h3>
                          <p className="text-zinc-500 text-xl font-light">Validando seu acesso. Verifique seu e-mail em instantes.</p>
                      </div>
                  ) : (
                      <>
                        <div className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-4xl font-black uppercase italic tracking-tighter">Inscrição de Elite</h3>
                                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Preencha seus dados para liberação</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nome Completo</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Como no seu RG" value={checkoutForm.fullName} onChange={e => setCheckoutForm({...checkoutForm, fullName: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Seu Melhor E-mail</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Onde receberá o acesso" value={checkoutForm.email} onChange={e => setCheckoutForm({...checkoutForm, email: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Crie sua Senha</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500 transition-all" type="password" placeholder="Mínimo 6 caracteres" value={checkoutForm.password} onChange={e => setCheckoutForm({...checkoutForm, password: e.target.value})} /></div>
                                <div className="p-6 bg-emerald-900/10 border border-emerald-500/20 rounded-[2rem]">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Conferência de Pagamento</label>
                                    <input className="w-full bg-zinc-900 border-none rounded-xl p-4 text-xs font-bold text-white outline-none" placeholder="Nome impresso no comprovante" value={checkoutForm.payerName} onChange={e => setCheckoutForm({...checkoutForm, payerName: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950/40 rounded-[3rem] p-10 border border-white/5 shadow-inner">
                            <p className="text-emerald-400 font-black text-5xl mb-8 italic tracking-tighter">R$ {pixAmount.toFixed(2)}</p>
                            <div className="bg-white p-5 rounded-[2rem] mb-8 shadow-2xl relative group">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48 mix-blend-multiply" />
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem]"><Eye size={32} className="text-zinc-200" /></div>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(pixPayload || ''); alert("Código copiado!"); }} className="text-zinc-500 text-xs uppercase font-black hover:text-white mb-10 flex items-center gap-3 transition-colors bg-zinc-900/50 px-6 py-3 rounded-full"><Copy size={14}/> Copiar Código Pix</button>
                            
                            {submitError && <p className="text-red-400 text-xs font-black mb-6 animate-pulse uppercase tracking-wider">{submitError}</p>}
                            
                            <button onClick={handleConfirmPix} className="w-full py-7 bg-emerald-600 rounded-3xl font-black text-sm shadow-2xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] italic">
                                {pixCooldown > 0 ? <Loader2 className="animate-spin" /> : <CheckCircle size={22}/>} JÁ FIZ O PAGAMENTO
                            </button>
                            <p className="text-[10px] text-zinc-600 font-bold mt-4 uppercase text-center">Liberação instantânea após conferência automática</p>
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
