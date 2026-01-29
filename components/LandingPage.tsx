
import React, { useEffect, useState, useRef } from 'react';
import { 
  Zap, Trophy, Target, Brain, ChevronRight, Star, 
  Shield, Rocket, Users, Lock, CheckCircle2, PlayCircle, 
  TrendingUp, Sword, Hexagon, Crown, Sparkles, Check, X, Timer, CreditCard, Gift,
  PenTool, Copy
} from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';

interface LandingPageProps {
  onStartGame: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'quest' | 'pvp'>('quest');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [timeLeft, setTimeLeft] = useState(4 * 60 * 60 + 59 * 60); // 4h 59m fake timer
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced' | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Form, 2: Payment/Confirm

  // Scroll Listener para XP Bar
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

  // Fake Scarcity Timer
  useEffect(() => {
      const interval = setInterval(() => {
          setTimeLeft(prev => (prev > 0 ? prev - 1 : 4 * 60 * 60)); // Reset if 0
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOpenCheckout = (plan: 'basic' | 'advanced') => {
      setSelectedPlan(plan);
      setShowCheckout(true);
      setCheckoutStep(1);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!leadName || !leadEmail || !leadPhone || !selectedPlan) return;
      
      setLoading(true);
      
      // Calculate Price
      let amount = 0;
      if (selectedPlan === 'basic') amount = billingCycle === 'monthly' ? 9.90 : 97.00;
      else amount = billingCycle === 'monthly' ? 19.90 : 197.00;

      // Create Lead
      try {
          // Generate PIX
          const pix = PixService.generatePayload(amount);
          setPixPayload(pix);

          await DatabaseService.createLead({
              name: leadName,
              contact: leadEmail + ' | ' + leadPhone,
              planId: selectedPlan === 'advanced' ? (billingCycle === 'monthly' ? 'PRO_MONTHLY' : 'PRO_YEARLY') : (billingCycle === 'monthly' ? 'BASIC_MONTHLY' : 'BASIC_YEARLY'),
              amount: amount,
              billing: billingCycle,
              paymentMethod: 'pix',
              timestamp: new Date().toISOString()
          });
          
          setCheckoutStep(2);
      } catch (error) {
          alert("Erro ao processar pedido. Tente novamente.");
      } finally {
          setLoading(false);
      }
  };

  const handleCopyPix = () => {
      if (pixPayload) navigator.clipboard.writeText(pixPayload);
      alert("PIX Copiado!");
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-white font-sans overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* --- HUD (HEADS UP DISPLAY) - STICKY HEADER --- */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050b14]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <Brain size={18} className="text-white" />
            </div>
            <span className="font-bold tracking-wider text-lg hidden md:block">Neuro<span className="text-emerald-400">Study</span></span>
          </div>

          {/* XP Bar */}
          <div className="flex-1 max-w-md mx-4 md:mx-8 hidden sm:block">
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mb-1 uppercase tracking-widest">
              <span>Novato</span>
              <span>XP {Math.floor(scrollProgress * 1000)} / 1000</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400 transition-all duration-100 ease-out shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                style={{ width: `${Math.min(scrollProgress * 100, 100)}%` }}
              />
            </div>
          </div>

          <button 
            onClick={onStartGame}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs md:text-sm font-bold py-2 px-4 rounded-lg transition-all active:scale-95 flex items-center"
          >
            LOGIN
          </button>
        </div>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] -z-10 opacity-40 animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mb-8 backdrop-blur-sm animate-slide-down">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono text-emerald-300 tracking-wide">SYSTEM ONLINE v2.4</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.1] md:leading-[1.1] animate-slide-up">
            DÊ <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">LEVEL UP</span> NA <br className="hidden md:block"/> SUA APROVAÇÃO
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Transforme o tédio dos estudos em vício por progresso. A plataforma que usa gamificação e Inteligência Artificial para hackear o ENEM e Concursos.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a 
              href="#pricing"
              className="w-full md:w-auto relative group overflow-hidden bg-white text-black font-black py-5 px-10 rounded-xl text-lg tracking-wide shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center justify-center">
                DESBLOQUEAR ACESSO <PlayCircle className="ml-2 group-hover:rotate-12 transition-transform" />
              </span>
            </a>
          </div>

          {/* 3D Dashboard Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl perspective-[2000px] group">
            <div className="relative transform rotate-x-12 group-hover:rotate-x-6 transition-transform duration-700 ease-out preserve-3d">
               {/* Mockup Container */}
               <div className="bg-[#0f1722] border border-white/10 rounded-2xl p-2 shadow-2xl overflow-hidden relative z-10">
                 <div className="h-8 bg-[#1a2330] rounded-t-lg flex items-center px-4 space-x-2 border-b border-white/5">
                   <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                 </div>
                 <div className="relative overflow-hidden">
                    {/* Simulated Content */}
                    <img src="https://images.unsplash.com/photo-1642132652075-2d4338d7a3be?q=80&w=2670&auto=format&fit=crop" className="w-full h-auto opacity-40 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" alt="Dashboard Preview" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 backdrop-blur-xl p-8 rounded-2xl border border-white/10 text-center transform group-hover:scale-110 transition-transform duration-500">
                            <Trophy size={64} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
                            <h3 className="text-3xl font-black text-white mb-2">RANK UP!</h3>
                            <p className="text-emerald-400 font-bold tracking-widest uppercase">Nova Conquista Desbloqueada</p>
                        </div>
                    </div>
                 </div>
               </div>
               <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl -z-10 rounded-[3rem]" />
            </div>
          </div>
        </div>
      </section>

      {/* --- CHOOSE YOUR CHARACTER (COMPARISON) --- */}
      <section className="py-24 px-4 bg-black/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
              <h2 className="text-center text-4xl md:text-5xl font-black mb-16">ESCOLHA SEU <span className="text-purple-500">PERSONAGEM</span></h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* NPC (Old Way) */}
                  <div className="group relative bg-[#1a1a1a] rounded-3xl p-8 border border-white/5 hover:border-red-500/30 transition-all opacity-60 hover:opacity-100 grayscale hover:grayscale-0">
                      <div className="absolute -top-6 left-8 bg-red-900/80 text-red-200 px-4 py-1 rounded text-xs font-bold uppercase tracking-widest border border-red-500/30">O NPC (Estudante Comum)</div>
                      <div className="mb-6">
                          <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                              <X size={40} className="text-red-500" />
                          </div>
                          <h3 className="text-2xl font-bold text-zinc-300">Método Tradicional</h3>
                      </div>
                      <ul className="space-y-4 text-zinc-500 font-mono text-sm">
                          <li className="flex items-center"><X size={16} className="mr-3 text-red-900" /> Estudo passivo e chato</li>
                          <li className="flex items-center"><X size={16} className="mr-3 text-red-900" /> Sem métricas de evolução</li>
                          <li className="flex items-center"><X size={16} className="mr-3 text-red-900" /> Solidão absoluta</li>
                          <li className="flex items-center"><X size={16} className="mr-3 text-red-900" /> Preço alto de cursinhos</li>
                      </ul>
                  </div>

