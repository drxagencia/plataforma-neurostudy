import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { auth } from '../services/firebaseConfig';
import { EssayCorrection, UserProfile } from '../types';
import { PenTool, CheckCircle, Wallet, Plus, Camera, Scan, FileText, X, AlertTriangle, QrCode, Copy, Check, UploadCloud, Loader2, Sparkles, TrendingDown, ArrowRight, AlertCircle, MessageSquareText, ThumbsUp, ThumbsDown, BookOpen, Layers, ChevronRight, Crown, CreditCard, Star, Repeat, Gift, Zap, ShieldCheck, Lock } from 'lucide-react';
import { KIRVANO_LINKS } from '../constants';

interface RedacaoProps {
    user: UserProfile;
    onUpdateUser: (u: UserProfile) => void;
    onShowUpgrade?: () => void;
}

const Redacao: React.FC<RedacaoProps> = ({ user, onUpdateUser, onShowUpgrade }) => {
  const [history, setHistory] = useState<EssayCorrection[]>([]);
  
  // Views
  const [view, setView] = useState<'home' | 'buy' | 'upload' | 'scanning' | 'result'>('home');
  
  // Buy Flow
  const [buyQty, setBuyQty] = useState<number>(1);
  const [showPix, setShowPix] = useState(false);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [payerName, setPayerName] = useState('');
  
  // Upgrade Flow
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Upload Flow
  const [theme, setTheme] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [currentResult, setCurrentResult] = useState<EssayCorrection | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Result Animation State
  const [displayScore, setDisplayScore] = useState(0);
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>('c1');

  // Notification State
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const isBasicPlan = user.plan === 'basic';
  const priceMultiplier = isBasicPlan ? 4 : 1;

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
      if (view === 'buy' && user.displayName) {
          setPayerName(user.displayName);
      }
  }, [view, user.displayName]);

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

  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 4000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    const essays = await DatabaseService.getEssayCorrections(auth.currentUser.uid);
    setHistory(essays.reverse());
  };

  const handleSelectHistoryItem = async (item: EssayCorrection) => {
      setLoadingDetails(true);
      setCurrentResult(item);
      setExpandedCompetency('c1');
      setLoadingDetails(false);
      setView('result');
  };

  const getPricePerUnit = (qty: number) => {
      let basePrice = 4.00;
      if (qty >= 10) basePrice = 3.50;
      else if (qty >= 5) basePrice = 3.75;
      
      return basePrice * priceMultiplier;
  };

  const totalPrice = buyQty * getPricePerUnit(buyQty);

  const handleGeneratePayment = () => {
      if (buyQty < 1) return;
      setIsUpgrading(false);

      if (paymentMethod === 'card') {
          window.open(KIRVANO_LINKS.essay_credits, '_blank');
          setNotification({ type: 'success', message: "Redirecionando para pagamento..." });
          return;
      }

      try {
          const payload = PixService.generatePayload(totalPrice);
          setPixPayload(payload);
          setShowPix(true);
      } catch (e) {
          setNotification({ type: 'error', message: "Erro ao gerar PIX" });
      }
  };

  const handleConfirmPayment = async () => {
      if (!auth.currentUser) return;
      
      if (!payerName.trim()) {
          setNotification({ type: 'error', message: "Digite o nome do pagador." });
          return;
      }

      // STRICT CONFIRMATION
      if (!window.confirm("ATENÇÃO: Você tem certeza que o nome do pagador está 100% correto? Isso é essencial para a liberação.")) {
          return;
      }
      
      const finalName = payerName.trim();

      try {
          await DatabaseService.createRechargeRequest(
              auth.currentUser.uid, 
              finalName, 
              totalPrice, 
              'CREDIT', 
              buyQty,
              'Recarga Redação Avulsa'
          );
          setNotification({ type: 'success', message: "Solicitação enviada! Aguarde a aprovação." });
          setShowPix(false);
          setIsUpgrading(false);
          setView('home');
      } catch (error: any) {
          console.error(error);
          setNotification({ type: 'error', message: "Erro ao registrar solicitação. Tente novamente." });
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCorrectionSubmit = async () => {
      const availableCredits = typeof user.essayCredits === 'number' ? user.essayCredits : 0;
      if (availableCredits <= 0) {
          setNotification({ type: 'error', message: "Sem créditos suficientes para enviar a redação." });
          setTimeout(() => setView('buy'), 1500);
          return;
      }

      if (confirmText !== 'CONFIRMAR') {
          setNotification({ type: 'error', message: "Digite CONFIRMAR corretamente para prosseguir." });
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

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Erro na correção");
          }

          const data = await res.json();
          let cleanJson = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          const roundToTwenty = (num: any) => {
              const val = Number(num);
              if (isNaN(val)) return 0;
              const clamped = Math.min(Math.max(val, 0), 200);
              return Math.round(clamped / 20) * 20;
          };

          const parseScore = (val: any) => roundToTwenty(val?.score ?? val);

          const c1Score = parseScore(parsed.c1);
          const c2Score = parseScore(parsed.c2);
          const c3Score = parseScore(parsed.c3);
          const c4Score = parseScore(parsed.c4);
          const c5Score = parseScore(parsed.c5);
          
          const finalTotal = c1Score + c2Score + c3Score + c4Score + c5Score;

          const result: EssayCorrection = {
              theme,
              imageUrl: null, 
              date: Date.now(),
              scoreTotal: finalTotal,
              competencies: { c1: c1Score, c2: c2Score, c3: c3Score, c4: c4Score, c5: c5Score },
              detailedCompetencies: {
                  c1: parsed.c1,
                  c2: parsed.c2,
                  c3: parsed.c3,
                  c4: parsed.c4,
                  c5: parsed.c5
              },
              feedback: parsed.general_feedback || parsed.feedback || "Análise concluída.",
              strengths: parsed.strengths || [],
              weaknesses: parsed.weaknesses || [],
              structuralTips: parsed.structural_tips || ""
          };

          await DatabaseService.saveEssayCorrection(auth.currentUser.uid, result);
          
          const xpEarned = Math.floor(finalTotal * 0.6);
          await DatabaseService.processXpAction(auth.currentUser.uid, 'ESSAY_CORRECTION', xpEarned);

          const currentCredits = Number(user.essayCredits || 0);
          onUpdateUser({
              ...user,
              essayCredits: Math.max(0, currentCredits - 1)
          });

          setCurrentResult({ ...result, imageUrl: image }); 
          
          setExpandedCompetency('c1');
          setView('result');
          
          fetchHistory();

      } catch (e: any) {
          setNotification({ type: 'error', message: `Falha: ${e.message}` });
          setView('upload');
      }
  };

  const COMPETENCY_LABELS: Record<string, string> = {
      c1: 'Norma Culta',
      c2: 'Tema e Estrutura',
      c3: 'Argumentação',
      c4: 'Coesão',
      c5: 'Proposta de Intervenção'
  };

  const COMPETENCY_ICONS: Record<string, any> = {
      c1: PenTool,
      c2: Layers,
      c3: MessageSquareText,
      c4: BookOpen,
      c5: CheckCircle
  };

  const renderNotification = () => {
      if (!notification) return null;
      return (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-top-4 duration-300 ${
            notification.type === 'error' 
            ? 'bg-red-500/90 border-red-400/50 text-white' 
            : 'bg-emerald-500/90 border-emerald-400/50 text-white'
        }`}>
            {notification.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
            <span className="font-bold text-sm md:text-base">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 opacity-80 hover:opacity-100"><X size={18}/></button>
        </div>
      );
  };

  if (view === 'scanning') {
      return (
          <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-900/50 z-10 flex items-center justify-center flex-col">
                  <div className="relative w-64 h-80 border-2 border-indigo-500 rounded-lg overflow-hidden bg-white/5 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                      {image && <img src={image} className="w-full h-full object-cover opacity-50" />}
                      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                  <div className="mt-8 flex items-center gap-3 text-indigo-400 font-bold animate-pulse text-xl">
                      <Scan size={32} />
                      <span className="tracking-widest">ANALISANDO</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">Identificando padrões de escrita e critérios ENEM...</p>
                  <style>{`
                    @keyframes scan {
                        0% { top: 0%; }
                        50% { top: 100%; }
                        100% { top: 0%; }
                    }
                  `}</style>
              </div>
          </div>
      );
  }

  if (view === 'result' && currentResult) {
      const getScoreColor = (score: number) => {
          if (score >= 900) return 'text-emerald-400';
          if (score >= 700) return 'text-indigo-400';
          return 'text-yellow-400';
      };

      const getBarColor = (score: number) => {
          if (score >= 160) return 'bg-emerald-500';
          if (score >= 120) return 'bg-indigo-500';
          if (score >= 80) return 'bg-yellow-500';
          return 'bg-red-500';
      };

      return (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 pb-20">
              {renderNotification()}
              
              <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                      <Sparkles size={28} className="text-indigo-400" />
                      Análise da Redação
                  </h2>
                  <button onClick={() => { setView('home'); setImage(null); }} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-white">
                      <X size={24}/>
                  </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="space-y-6">
                      <div className="glass-card p-10 rounded-3xl text-center relative overflow-hidden border border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">Nota Geral</p>
                          <div className={`text-7xl font-black ${getScoreColor(displayScore)} mb-4`}>
                              {displayScore}
                          </div>
                          <div className="inline-block px-4 py-2 rounded-full bg-slate-900 border border-white/10 text-xs font-bold text-slate-300">
                              Data: {new Date(currentResult.date).toLocaleDateString()}
                          </div>
                      </div>

                      {/* Competencies Breakdown */}
                      <div className="space-y-3">
                          {Object.entries(currentResult.competencies).map(([key, score]) => {
                               const isOpen = expandedCompetency === key;
                               const Icon = COMPETENCY_ICONS[key] || PenTool;
                               return (
                                   <div key={key} className="glass-card rounded-2xl overflow-hidden transition-all duration-300 border border-white/5">
                                       <button 
                                        onClick={() => setExpandedCompetency(isOpen ? null : key)}
                                        className={`w-full p-4 flex items-center justify-between ${isOpen ? 'bg-indigo-600/10' : 'hover:bg-slate-800'}`}
                                       >
                                           <div className="flex items-center gap-3">
                                               <div className={`p-2 rounded-lg ${isOpen ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                   <Icon size={18} />
                                               </div>
                                               <span className="font-bold text-sm text-slate-200">{COMPETENCY_LABELS[key]}</span>
                                           </div>
                                           <div className="flex items-center gap-3">
                                               <span className={`font-black ${getScoreColor(score)}`}>{score}</span>
                                               <div className={`w-16 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5`}>
                                                   <div className={`h-full ${getBarColor(score)}`} style={{ width: `${(score/200)*100}%` }} />
                                               </div>
                                           </div>
                                       </button>
                                       {isOpen && currentResult.detailedCompetencies && (
                                           <div className="p-4 bg-slate-900/50 border-t border-white/5 text-sm text-slate-300 animate-in slide-in-from-top-2">
                                               {currentResult.detailedCompetencies[key]?.analysis || "Análise detalhada indisponível para esta competência."}
                                           </div>
                                       )}
                                   </div>
                               );
                          })}
                      </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                       <div className="glass-card p-8 rounded-3xl border border-white/5">
                           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                               <MessageSquareText size={20} className="text-indigo-400" /> Feedback Geral
                           </h3>
                           <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                               {currentResult.feedback}
                           </p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="glass-card p-6 rounded-3xl border border-emerald-500/10 bg-emerald-900/5">
                               <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                                   <ThumbsUp size={18} /> Pontos Fortes
                               </h3>
                               <ul className="space-y-2">
                                   {currentResult.strengths?.map((s, i) => (
                                       <li key={i} className="flex gap-2 text-sm text-emerald-200/80">
                                           <CheckCircle size={14} className="mt-1 shrink-0" /> {s}
                                       </li>
                                   ))}
                               </ul>
                           </div>

                           <div className="glass-card p-6 rounded-3xl border border-red-500/10 bg-red-900/5">
                               <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                                   <ThumbsDown size={18} /> Pontos de Atenção
                               </h3>
                               <ul className="space-y-2">
                                   {currentResult.weaknesses?.map((w, i) => (
                                       <li key={i} className="flex gap-2 text-sm text-red-200/80">
                                           <AlertTriangle size={14} className="mt-1 shrink-0" /> {w}
                                       </li>
                                   ))}
                               </ul>
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- DEFAULT VIEW (HOME) ---
  if (view === 'home') {
      return (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 pb-20">
              {renderNotification()}
              
              <div className="flex justify-between items-end">
                  <div>
                      <h2 className="text-3xl font-bold text-white mb-2">Correção de Redação</h2>
                      <p className="text-slate-400">Envie sua redação e receba uma correção detalhada em segundos.</p>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Créditos Disponíveis</p>
                          <p className="text-2xl font-black text-white">{user.essayCredits || 0}</p>
                      </div>
                      <button onClick={() => setView('buy')} className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-lg transition-all hover:scale-105">
                          <Plus size={24}/>
                      </button>
                  </div>
              </div>

              {history.length === 0 ? (
                  <div className="glass-card rounded-[2.5rem] p-12 text-center border-2 border-dashed border-white/10 flex flex-col items-center justify-center min-h-[400px]">
                      <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                          <FileText size={48} className="text-slate-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Nenhuma redação enviada</h3>
                      <p className="text-slate-500 max-w-md mx-auto mb-8">
                          Pratique sua escrita e receba feedback instantâneo da nossa IA treinada com os critérios do ENEM.
                      </p>
                      <button onClick={() => setView('upload')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-105 flex items-center gap-2">
                          <PenTool size={20} /> Nova Correção
                      </button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <button onClick={() => setView('upload')} className="glass-card rounded-3xl p-6 border-2 border-dashed border-indigo-500/30 flex flex-col items-center justify-center gap-4 text-indigo-400 hover:bg-indigo-500/10 transition-all group min-h-[200px]">
                          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Plus size={32} />
                          </div>
                          <span className="font-bold uppercase tracking-widest text-sm">Nova Correção</span>
                      </button>
                      
                      {history.map(item => (
                          <div key={item.id} onClick={() => handleSelectHistoryItem(item)} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group relative overflow-hidden">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="p-3 bg-slate-900 rounded-xl text-slate-300 group-hover:text-white transition-colors">
                                      <FileText size={24} />
                                  </div>
                                  <div className={`text-2xl font-black ${item.scoreTotal >= 900 ? 'text-emerald-400' : 'text-white'}`}>
                                      {item.scoreTotal}
                                  </div>
                              </div>
                              <h4 className="font-bold text-white line-clamp-2 mb-2 group-hover:text-indigo-300 transition-colors h-12">
                                  {item.theme}
                              </h4>
                              <p className="text-xs text-slate-500">
                                  {new Date(item.date).toLocaleDateString()}
                              </p>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  }

  // --- UPLOAD VIEW ---
  if (view === 'upload') {
      return (
          <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-8">
              {renderNotification()}
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
                        placeholder="Ex: Desafios para a valorização de comunidades e povos tradicionais no Brasil"
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
                              Ao enviar, <strong>1 crédito</strong> será debitado da sua conta. Esta ação não pode ser desfeita.
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

  // --- BUY VIEW ---
  if (view === 'buy') {
      return (
          <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-8">
              {renderNotification()}
              <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setView('home')} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                      <ArrowRight className="rotate-180" size={24} />
                  </button>
                  <h2 className="text-2xl font-bold text-white">Adquirir Créditos</h2>
              </div>

              {showPix ? (
                  <div className="glass-card p-8 rounded-[2rem] border border-white/10 text-center">
                      <h3 className="text-2xl font-bold text-white mb-6">Pagamento via PIX</h3>
                      
                      <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-xl">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48" />
                      </div>
                      
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex gap-2 mb-6">
                          <input readOnly value={pixPayload || ''} className="flex-1 bg-transparent text-slate-400 text-xs outline-none truncate" />
                          <button onClick={() => { navigator.clipboard.writeText(pixPayload || ''); setCopied(true); setNotification({type:'success', message:'Código copiado!'}); }} className="text-indigo-400 hover:text-white">
                              {copied ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                      </div>

                      <div className="bg-slate-900 p-4 rounded-xl border border-white/5 mb-6 text-left space-y-3">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase ml-1 flex items-center gap-1"><User size={12}/> Nome do Pagador</label>
                            <input 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm mt-1 focus:border-indigo-500 outline-none" 
                                placeholder="Nome completo do titular da conta" 
                                value={payerName}
                                onChange={e => setPayerName(e.target.value)}
                            />
                          </div>
                      </div>

                      <div className="flex gap-3">
                          <button onClick={() => setShowPix(false)} className="flex-1 py-4 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold text-sm">
                              Voltar
                          </button>
                          <button onClick={handleConfirmPayment} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                              <CheckCircle size={18} /> Já paguei
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="glass-card p-8 rounded-[2rem] border border-white/10 space-y-8">
                      {isBasicPlan && (
                          <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-6 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
                              <div>
                                  <h4 className="font-bold text-white flex items-center gap-2"><Crown size={18} className="text-yellow-400"/> Plano Basic Ativo</h4>
                                  <p className="text-indigo-200 text-xs mt-1 max-w-xs">Membros Advanced pagam 4x menos por correção.</p>
                              </div>
                              <button onClick={() => onShowUpgrade?.()} className="px-4 py-2 bg-white text-indigo-900 font-bold rounded-lg text-xs hover:scale-105 transition-transform">
                                  Virar Advanced
                              </button>
                          </div>
                      )}

                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-4 block">Quantidade de Redações</label>
                          <div className="grid grid-cols-3 gap-4">
                              {[1, 5, 10].map(qty => (
                                  <button 
                                    key={qty}
                                    onClick={() => setBuyQty(qty)}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${buyQty === qty ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                                  >
                                      <span className="text-2xl font-black">{qty}</span>
                                      <span className="text-[10px] uppercase font-bold">Redações</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="bg-slate-950 rounded-2xl p-6 border border-white/5 space-y-4">
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-400">Preço Unitário</span>
                              <span className="text-white font-bold">R$ {getPricePerUnit(buyQty).toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xl font-black text-white pt-4 border-t border-white/10">
                              <span>Total</span>
                              <span>R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-4 block">Forma de Pagamento</label>
                          <div className="grid grid-cols-2 gap-4">
                              <button 
                                onClick={() => setPaymentMethod('pix')}
                                className={`p-4 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${paymentMethod === 'pix' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                              >
                                  <QrCode size={18} /> PIX
                              </button>
                              <button 
                                onClick={() => setPaymentMethod('card')}
                                className={`p-4 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${paymentMethod === 'card' ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                              >
                                  <CreditCard size={18} /> Cartão
                              </button>
                          </div>
                      </div>

                      <button onClick={handleGeneratePayment} className="w-full py-4 bg-white text-slate-900 font-black rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02]">
                          <Wallet size={20} /> Ir para Pagamento
                      </button>
                  </div>
              )}
          </div>
      );
  }

  // Fallback
  return null;
};

export default Redacao;