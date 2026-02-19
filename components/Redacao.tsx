
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { auth } from '../services/firebaseConfig';
import { EssayCorrection, UserProfile } from '../types';
import { PenTool, CheckCircle, Wallet, Plus, Camera, Scan, FileText, X, AlertTriangle, QrCode, Copy, Check, UploadCloud, Loader2, Sparkles, TrendingDown, ArrowRight, AlertCircle, MessageSquareText, ThumbsUp, ThumbsDown, BookOpen, Layers, ChevronRight, Crown, CreditCard, Star, Repeat, Gift, Zap, ShieldCheck, Lock, User, Clock, Rocket, Target, FileCheck } from 'lucide-react';
import { KIRVANO_LINKS } from '../constants';

interface RedacaoProps {
    user: UserProfile;
    onUpdateUser: (u: UserProfile) => void;
    onShowUpgrade?: () => void;
}

const Redacao: React.FC<RedacaoProps> = ({ user, onUpdateUser, onShowUpgrade }) => {
  const [history, setHistory] = useState<EssayCorrection[]>([]);
  
  // Views: home (with plans or dashboard), upload, scanning, result, pay_pix
  const [view, setView] = useState<'home' | 'upload' | 'scanning' | 'result' | 'pay_pix'>('home');
  
  // Payment State
  const [selectedPlanTier, setSelectedPlanTier] = useState<'basic' | 'medium' | 'advanced'>('medium');
  const [selectedCycle, setSelectedCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixAmount, setPixAmount] = useState(0);
  const [payerName, setPayerName] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Correction State
  const [theme, setTheme] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [currentResult, setCurrentResult] = useState<EssayCorrection | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Animations
  const [displayScore, setDisplayScore] = useState(0);
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>('c1');

  // PLAN CONFIGURATION
  const PLAN_CONFIG = {
      basic: {
          name: 'Básico',
          creditsPerWeek: 1,
          prices: { weekly: 9.90, monthly: 19.90, yearly: 49.90 },
          features: ['1 Redação / semana', 'Correção via IA', 'Nota Competências']
      },
      medium: {
          name: 'Médio',
          creditsPerWeek: 2,
          prices: { weekly: 14.90, monthly: 29.90, yearly: 69.90 },
          features: ['2 Redações / semana', 'Prioridade na fila', 'Feedback Detalhado']
      },
      advanced: {
          name: 'Avançado+',
          creditsPerWeek: 4,
          prices: { weekly: 19.90, monthly: 39.90, yearly: 97.00 },
          features: ['4 Redações / semana', 'Análise Profunda', 'Dicas de Estrutura', 'Histórico Ilimitado']
      }
  };

  // CHECK ACTIVE PLAN
  const hasActivePlan = user.essayPlanExpiry ? new Date(user.essayPlanExpiry).getTime() > Date.now() : false;
  const credits = user.essayCredits || 0;
  const canSend = hasActivePlan && credits > 0;

  useEffect(() => {
    fetchHistory();
    if (user.displayName) setPayerName(user.displayName);
  }, [user]);

  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 4000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  // Score Animation
  useEffect(() => {
      if (view === 'result' && currentResult) {
          const target = currentResult.scoreTotal;
          let start = 0;
          const duration = 1500;
          const increment = target / (duration / 16);
          const timer = setInterval(() => {
              start += increment;
              if (start >= target) {
                  setDisplayScore(target);
                  clearInterval(timer);
              } else {
                  setDisplayScore(Math.floor(start));
              }
          }, 16);
          return () => clearInterval(timer);
      }
  }, [view, currentResult]);

  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    const essays = await DatabaseService.getEssayCorrections(auth.currentUser.uid);
    setHistory(essays.reverse());
  };

  // --- HANDLERS ---

  const handleSelectPlan = (tier: 'basic' | 'medium' | 'advanced') => {
      setSelectedPlanTier(tier);
  };

  const handleBuyPlan = (method: 'pix' | 'card') => {
      const price = PLAN_CONFIG[selectedPlanTier].prices[selectedCycle];
      
      // External Checkout (Only for Monthly/Weekly usually, but sticking to prompt logic: External vs PIX)
      // For simplified demo, Card redirects to a generic link, PIX generates code.
      if (method === 'card') {
          // Redirect to appropriate Kirvano link based on cycle/tier logic if available
          // Using fallbacks from constants for now
          window.open(KIRVANO_LINKS.essay_credits, '_blank'); 
          return;
      }

      // Generate PIX
      try {
          const payload = PixService.generatePayload(price);
          setPixPayload(payload);
          setPixAmount(price);
          setView('pay_pix');
      } catch (e) {
          setNotification({ type: 'error', message: "Erro ao gerar PIX" });
      }
  };

  const handleConfirmPixPayment = async () => {
      if (!auth.currentUser) return;
      if (!payerName.trim()) {
          setNotification({ type: 'error', message: "Nome do pagador obrigatório" });
          return;
      }
      if (!window.confirm(`CONFIRMAÇÃO:\n\nNome: ${payerName}\nValor: R$ ${pixAmount.toFixed(2)}\n\nO nome do pagador está correto?`)) return;

      const cycleLabel = selectedCycle === 'weekly' ? 'Semanal' : selectedCycle === 'monthly' ? 'Mensal' : 'Anual';
      const tierName = PLAN_CONFIG[selectedPlanTier].name;
      const label = `Redação ${tierName} - ${cycleLabel}`;

      try {
          await DatabaseService.createRechargeRequest(
              auth.currentUser.uid,
              payerName.toUpperCase(),
              pixAmount,
              'BRL',
              0, // Quantity handled by backend logic for plans
              label
          );
          setNotification({ type: 'success', message: "Solicitação enviada! Seus créditos serão liberados em breve." });
          setView('home');
      } catch (e) {
          setNotification({ type: 'error', message: "Erro ao enviar solicitação." });
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => setImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleCorrectionSubmit = async () => {
      if (!canSend) {
          setNotification({ type: 'error', message: "Plano inativo ou sem créditos." });
          return;
      }
      if (confirmText !== 'CONFIRMAR') {
          setNotification({ type: 'error', message: "Digite CONFIRMAR corretamente." });
          return;
      }
      if (!image || !theme || !auth.currentUser) return;

      setView('scanning');

      try {
          const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  mode: 'essay-correction',
                  message: theme,
                  image: image, 
                  uid: auth.currentUser.uid
              })
          });

          if (!res.ok) throw new Error("Erro na análise da IA");

          const data = await res.json();
          const cleanJson = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          const result: EssayCorrection = {
              theme,
              imageUrl: null, 
              date: Date.now(),
              scoreTotal: parsed.score_total || 0,
              competencies: { 
                  c1: parsed.c1 || 0, c2: parsed.c2 || 0, c3: parsed.c3 || 0, c4: parsed.c4 || 0, c5: parsed.c5 || 0 
              },
              detailedCompetencies: {
                  c1: parsed.c1_analysis, c2: parsed.c2_analysis, c3: parsed.c3_analysis, c4: parsed.c4_analysis, c5: parsed.c5_analysis
              },
              feedback: parsed.general_feedback || "Análise concluída.",
              strengths: parsed.strengths || [],
              weaknesses: parsed.weaknesses || [],
              structuralTips: parsed.structural_tips || ""
          };

          await DatabaseService.saveEssayCorrection(auth.currentUser.uid, result);
          await DatabaseService.processXpAction(auth.currentUser.uid, 'ESSAY_CORRECTION', Math.floor(result.scoreTotal * 0.6));

          // Decrement Credit locally
          onUpdateUser({ ...user, essayCredits: Math.max(0, credits - 1) });

          setCurrentResult({ ...result, imageUrl: image }); 
          setExpandedCompetency('c1');
          setView('result');
          fetchHistory();

      } catch (e: any) {
          setNotification({ type: 'error', message: `Falha: ${e.message}` });
          setView('upload');
      }
  };

  // --- RENDERERS ---

  const renderPlans = () => (
      <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex justify-center mb-8">
              <div className="bg-slate-900 p-1 rounded-xl border border-white/10 flex">
                  {(['weekly', 'monthly', 'yearly'] as const).map(cycle => (
                      <button 
                        key={cycle}
                        onClick={() => setSelectedCycle(cycle)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${selectedCycle === cycle ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                      >
                          {cycle === 'weekly' ? 'Semanal' : cycle === 'monthly' ? 'Mensal' : 'Anual'}
                      </button>
                  ))}
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['basic', 'medium', 'advanced'] as const).map(tier => {
                  const cfg = PLAN_CONFIG[tier];
                  const isSelected = selectedPlanTier === tier;
                  const price = cfg.prices[selectedCycle];
                  
                  return (
                      <div 
                        key={tier} 
                        onClick={() => handleSelectPlan(tier)}
                        className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col ${isSelected ? 'border-indigo-500 bg-slate-900/80 shadow-2xl scale-105 z-10' : 'border-white/5 bg-slate-900/40 hover:border-white/20'}`}
                      >
                          {tier === 'advanced' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Recomendado</div>}
                          
                          <div className="text-center mb-6">
                              <h3 className="text-xl font-bold text-white mb-2">{cfg.name}</h3>
                              <p className="text-3xl font-black text-white">R$ {price.toFixed(2).replace('.', ',')}</p>
                              <p className="text-xs text-slate-500 capitalize">/{selectedCycle === 'weekly' ? 'semana' : selectedCycle === 'monthly' ? 'mês' : 'ano'}</p>
                          </div>

                          <ul className="space-y-3 mb-8 flex-1">
                              {cfg.features.map((feat, i) => (
                                  <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                                      <CheckCircle size={14} className="text-emerald-500 shrink-0"/> {feat}
                                  </li>
                              ))}
                          </ul>

                          <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
                              {isSelected ? 'Selecionado' : 'Escolher'}
                          </button>
                      </div>
                  )
              })}
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                  <h4 className="font-bold text-white text-lg">Finalizar Assinatura</h4>
                  <p className="text-slate-400 text-sm">Plano {PLAN_CONFIG[selectedPlanTier].name} ({selectedCycle === 'weekly' ? 'Semanal' : selectedCycle === 'monthly' ? 'Mensal' : 'Anual'})</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => handleBuyPlan('pix')} className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                      <QrCode size={18}/> Pagar com PIX
                  </button>
                  <button onClick={() => handleBuyPlan('card')} className="flex-1 md:flex-none px-6 py-3 bg-white hover:bg-indigo-50 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg">
                      <CreditCard size={18}/> Cartão
                  </button>
              </div>
          </div>
      </div>
  );

  // --- VIEW: UPLOAD ---
  if (view === 'upload') {
      return (
          <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-8">
              {notification && (
                  <div className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                      {notification.type === 'error' ? <AlertTriangle/> : <CheckCircle/>}
                      {notification.message}
                  </div>
              )}
              
              <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setView('home')} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                      <ArrowRight className="rotate-180" size={24} />
                  </button>
                  <h2 className="text-2xl font-bold text-white">Nova Correção</h2>
              </div>

              <div className="glass-card p-8 rounded-[2rem] border border-white/10 space-y-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Tema da Redação</label>
                      <input 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-colors"
                        placeholder="Ex: Caminhos para combater a intolerância religiosa"
                        value={theme}
                        onChange={e => setTheme(e.target.value)}
                      />
                  </div>

                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Foto da Redação</label>
                      <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-900/50 transition-colors relative">
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                          {image ? (
                              <div className="relative h-48 w-full">
                                  <img src={image} className="w-full h-full object-contain rounded-lg" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity text-white font-bold">Trocar Imagem</div>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center gap-3 text-slate-400">
                                  <UploadCloud size={48} />
                                  <p className="text-sm font-medium">Clique ou arraste a foto aqui</p>
                                  <p className="text-xs text-slate-600">Certifique-se que o texto está legível</p>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 items-start">
                      <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                          <p className="text-amber-200 text-sm font-bold">Confirmação de Envio</p>
                          <p className="text-amber-200/70 text-xs mt-1">
                              Será debitado <strong>1 crédito</strong> da sua conta.
                          </p>
                      </div>
                  </div>

                  <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase ml-1 mb-1 block">Digite "CONFIRMAR" para enviar</label>
                      <input 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500"
                        placeholder="CONFIRMAR"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                      />
                  </div>

                  <button 
                    onClick={handleCorrectionSubmit}
                    disabled={!image || !theme || confirmText !== 'CONFIRMAR'}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                      <PenTool size={20} /> Enviar para Correção
                  </button>
              </div>
          </div>
      );
  }

  // --- VIEW: PAY PIX ---
  if (view === 'pay_pix') {
      return (
          <div className="max-w-md mx-auto py-12 text-center animate-in zoom-in-95">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative">
                  <button onClick={() => setView('home')} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24}/></button>
                  
                  <h3 className="text-2xl font-black text-white mb-2">Pagamento via PIX</h3>
                  <p className="text-slate-400 text-sm mb-6">Escaneie ou copie o código abaixo.</p>

                  <div className="bg-white p-4 rounded-3xl inline-block mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48 mix-blend-multiply" />
                  </div>

                  <div className="flex gap-2 mb-6">
                      <input readOnly value={pixPayload || ''} className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 text-xs text-slate-400 truncate" />
                      <button onClick={() => {navigator.clipboard.writeText(pixPayload||''); setCopied(true)}} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors">
                          {copied ? <Check size={18} className="text-emerald-400"/> : <Copy size={18}/>}
                      </button>
                  </div>

                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6 text-left">
                      <label className="text-[10px] text-slate-500 font-bold uppercase ml-1 flex items-center gap-1"><User size={12}/> Nome do Pagador (Obrigatório)</label>
                      <input 
                          className="w-full bg-transparent border-b border-slate-700 py-2 text-white text-sm outline-none focus:border-indigo-500" 
                          placeholder="Nome completo do titular" 
                          value={payerName}
                          onChange={e => setPayerName(e.target.value)}
                      />
                  </div>

                  <div className="bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-xl mb-6">
                      <p className="text-emerald-400 font-bold text-lg">Total: R$ {pixAmount.toFixed(2).replace('.', ',')}</p>
                  </div>

                  <button onClick={handleConfirmPixPayment} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                      <CheckCircle size={20}/> Já realizei o pagamento
                  </button>
              </div>
          </div>
      );
  }

  // --- VIEW: HOME (DASHBOARD OR PLANS) ---
  return (
      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in">
          {notification && (
              <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 font-bold border ${notification.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-200' : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'}`}>
                  {notification.message}
              </div>
          )}

          {/* ACTIVE PLAN DASHBOARD */}
          {hasActivePlan ? (
              <div className="space-y-8">
                  <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                          <div>
                              <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300"><Crown size={20}/></div>
                                  <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Plano Ativo</span>
                              </div>
                              <h2 className="text-4xl font-black text-white mb-2">Redação {PLAN_CONFIG[user.essayPlanType || 'basic'].name}</h2>
                              <p className="text-slate-400">Válido até {new Date(user.essayPlanExpiry!).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="flex items-center gap-6 bg-slate-950/50 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                              <div className="text-center">
                                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Créditos Restantes</p>
                                  <p className="text-4xl font-black text-white">{credits}</p>
                              </div>
                              <div className="h-10 w-px bg-white/10" />
                              <button 
                                onClick={() => setView('upload')}
                                disabled={credits <= 0}
                                className="px-6 py-4 bg-white text-slate-950 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed font-black rounded-xl shadow-lg transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                              >
                                  {credits > 0 ? <><PenTool size={20}/> NOVA CORREÇÃO</> : <><Lock size={20}/> SEM CRÉDITOS</>}
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* HISTORY LIST */}
                  <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2"><FileCheck size={20} className="text-slate-500"/> Histórico de Correções</h3>
                      {history.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {history.map(item => (
                                  <div key={item.id} onClick={() => { setCurrentResult(item); setView('result'); }} className="glass-card p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/60 transition-all cursor-pointer group">
                                      <div className="flex justify-between items-start mb-3">
                                          <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                                          <span className={`font-black text-xl ${item.scoreTotal >= 900 ? 'text-emerald-400' : 'text-white'}`}>{item.scoreTotal}</span>
                                      </div>
                                      <p className="text-sm font-bold text-slate-200 line-clamp-2 group-hover:text-indigo-300 transition-colors">{item.theme}</p>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-3xl">
                              <p className="text-slate-500">Nenhuma redação enviada ainda.</p>
                          </div>
                      )}
                  </div>
              </div>
          ) : (
              // SALES PAGE (NO PLAN)
              <div className="text-center space-y-12">
                  <div className="max-w-2xl mx-auto space-y-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                          <Sparkles size={14}/> Método Comprovado
                      </div>
                      <h2 className="text-5xl font-black text-white tracking-tighter">Domine a Redação Nota 1000</h2>
                      <p className="text-lg text-slate-400 leading-relaxed">
                          Correção instantânea por Inteligência Artificial treinada com os critérios oficiais do ENEM. Escolha seu plano e comece a evoluir hoje.
                      </p>
                  </div>

                  {renderPlans()}
              </div>
          )}
      </div>
  );
};

export default Redacao;