                  {/* HERO (NeuroStudy) */}
                  <div className="group relative bg-gradient-to-br from-indigo-950/30 to-purple-900/10 rounded-3xl p-8 border border-indigo-500/50 hover:border-indigo-400 transition-all shadow-[0_0_50px_rgba(99,102,241,0.1)] transform md:-translate-y-4 hover:scale-[1.02]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                      <div className="absolute -top-6 left-8 bg-indigo-600 text-white px-4 py-1 rounded text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/30 animate-pulse">O Pro Player (Aprovado)</div>
                      
                      <div className="mb-6 relative z-10">
                          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                              <Crown size={40} className="text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-white">NeuroStudy Pro</h3>
                      </div>
                      <ul className="space-y-4 text-indigo-100 font-bold text-sm relative z-10">
                          <li className="flex items-center"><CheckCircle2 size={18} className="mr-3 text-emerald-400" /> Gamificação Viciante (XP & Ranks)</li>
                          <li className="flex items-center"><CheckCircle2 size={18} className="mr-3 text-emerald-400" /> IA Tutor 24h (GPT-4o)</li>
                          <li className="flex items-center"><CheckCircle2 size={18} className="mr-3 text-emerald-400" /> Comunidade Ativa</li>
                          <li className="flex items-center"><CheckCircle2 size={18} className="mr-3 text-emerald-400" /> Preço de um lanche</li>
                      </ul>
                  </div>
              </div>
          </div>
      </section>

      {/* --- PRICING BATTLE PASS (THE STORE) --- */}
      <section id="pricing" className="py-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        
        <div className="max-w-5xl mx-auto text-center mb-12 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">LOJA DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">ITENS</span></h2>
          <p className="text-zinc-400 text-lg">Equipe seu cérebro para a batalha.</p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mt-8 gap-4">
              <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500'}`}>Mensal</span>
              <button 
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="w-16 h-8 bg-zinc-800 rounded-full relative border border-white/10 transition-colors hover:border-emerald-500/50"
              >
                  <div className={`w-6 h-6 bg-emerald-500 rounded-full absolute top-1 transition-all shadow-[0_0_10px_rgba(16,185,129,0.5)] ${billingCycle === 'monthly' ? 'left-1' : 'left-9'}`} />
              </button>
              <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500'}`}>
                  Anual <span className="text-emerald-400 text-[10px] bg-emerald-900/30 px-2 py-0.5 rounded ml-1 border border-emerald-500/20">-20% OFF</span>
              </span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 items-stretch">
          
