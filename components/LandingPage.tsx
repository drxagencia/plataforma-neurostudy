
import React, { useEffect, useState } from 'react';
import { 
  Zap, Trophy, Target, Brain, ChevronRight, Star, 
  Shield, Rocket, Users, Lock, CheckCircle2, PlayCircle, 
  TrendingUp, Sword, Hexagon, Crown
} from 'lucide-react';

interface LandingPageProps {
  onStartGame: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

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
          <div className="flex-1 max-w-md mx-4 md:mx-8">
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mb-1 uppercase tracking-widest">
              <span>Nível 1</span>
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-bold py-2 px-4 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center animate-pulse-slow"
          >
            LOGIN <ChevronRight size={16} className="ml-1" />
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
            Abandone o estudo passivo (NPC). Entre no ecossistema gamificado que transforma preparação para ENEM e Militares em um vício produtivo.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button 
              onClick={onStartGame}
              className="w-full md:w-auto relative group overflow-hidden bg-white text-black font-black py-5 px-10 rounded-xl text-lg tracking-wide shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center justify-center">
                START GAME <PlayCircle className="ml-2 group-hover:rotate-12 transition-transform" />
              </span>
            </button>
            
            <button className="w-full md:w-auto px-8 py-5 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2">
              <Sword size={20} /> VER TRAILER
            </button>
          </div>

          {/* 3D Dashboard Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl perspective-[2000px] group">
            <div className="relative transform rotate-x-12 group-hover:rotate-x-6 transition-transform duration-700 ease-out preserve-3d">
               {/* Mockup Container */}
               <div className="bg-[#0f1722] border border-white/10 rounded-2xl p-2 shadow-2xl overflow-hidden relative z-10">
                 {/* Fake Header */}
                 <div className="h-8 bg-[#1a2330] rounded-t-lg flex items-center px-4 space-x-2 border-b border-white/5">
                   <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                 </div>
                 {/* Content Simulation */}
                 <div className="grid grid-cols-4 gap-4 p-4 h-[300px] md:h-[500px] bg-gradient-to-b from-[#0f1722] to-black">
                    <div className="col-span-1 bg-white/5 rounded-lg border border-white/5 animate-pulse-slow"></div>
                    <div className="col-span-3 grid grid-rows-3 gap-4">
                        <div className="row-span-2 bg-gradient-to-br from-emerald-900/20 to-transparent rounded-lg border border-emerald-500/20 relative overflow-hidden">
                           <div className="absolute inset-0 flex items-center justify-center">
                              <h3 className="text-4xl font-black text-white/5 uppercase transform -rotate-12">Dashboard</h3>
                           </div>
                        </div>
                        <div className="row-span-1 grid grid-cols-2 gap-4">
                           <div className="bg-white/5 rounded-lg"></div>
                           <div className="bg-white/5 rounded-lg"></div>
                        </div>
                    </div>
                 </div>
               </div>
               
