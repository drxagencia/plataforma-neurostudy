import React, { useEffect, useState, useRef } from 'react';
import { 
  Zap, Trophy, Target, Brain, ChevronRight, Star, 
  Shield, Rocket, Users, Lock, CheckCircle2, PlayCircle, 
  TrendingUp, Sword, Hexagon, Crown, Sparkles, Check, X, Timer, CreditCard, Gift,
  PenTool, Copy, Skull, Crosshair, ArrowDown, Clock, AlertTriangle, QrCode
} from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';

interface LandingPageProps {
  onStartGame: () => void;
}

// KIRVANO LINKS (Placeholders - Replace with real ones)
const KIRVANO_LINKS = {
    basic_monthly: "https://kirvano.com/checkout/...",
    basic_yearly: "https://kirvano.com/checkout/...",
    pro_monthly: "https://kirvano.com/checkout/...",
    pro_yearly: "https://kirvano.com/checkout/..."
};

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(4 * 60 * 60 + 59 * 60); 
  
  // INTERACTIVE STAGES
  const [activeEnemy, setActiveEnemy] = useState<string | null>(null);
  const [defeatedEnemies, setDefeatedEnemies] = useState<string[]>([]);
  
  // CHECKOUT STATE
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly'); // Default to Yearly
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced' | null>(null);
  
  // CHECKOUT FLOW: 1=Method, 2=PixPayment, 3=Identification
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  
  // DATA COLLECTION (After Payment)
  const [studentName, setStudentName] = useState(''); // Nome do aluno p/ cadastro
  const [pixIdentifier, setPixIdentifier] = useState(''); // Nome de quem pagou
  const [contactInfo, setContactInfo] = useState(''); // Email/Zap
  
  const [loading, setLoading] = useState(false);

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight}`;
      setScrollProgress(Number(scroll));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Timer
  useEffect(() => {
      const interval = setInterval(() => {
          setTimeLeft(prev => (prev > 0 ? prev - 1 : 4 * 60 * 60)); 
      }, 1000);
      return () => clearInterval(interval);
  }, []);

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
      setTimeout(() => {
          setDefeatedEnemies(prev => [...prev, enemy]);
          setActiveEnemy(null);
      }, 1500); // Animation duration
  };

  // --- CHECKOUT LOGIC ---
  const handleOpenCheckout = (plan: 'basic' | 'advanced') => {
      setSelectedPlan(plan);
      setShowCheckout(true);
      setCheckoutStep(1);
      setPaymentMethod(null);
      setPixPayload(null);
  };

  const handleMethodSelect = (method: 'pix' | 'card') => {
      setPaymentMethod(method);
      
      if (method === 'card') {
          // Redirect Logic
          let link = '';
          if (selectedPlan === 'basic') link = billingCycle === 'monthly' ? KIRVANO_LINKS.basic_monthly : KIRVANO_LINKS.basic_yearly;
          else link = billingCycle === 'monthly' ? KIRVANO_LINKS.pro_monthly : KIRVANO_LINKS.pro_yearly;
          
          window.open(link, '_blank');
          return;
      }

      if (method === 'pix') {
          // Generate Payload
          let amount = 0;
          if (selectedPlan === 'basic') amount = billingCycle === 'monthly' ? 9.90 : 97.00;
          else amount = billingCycle === 'monthly' ? 19.90 : 197.00;
          
          const payload = PixService.generatePayload(amount);
          setPixPayload(payload);
          setCheckoutStep(2);
      }
  };

  const handlePixPaid = () => {
      setCheckoutStep(3); // Go to identification
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
              name: studentName, // Nome do Aluno
              contact: contactInfo,
              planId: selectedPlan === 'advanced' ? (billingCycle === 'monthly' ? 'PRO_MONTHLY' : 'PRO_YEARLY') : (billingCycle === 'monthly' ? 'BASIC_MONTHLY' : 'BASIC_YEARLY'),
              amount: amount,
              billing: billingCycle,
              paymentMethod: 'pix',
              pixIdentifier: pixIdentifier, // Quem pagou
              timestamp: new Date().toISOString()
          });
          
          alert("Cadastro realizado! Acesso será liberado em breve no seu contato.");
          setShowCheckout(false);
      } catch (error) {
          alert("Erro ao salvar. Tente novamente.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-white font-sans overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* --- HUD --- */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050b14]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain size={24} className="text-emerald-500" />
            <span className="font-bold tracking-wider text-lg">Neuro<span className="text-emerald-400">Study</span></span>
          </div>
          <button onClick={onStartGame} className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-widest">
            Login
          </button>
        </div>
      </div>

      {/* --- STAGE 1: HERO (ENTRY) --- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden pt-20">
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        </div>

        <div className="text-center z-10 max-w-4xl">
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mb-8 backdrop-blur-sm animate-slide-down">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono text-emerald-300 tracking-wide">SYSTEM ONLINE v2.4</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none animate-slide-up">
              GAME <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">OVER</span><br/>
              PARA O ESTUDO CHATO
            </h1>

            <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up animation-delay-100">
              Não é só uma plataforma. É um ecossistema gamificado onde sua aprovação é a missão principal.
            </p>

            <button 
              onClick={() => scrollToSection('stage-battle')}
              className="group relative px-8 py-4 bg-white text-black font-black text-lg rounded-xl hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
            >
                PRESS START <PlayCircle size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
        </div>

        <div className="absolute bottom-10 animate-bounce">
            <ArrowDown className="text-zinc-500" />
        </div>
      </section>

      {/* --- STAGE 2: CHOOSE YOUR ENEMY (INTERACTIVE) --- */}
      <section id="stage-battle" className="py-32 px-4 bg-[#080f1a] relative border-t border-white/5">
          <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-black mb-4">ESCOLHA SEU <span className="text-red-500">INIMIGO</span></h2>
              <p className="text-zinc-400 mb-12">Clique nos problemas para eliminá-los com o Método NeuroStudy.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                      { id: 'procrastination', label: 'PROCRASTINAÇÃO', icon: Clock },
                      { id: 'anxiety', label: 'ANSIEDADE', icon: AlertTriangle },
                      { id: 'lost', label: 'ESTUDO PERDIDO', icon: Crosshair }
                  ].map(enemy => (
                      <div 
                        key={enemy.id}
                        onClick={() => handleEnemyClick(enemy.id)}
                        className={`relative h-64 rounded-3xl border-2 cursor-pointer transition-all duration-500 flex flex-col items-center justify-center p-6 overflow-hidden group ${
                            defeatedEnemies.includes(enemy.id) 
                            ? 'bg-emerald-900/20 border-emerald-500/50 scale-95' 
                            : activeEnemy === enemy.id 
                                ? 'bg-red-900/40 border-red-500 scale-105 shake' 
                                : 'bg-slate-900/50 border-white/10 hover:border-red-500/50 hover:bg-slate-800'
                        }`}
                      >
                          {/* Normal State */}
                          <div className={`transition-opacity duration-300 ${defeatedEnemies.includes(enemy.id) || activeEnemy === enemy.id ? 'opacity-0' : 'opacity-100'}`}>
                              <enemy.icon size={48} className="text-slate-500 mb-4 mx-auto group-hover:text-red-400 transition-colors" />
                              <h3 className="text-xl font-black text-zinc-300 group-hover:text-white">{enemy.label}</h3>
                              <p className="text-xs text-zinc-500 mt-2 uppercase tracking-widest">Clique para atacar</p>
                          </div>

                          {/* Active Attack State */}
                          <div className={`absolute inset-0 flex items-center justify-center bg-red-500/20 transition-opacity duration-100 ${activeEnemy === enemy.id ? 'opacity-100' : 'opacity-0'}`}>
                              <Sword size={64} className="text-red-500 animate-pulse" />
                          </div>

                          {/* Defeated State */}
                          <div className={`absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/80 backdrop-blur-sm transition-all duration-500 ${defeatedEnemies.includes(enemy.id) ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-150'}`}>
                              <CheckCircle2 size={48} className="text-emerald-400 mb-2" />
                              <h3 className="text-lg font-bold text-white">ELIMINADO</h3>
                              <p className="text-xs text-emerald-300 font-mono mt-1">
                                  {enemy.id === 'procrastination' ? '+ Gamificação' : enemy.id === 'anxiety' ? '+ IA Tutor' : '+ Metodologia'}
                              </p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* --- STAGE 3: THE ARMORY (PRICING) --- */}
      <section id="pricing" className="py-32 px-4 relative bg-[#050b14] border-t border-white/5">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">LOJA DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">ITENS</span></h2>
            
            {/* BILLING TOGGLE */}
            <div className="inline-flex bg-slate-900 p-1 rounded-2xl border border-white/10 relative">
                <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Mensal
                </button>
                <button 
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Anual <span className="ml-2 bg-emerald-500 text-black text-[10px] px-1.5 py-0.5 rounded font-black">-20%</span>
                </button>
                
                {/* Sliding Background */}
                <div className={`absolute top-1 bottom-1 w-[50%] bg-white/10 rounded-xl transition-all duration-300 ${billingCycle === 'monthly' ? 'left-1' : 'left-[49%]'}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
            
            {/* BASIC CARD */}
            <div className="bg-[#0f1722] border border-white/5 rounded-3xl p-8 hover:border-white/20 transition-all group">
                <h3 className="text-lg font-bold text-zinc-400 uppercase tracking-widest mb-4">Iniciante</h3>
                
                <div className="mb-6">
                    {billingCycle === 'yearly' ? (
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm text-zinc-500">12x de</span>
                                <span className="text-4xl font-black text-white">R$ 8,08</span>
                            </div>
                            <p className="text-zinc-500 text-sm mt-1">Total à vista: R$ 97,00</p>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-white">R$ 9,90</span>
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
                    className="w-full py-4 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-colors text-zinc-300"
                >
                    Selecionar Básico
                </button>
            </div>

            {/* PRO CARD (HERO) */}
            <div className="relative bg-[#0f1722]/80 backdrop-blur-xl border-2 border-indigo-500 rounded-3xl p-8 shadow-[0_0_60px_rgba(79,70,229,0.15)] transform md:scale-110 z-10 flex flex-col">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-lg">
                  Recomendado
                </div>

                <h3 className="text-lg font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Crown size={18} className="fill-current" /> Pro Player
                </h3>

                <div className="mb-6">
                    {billingCycle === 'yearly' ? (
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm text-indigo-300">12x de</span>
                                <span className="text-5xl font-black text-white">R$ 16,41</span>
                            </div>
                            <p className="text-indigo-300/60 text-sm mt-1 font-bold">Total à vista: R$ 197,00 (Economia Real)</p>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-white">R$ 19,90</span>
                            <span className="text-indigo-300 font-bold">/mês</span>
                        </div>
                    )}
                </div>

                <div className="h-px w-full bg-indigo-500/20 mb-6" />

                <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center text-white font-bold"><CheckCircle2 size={18} className="text-emerald-400 mr-3 fill-emerald-900" /> Tudo do Básico</li>
                    <li className="flex items-center text-white"><Sparkles size={18} className="text-indigo-400 mr-3" /> IA Tutor Ilimitada (NeuroAI)</li>
                    <li className="flex items-center text-white"><PenTool size={18} className="text-indigo-400 mr-3" /> Correção de Redação Detalhada</li>
                    <li className="flex items-center text-white"><Users size={18} className="text-indigo-400 mr-3" /> Comunidade VIP</li>
                </ul>

                <button 
                    onClick={() => handleOpenCheckout('advanced')}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-5 rounded-xl shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center text-lg gap-2"
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

      {/* --- CHECKOUT MODAL (RE-ENGINEERED) --- */}
      {showCheckout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 p-4">
              <div className="bg-[#0f1722] w-full max-w-md rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col">
                  <button onClick={() => setShowCheckout(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-20"><X size={20}/></button>
                  
                  {/* Step Header */}
                  <div className="bg-slate-900/50 p-6 border-b border-white/5 text-center">
                      <h3 className="text-xl font-bold text-white">
                          {checkoutStep === 1 ? 'Forma de Pagamento' : checkoutStep === 2 ? 'Pagamento PIX' : 'Dados de Acesso'}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">Passo {checkoutStep} de 3</p>
                  </div>

                  <div className="p-6">
                      
                      {/* STEP 1: CHOOSE METHOD */}
                      {checkoutStep === 1 && (
                          <div className="space-y-4">
                              <p className="text-sm text-zinc-400 mb-4 text-center">Como deseja pagar pelo plano <strong className="text-white uppercase">{selectedPlan === 'basic' ? 'Iniciante' : 'Pro Player'}</strong>?</p>
                              
                              <button 
                                onClick={() => handleMethodSelect('pix')}
                                className="w-full p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/10 hover:bg-emerald-900/20 transition-all flex items-center gap-4 group"
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
                                className="w-full p-4 rounded-xl border border-indigo-500/30 bg-indigo-900/10 hover:bg-indigo-900/20 transition-all flex items-center gap-4 group"
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
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all animate-pulse"
                              >
                                  JÁ REALIZEI O PAGAMENTO
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

      {/* FOOTER */}
      <footer className="py-12 bg-[#02050a] text-center border-t border-white/5">
        <p className="text-zinc-600 text-xs">© 2024 NeuroStudy AI. Todos os direitos reservados.</p>
      </footer>

    </div>
  );
};

export default LandingPage;