          {/* BASIC PLAN */}
          <div className="bg-[#0f1722] border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all flex flex-col relative group overflow-hidden">
            <h3 className="text-xl font-bold text-zinc-400 mb-2 uppercase tracking-widest">Pacote Iniciante</h3>
            <div className="flex items-baseline gap-1 mb-6">
                <span className="text-sm text-zinc-500">R$</span>
                <span className="text-5xl font-black text-white">{billingCycle === 'monthly' ? '9,90' : '97,00'}</span>
                <span className="text-zinc-500 font-bold">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
            </div>
            
            <div className="h-px w-full bg-white/5 mb-6" />

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center text-zinc-300"><Check size={16} className="mr-3 text-zinc-500" /> Acesso às Aulas</li>
              <li className="flex items-center text-zinc-300"><Check size={16} className="mr-3 text-zinc-500" /> Banco de Questões (Limitado)</li>
              <li className="flex items-center text-zinc-500 line-through"><X size={16} className="mr-3" /> IA Tutor Pessoal</li>
              <li className="flex items-center text-zinc-500 line-through"><X size={16} className="mr-3" /> Correção de Redação</li>
            </ul>

            <button 
                onClick={() => handleOpenCheckout('basic')}
                className="w-full py-4 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-colors text-zinc-300"
            >
              Começar Básico
            </button>
          </div>