               {/* Glow effect behind dashboard */}
               <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl -z-10 rounded-[3rem]" />
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS BAR --- */}
      <div className="border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Jogadores Ativos", value: "10.4K+", icon: Users },
            { label: "Questões Destruídas", value: "5.2M", icon: Target },
            { label: "Aprovações", value: "850+", icon: Trophy },
            { label: "Rating Médio", value: "4.9/5", icon: Star },
          ].map((stat, i) => (
            <div key={i} className="flex items-center justify-center md:justify-start space-x-4 group cursor-default">
              <div className="p-3 bg-white/5 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                <stat.icon size={24} />
              </div>
              <div>
                <div className="text-2xl font-black">{stat.value}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- GAMIFICATION LOOP --- */}
      <section className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">O GAMEPLAY <span className="text-emerald-500">DA APROVAÇÃO</span></h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">O método tradicional é chato. Aqui, cada acerto te deixa mais forte.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {[
              { 
                title: "Daily Quests", 
                desc: "Metas diárias geradas por IA baseadas nas suas fraquezas.",
                icon: Target,
                color: "from-blue-500 to-indigo-500",
                xp: "+150 XP"
              },
              { 
                title: "Boss Battles", 
                desc: "Simulados cronometrados contra a banca do ENEM/Militar.",
                icon: Sword,
                color: "from-red-500 to-orange-500",
                xp: "+1000 XP"
              },
              { 
                title: "Ranked System", 
                desc: "Suba de Bronze até Global Elite e ganhe prêmios reais.",
                icon: Trophy,
                color: "from-yellow-400 to-amber-600",
                xp: "Rank Up"
              }
            ].map((card, i) => (
              <div key={i} className="group relative bg-[#0f1722] border border-white/10 p-8 rounded-3xl overflow-hidden hover:border-white/30 transition-all duration-300 hover:-translate-y-2">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color}`} />
                
                {/* Hover Glow */}
                <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 rounded-full`} />

                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg`}>
                    <card.icon className="text-white" size={28} />
                  </div>
                  <div className="bg-white/5 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 font-bold border border-white/5">
                    {card.xp}
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-3">{card.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- SKILL TREE (FEATURES) --- */}
      <section className="py-20 bg-gradient-to-b from-[#050b14] to-[#0a111a] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
              DESBLOQUEIE <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">HABILIDADES SUPREMAS</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8">
              Ao assinar o NeuroStudy, você não compra "aulas". Você equipa seu cérebro com ferramentas de elite.
            </p>

            <div className="space-y-6">
              {[
                { title: "Oráculo IA", desc: "Tutor pessoal disponível 24/7 para tirar dúvidas.", icon: Brain },
                { title: "Visão Tática", desc: "Dashboards que mostram exatamente onde focar.", icon: TrendingUp },
                { title: "Escudo Anti-Procrastinação", desc: "Sistema de notificação e streaks.", icon: Shield },
              ].map((skill, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-default">
                  <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 shrink-0">
                    <skill.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">{skill.title}</h4>
                    <p className="text-zinc-500 text-sm">{skill.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 relative">
             {/* Abstract Skill Tree Visual */}
             <div className="relative w-full aspect-square max-w-md mx-auto">
               <div className="absolute inset-0 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
               <div className="relative z-10 grid grid-cols-3 gap-4 place-items-center h-full">
                  {/* Nodes */}
                  {[1, 2, 3, 4, 5, 6, 7].map((node) => (
                    <div key={node} className={`w-16 h-16 md:w-20 md:h-20 bg-[#151e2b] border-2 ${node === 4 ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'border-zinc-700'} rounded-2xl flex items-center justify-center transform hover:scale-110 transition-transform`}>
                       <Hexagon size={32} className={node === 4 ? 'text-purple-500' : 'text-zinc-600'} />
                    </div>
                  ))}
                  {/* Lines (SVG Overlay could be better, simplified here) */}
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- PRICING BATTLE PASS --- */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center mb-16 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-4">ESCOLHA SEU <span className="text-emerald-500">LOADOUT</span></h2>
          <p className="text-zinc-400">Entre para o squad de elite hoje.</p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 items-center">
          
          {/* Free Tier */}
          <div className="bg-[#0f1722] border border-white/10 rounded-3xl p-8 opacity-70 hover:opacity-100 transition-opacity scale-95">
            <h3 className="text-2xl font-bold text-zinc-300 mb-2">Rookie Pass</h3>
            <div className="text-4xl font-black text-white mb-6">Grátis</div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-zinc-400"><CheckCircle2 size={16} className="mr-2" /> Acesso Básico</li>
              <li className="flex items-center text-zinc-400"><CheckCircle2 size={16} className="mr-2" /> 5 Questões/dia</li>
              <li className="flex items-center text-zinc-600 line-through"><Lock size={14} className="mr-2" /> Sem IA Tutor</li>
            </ul>
            <button onClick={onStartGame} className="w-full py-4 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-colors">
              Jogar Demo
            </button>
          </div>

          {/* Pro Tier (Legendary) */}
          <div className="relative bg-[#0f1722] border-2 border-emerald-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] transform scale-100 md:scale-105 z-20">
            <div className="absolute top-0 right-0 bg-emerald-500 text-black text-xs font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
              Recomendado
            </div>
            
            <h3 className="text-2xl font-bold text-emerald-400 mb-2 flex items-center gap-2">
              <Crown className="fill-current" size={24} /> Elite Season Pass
            </h3>
            <div className="flex items-end gap-2 mb-6">
              <div className="text-5xl font-black text-white">R$ 19,90</div>
              <div className="text-zinc-400 font-medium mb-1">/mês</div>
            </div>

            <div className="h-px w-full bg-emerald-500/20 mb-6"></div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-white"><CheckCircle2 size={18} className="text-emerald-500 mr-3" /> <b>Tudo Ilimitado</b></li>
              <li className="flex items-center text-white"><CheckCircle2 size={18} className="text-emerald-500 mr-3" /> IA Tutor (GPT-4)</li>
              <li className="flex items-center text-white"><CheckCircle2 size={18} className="text-emerald-500 mr-3" /> Correção de Redação</li>
              <li className="flex items-center text-white"><CheckCircle2 size={18} className="text-emerald-500 mr-3" /> Acesso à Comunidade VIP</li>
            </ul>

            <button 
              onClick={onStartGame}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center text-lg"
            >
              DESBLOQUEAR AGORA
            </button>
            <p className="text-center text-[10px] text-zinc-500 mt-3">Garantia de 7 dias ou seu dinheiro de volta.</p>
          </div>

        </div>
      </section>

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
          onClick={onStartGame}
          className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-2xl pointer-events-auto active:scale-95 transition-transform"
        >
          COMEÇAR AGORA
        </button>
      </div>

    </div>
  );
};

export default LandingPage;
