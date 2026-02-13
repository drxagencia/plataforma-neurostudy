import React, { useEffect, useState, useRef } from 'react';
/* Fix: Added missing PenTool import to fix "Cannot find name 'PenTool'" */
import { Rocket, Star, Zap, Shield, CheckCircle, Skull, Play, Lock, AlertTriangle, ChevronDown, Trophy, Timer, Swords, BrainCircuit, ArrowRight, MousePointerClick, CreditCard, QrCode, X, Check, Copy, User, Mail, Smartphone, Eye, Sparkles, Crosshair, Loader2, PenTool } from 'lucide-react';
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
  const [purchasedCount, setPurchasedCount] = useState(842);
  const [config, setConfig] = useState<TrafficConfig>({ vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' });

  const [checkoutForm, setCheckoutForm] = useState({ fullName: '', email: '', password: '', payerName: '' });
  const [pixCooldown, setPixCooldown] = useState(0);
  const [hasClickedOnce, setHasClickedOnce] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    DatabaseService.getTrafficSettings().then(setConfig);
    const interval = setInterval(() => {
        setPurchasedCount(prev => prev + Math.floor(Math.random() * 3));
    }, 15000);
    return () => clearInterval(interval);
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

  // --- LOGICA DE CHECKOUT ATUALIZADA ---
  const handleCheckout = (plan: 'basic' | 'advanced', method: 'pix' | 'card') => {
      // REGRA: Planos Mensais SEMPRE Kirvano
      if (billingCycle === 'monthly') {
          const link = plan === 'basic' ? KIRVANO_LINKS.plan_basic : KIRVANO_LINKS.plan_advanced;
          window.open(link, '_blank');
          return;
      }

      // REGRA: Planos Anuais
      if (method === 'card') {
          const link = plan === 'basic' ? KIRVANO_LINKS.plan_basic : KIRVANO_LINKS.plan_advanced;
          window.open(link, '_blank');
      } else {
          // PIX Anual gera QR Code interno
          const price = plan === 'basic' ? 94.00 : 197.00;
          try {
              const payload = PixService.generatePayload(price);
              setPixPayload(payload);
              setPixAmount(price);
              setCheckoutForm({ fullName: '', email: '', password: '', payerName: '' });
              setHasClickedOnce(false);
              setPixCooldown(0);
              setSubmitError(null);
              setSubmitSuccess(false);
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
          setSubmitError("Confirmando transação com o Banco Central... (15s)");
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
              <div className="mb-6 opacity-80">
                  <span className="text-3xl font-black text-white">R$ {val}</span>
                  <span className="text-zinc-500 text-sm font-bold">/mês</span>
              </div>
          );
      } else {
          const total = plan === 'basic' ? 94.00 : 197.00;
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
      <style>{`
        @keyframes muzzleFlash { 0% { background-color: rgba(255, 255, 255, 0.8); } 100% { background-color: transparent; } }
        @keyframes enemyDeath { 0% { transform: scale(1); filter: brightness(2); } 100% { transform: scale(0.8) translateY(20px); opacity: 0; } }
        .animate-shot { animation: enemyDeath 0.4s forwards; }
        .muzzle-overlay { position: absolute; inset: 0; pointer-events: none; animation: muzzleFlash 0.1s forwards; z-index: 50; }
        .star-layer { opacity: 0.5; }
      `}</style>

      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
          <div className="star-layer stars-1"></div>
          <div className="star-layer stars-2"></div>
      </div>

      <div className="relative z-10">
          <section ref={heroRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20">
              <div className="text-center space-y-8 max-w-4xl z-10">
                  <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.3)] uppercase leading-none">
                      APROVAÇÃO<br/>HACKEADA
                  </h1>
                  <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
                      O sistema de elite que transforma estudantes comuns em <strong className="text-white">monstros do ENEM</strong>.
                  </p>
                  <div className="pt-8">
                      <button onClick={() => scrollToSection(enemiesRef)} className="group relative px-12 py-5 bg-transparent border border-white/30 transition-all hover:border-white hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                          <div className="relative flex items-center gap-4 text-2xl font-black text-white tracking-[0.2em] uppercase">
                              <Play size={24} className="fill-white" /> PRESS START
                          </div>
                      </button>
                  </div>
              </div>
          </section>

          <section ref={enemiesRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20 bg-black/20 backdrop-blur-sm cursor-crosshair">
              <div className="max-w-6xl mx-auto w-full">
                  <div className="text-center mb-16">
                      <h2 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase">Limpe o Caminho</h2>
                      <p className="text-zinc-500">Clique nos problemas para eliminá-los do seu futuro.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                      {['Procrastinação', 'Ansiedade', 'Confusão'].map((e, i) => (
                          <div key={i} onClick={() => handleKillEnemy(i)} className={`group bg-black/60 border border-white/10 p-10 rounded-3xl transition-all ${deadEnemies.includes(i) ? 'animate-shot pointer-events-none' : 'hover:border-white/40'}`}>
                              <h3 className="text-2xl font-bold text-white mb-2">{e}</h3>
                              <div className="w-12 h-1 bg-zinc-800 mt-4"><div className="h-full bg-white w-[80%]"></div></div>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => scrollToSection(vslRef)} className="px-10 py-5 bg-white text-black font-black text-xl rounded-2xl flex items-center gap-3 mx-auto hover:scale-105 transition-all">ASSISTIR ARMA SECRETA</button>
              </div>
          </section>

          <section ref={vslRef} className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 py-20">
              <div className="max-w-5xl w-full">
                  <div className="bg-zinc-900/80 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                      <div className="aspect-video bg-black relative">
                          <video src="/video.mp4" className="w-full h-full object-cover" controls poster="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000" />
                      </div>
                      <div className="p-6 bg-black">
                          <FakeProgressBar onHalfTime={() => setShowEarlyOffer(true)} onFinish={() => setShowFinalOffer(true)} />
                      </div>
                  </div>
                  <div className="mt-10 text-center">
                      {(showFinalOffer || showEarlyOffer) && (
                          <button onClick={handleRevealOffer} className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-2xl rounded-2xl shadow-2xl animate-bounce-slow">REVELAR OFERTA</button>
                      )}
                  </div>
              </div>
          </section>

          <section ref={pricingRef} className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-20">
              {showPricingSection && (
                  <div className="max-w-4xl w-full animate-in slide-in-from-bottom-8">
                      <div className="text-center mb-16">
                          <h2 className="text-5xl font-black mb-4">ESCOLHA SEU PLANO</h2>
                          <div className="flex items-center justify-center gap-4 mt-8">
                              <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-600'}`}>Mensal</span>
                              <button onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} className="w-14 h-7 bg-zinc-800 rounded-full relative p-1"><div className={`w-5 h-5 bg-white rounded-full transition-all ${billingCycle === 'yearly' ? 'translate-x-7' : ''}`} /></button>
                              <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-600'}`}>Anual (-20%)</span>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {['basic', 'advanced'].map(p => (
                              <div key={p} onClick={() => setSelectedPlan(p as any)} className={`p-10 rounded-[3rem] border-2 cursor-pointer transition-all ${selectedPlan === p ? 'border-white bg-zinc-900 scale-105' : 'border-zinc-800 opacity-50'}`}>
                                  <h3 className="text-2xl font-black uppercase italic mb-4">{p === 'basic' ? 'Soldado' : 'Elite'}</h3>
                                  {getPriceDisplay(p as any)}
                                  <ul className="space-y-3 mb-10 text-sm text-zinc-400">
                                      <li className="flex gap-2"><Check size={16} className="text-emerald-500"/> Aulas Completas</li>
                                      <li className="flex gap-2"><Check size={16} className="text-emerald-500"/> Banco de Questões</li>
                                      {p === 'advanced' && (
                                          <>
                                            <li className="flex gap-2 text-white font-bold"><BrainCircuit size={16} className="text-indigo-400"/> NeuroTutor IA Ilimitado</li>
                                            <li className="flex gap-2 text-white font-bold"><PenTool size={16} className="text-indigo-400"/> Correção de Redação</li>
                                          </>
                                      )}
                                  </ul>
                                  {selectedPlan === p && (
                                      <div className="grid grid-cols-1 gap-3">
                                          <button onClick={() => handleCheckout(p as any, 'pix')} className="bg-emerald-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all">Pagar via PIX</button>
                                          <button onClick={() => handleCheckout(p as any, 'card')} className="bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all">Pagar via Cartão</button>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </section>
      </div>

      {/* MODAL PIX ANUAL */}
      {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 p-4">
              <div className="bg-zinc-900 border border-white/10 p-8 rounded-[3rem] max-w-2xl w-full flex flex-col md:flex-row gap-8 relative shadow-3xl">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X /></button>
                  {submitSuccess ? (
                      <div className="w-full py-10 text-center animate-in zoom-in-50"><div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40}/></div><h3 className="text-3xl font-black">SOLICITADO!</h3><p className="text-zinc-500">Aguarde a liberação por e-mail.</p></div>
                  ) : (
                      <>
                        <div className="flex-1 space-y-4">
                            <h3 className="text-2xl font-black uppercase italic italic tracking-tighter">Inscrição de Elite</h3>
                            <input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm" placeholder="Nome Completo" value={checkoutForm.fullName} onChange={e => setCheckoutForm({...checkoutForm, fullName: e.target.value})} />
                            <input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm" placeholder="E-mail" value={checkoutForm.email} onChange={e => setCheckoutForm({...checkoutForm, email: e.target.value})} />
                            <input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm" placeholder="Defina uma Senha" type="password" value={checkoutForm.password} onChange={e => setCheckoutForm({...checkoutForm, password: e.target.value})} />
                            <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl">
                                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Nome do Pagador (Conferência)</label>
                                <input className="w-full bg-zinc-900 border-none rounded-xl p-3 text-xs mt-2" placeholder="Nome no Comprovante" value={checkoutForm.payerName} onChange={e => setCheckoutForm({...checkoutForm, payerName: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-800/30 rounded-3xl p-6 border border-white/5">
                            <p className="text-emerald-400 font-black text-3xl mb-6 italic">R$ {pixAmount.toFixed(2)}</p>
                            <div className="bg-white p-3 rounded-2xl mb-6 shadow-xl"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload || '')}`} className="w-32 h-32 mix-blend-multiply" /></div>
                            <button onClick={() => navigator.clipboard.writeText(pixPayload || '')} className="text-zinc-500 text-[10px] uppercase font-black hover:text-white mb-6 flex items-center gap-2"><Copy size={12}/> Copiar Código</button>
                            {submitError && <p className="text-red-400 text-[10px] font-bold mb-4 animate-pulse uppercase">{submitError}</p>}
                            <button onClick={handleConfirmPix} className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-xs shadow-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                                {pixCooldown > 0 ? <Loader2 className="animate-spin" /> : <CheckCircle size={18}/>} JÁ FIZ O PAGAMENTO
                            </button>
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