          {/* ADVANCED PLAN (LEGENDARY) */}
          <div className="relative bg-[#0f1722]/80 backdrop-blur-xl border-2 border-indigo-500 rounded-3xl p-8 shadow-[0_0_60px_rgba(99,102,241,0.15)] transform scale-100 md:scale-105 z-20 flex flex-col overflow-hidden">
            {/* Animated BG */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-lg z-20">
              Legendary Loot
            </div>
            
            <div className="relative z-10">
                <h3 className="text-xl font-bold text-indigo-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                    <Crown size={20} className="fill-indigo-400" /> Pacote Avançado
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-sm text-indigo-300">R$</span>
                    <span className="text-6xl font-black text-white">{billingCycle === 'monthly' ? '19,90' : '197,00'}</span>
                    <span className="text-indigo-300 font-bold">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                </div>
                {billingCycle === 'yearly' && (
                    <p className="text-emerald-400 text-xs font-bold mb-4 bg-emerald-900/20 inline-block px-2 py-1 rounded border border-emerald-500/20">Economia de R$ 41,80</p>
                )}
            </div>

            <div className="h-px w-full bg-indigo-500/30 mb-6 relative z-10" />

            <ul className="space-y-4 mb-8 flex-1 relative z-10">
              <li className="flex items-center text-white font-bold"><CheckCircle2 size={18} className="text-emerald-400 mr-3 fill-emerald-900" /> Tudo do Básico</li>
              <li className="flex items-center text-white"><Sparkles size={18} className="text-indigo-400 mr-3" /> IA Tutor Ilimitada (NeuroAI)</li>
              <li className="flex items-center text-white"><PenTool size={18} className="text-indigo-400 mr-3" /> Correção de Redação Detalhada</li>
              <li className="flex items-center text-white"><Trophy size={18} className="text-indigo-400 mr-3" /> Acesso a Simulados Oficiais</li>
              <li className="flex items-center text-white"><Users size={18} className="text-indigo-400 mr-3" /> Comunidade VIP & Ranking</li>
            </ul>

            <button 
              onClick={() => handleOpenCheckout('advanced')}
              className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-5 rounded-xl shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center text-lg gap-2 z-10"
            >
              <Zap size={20} className="fill-white" /> DESBLOQUEAR AGORA
            </button>
            <p className="text-center text-[10px] text-indigo-300/60 mt-3 relative z-10">Garantia de 7 dias. Cancele quando quiser.</p>
          </div>

        </div>

        {/* Scarcity Timer Banner */}
        <div className="max-w-md mx-auto mt-12 bg-red-900/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-center gap-3 animate-pulse-slow">
            <Timer className="text-red-500" />
            <span className="text-red-200 font-mono font-bold">Oferta expira em: {formatTime(timeLeft)}</span>
        </div>
      </section>

      {/* --- CHECKOUT MODAL (GAMIFIED) --- */}
      {showCheckout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 p-4">
              <div className="bg-[#0f1722] w-full max-w-lg rounded-3xl border border-indigo-500/30 shadow-[0_0_100px_rgba(79,70,229,0.2)] overflow-hidden relative flex flex-col max-h-[90vh]">
                  
                  {/* Decorative Header */}
                  <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                  
                  <button onClick={() => setShowCheckout(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20 bg-black/20 p-2 rounded-full"><X size={20}/></button>

                  <div className="p-8 overflow-y-auto custom-scrollbar">
                      <div className="text-center mb-8">
                          <Hexagon size={48} className={`mx-auto mb-4 ${selectedPlan === 'advanced' ? 'text-indigo-500 fill-indigo-900/30' : 'text-zinc-500'}`} />
                          <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                              {checkoutStep === 1 ? 'Configurar Perfil' : 'Finalizar Missão'}
                          </h3>
                          <p className="text-zinc-400 text-sm mt-1">
                              {checkoutStep === 1 ? 'Crie seu personagem para acessar a plataforma.' : 'Realize o pagamento para liberar o acesso.'}
                          </p>
                      </div>

                      {checkoutStep === 1 ? (
                          <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nick (Nome Completo)</label>
                                  <input required value={leadName} onChange={e => setLeadName(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 focus:outline-none transition-colors" placeholder="Ex: João Silva" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email de Login</label>
                                  <input required type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 focus:outline-none transition-colors" placeholder="Ex: joao@email.com" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Whatsapp</label>
                                  <input required value={leadPhone} onChange={e => setLeadPhone(e.target.value)} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 focus:outline-none transition-colors" placeholder="(00) 00000-0000" />
                              </div>

                              <div className="bg-indigo-900/20 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between mt-6">
                                  <div className="flex items-center gap-3">
                                      {selectedPlan === 'advanced' ? <Crown size={20} className="text-indigo-400" /> : <Shield size={20} className="text-zinc-400" />}
                                      <div>
                                          <p className="font-bold text-white text-sm uppercase">{selectedPlan === 'advanced' ? 'Plano Avançado' : 'Plano Básico'}</p>
                                          <p className="text-xs text-zinc-400">{billingCycle === 'monthly' ? 'Cobrança Mensal' : 'Cobrança Anual'}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-mono font-bold text-emerald-400">
                                          R$ {selectedPlan === 'basic' ? (billingCycle === 'monthly' ? '9,90' : '97,00') : (billingCycle === 'monthly' ? '19,90' : '197,00')}
                                      </p>
                                  </div>
                              </div>

                              <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all mt-4 flex items-center justify-center gap-2"
                              >
                                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white" /> : <>PROSSEGUIR <ChevronRight size={20}/></>}
                              </button>
                          </form>
                      ) : (
                          <div className="text-center animate-in slide-in-from-right">
                              <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                   {/* Simple fake QR for demo purposes or real payload if logic exists */}
                                   <img 
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload || 'error')}`}
                                      className="w-48 h-48 mix-blend-multiply" 
                                   />
                              </div>
                              
                              <p className="text-zinc-400 text-sm mb-2">Escaneie o QR Code ou copie o código abaixo</p>
                              
                              <div className="flex gap-2 mb-6">
                                  <input readOnly value={pixPayload || ''} className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 text-xs text-zinc-500 font-mono truncate" />
                                  <button onClick={handleCopyPix} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white transition-colors">
                                      <Copy size={18} />
                                  </button>
                              </div>

                              <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl mb-6">
                                  <p className="text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
                                      <Gift size={16} /> Bônus Ativo: Acesso imediato após compensação
                                  </p>
                              </div>

                              <button 
                                onClick={onStartGame} // In real app, check payment status
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                              >
                                  JÁ REALIZEI O PAGAMENTO
                              </button>
                              <p className="text-xs text-zinc-600 mt-4">Seu acesso será liberado em breve no email cadastrado.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* --- FOOTER GAME OVER --- */}
      <footer className="py-12 border-t border-white/5 bg-[#02050a] text-center">
        <h2 className="text-zinc-500 font-mono mb-4 text-sm">GAME OVER?</h2>
        <p className="text-2xl font-bold text-white mb-8">Não deixe seu futuro dar respawn no mesmo lugar.</p>
        
        <div className="flex justify-center gap-6 text-zinc-600 text-sm">
           <a href="#" className="hover:text-emerald-500 transition-colors">Termos de Uso</a>
           <a href="#" className="hover:text-emerald-500 transition-colors">Privacidade</a>
           <a href="#" className="hover:text-emerald-500 transition-colors">Suporte</a>
        </div>
        <p className="text-zinc-700 text-xs mt-8">© 2024 NeuroStudy AI. Todos os direitos reservados.</p>
      </footer>
      
      {/* Sticky Bottom CTA for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050b14] to-transparent md:hidden z-40 pointer-events-none">
        <button 
          onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-2xl pointer-events-auto active:scale-95 transition-transform"
        >
          COMEÇAR AGORA
        </button>
      </div>

    </div>
  );
};

export default LandingPage;
