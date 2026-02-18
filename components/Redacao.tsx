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
  const [copied, setCopied] = useState(false);
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
      
      const finalName = payerName.trim() || user.displayName || 'Aluno';

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
                          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest relative z-10">Nota Final</p>
                          <div className={`text-8xl font-black mt-4 mb-2 tracking-tighter relative z-10 ${getScoreColor(currentResult.scoreTotal)}`}>
                              {displayScore}
                          </div>
                          <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase relative z-10 bg-slate-950/50 border border-white/10 ${currentResult.scoreTotal >= 900 ? 'text-emerald-300' : 'text-slate-300'}`}>
                              {currentResult.scoreTotal >= 900 ? 'Excelente' : currentResult.scoreTotal >= 700 ? 'Muito Bom' : 'Em Evolução'}
                          </div>
                      </div>
                      {!currentResult.imageUrl && (
                          <div className="bg-slate-900/50 border border-white/10 p-4 rounded-xl text-center">
                              <p className="text-xs text-slate-500">A imagem da redação não é salva para otimizar o sistema. Apenas a análise permanece no histórico.</p>
                          </div>
                      )}
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                      <div className="space-y-4">
                          {['c1', 'c2', 'c3', 'c4', 'c5'].map((key) => {
                              const score = currentResult.competencies[key as keyof typeof currentResult.competencies];
                              const details = currentResult.detailedCompetencies ? currentResult.detailedCompetencies[key as keyof typeof currentResult.detailedCompetencies] : null;
                              const isExpanded = expandedCompetency === key;
                              const Icon = COMPETENCY_ICONS[key];

                              return (
                                  <div key={key} className={`glass-card rounded-2xl transition-all duration-300 border ${isExpanded ? 'border-indigo-500/40 bg-indigo-900/10' : 'border-white/5 hover:bg-white/5'}`}>
                                      <div 
                                        onClick={() => setExpandedCompetency(isExpanded ? null : key)}
                                        className="p-5 flex items-center gap-4 cursor-pointer"
                                      >
                                          <div className={`p-3 rounded-xl ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                              <Icon size={20} />
                                          </div>
                                          <div className="flex-1">
                                              <div className="flex justify-between items-center mb-1">
                                                  <h4 className={`font-bold text-sm uppercase ${isExpanded ? 'text-white' : 'text-slate-300'}`}>{COMPETENCY_LABELS[key]}</h4>
                                                  <span className={`font-mono font-bold text-lg ${score >= 160 ? 'text-emerald-400' : score >= 120 ? 'text-indigo-300' : 'text-yellow-400'}`}>{score} <span className="text-slate-600 text-xs">/ 200</span></span>
                                              </div>
                                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                                                  <div className={`h-full ${getBarColor(score)} transition-all duration-1000`} style={{width: `${(score/200)*100}%`}} />
                                              </div>
                                          </div>
                                          <ChevronRight size={20} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                      </div>
                                      {isExpanded && (
                                          <div className="px-5 pb-6 pt-0 border-t border-white/5 animate-in fade-in slide-in-from-top-1">
                                              <div className="mt-4 mb-4">
                                                  <p className="text-slate-200 leading-relaxed text-sm">
                                                      {details?.analysis || "Sem análise detalhada."}
                                                  </p>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                      <div className="glass-card p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/10">
                          <h3 className="font-bold text-white mb-3 text-lg">Parecer Geral</h3>
                          <p className="text-slate-300 leading-relaxed text-sm italic">"{currentResult.feedback}"</p>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- HOME VIEW ---
  return (
    <div className="space-y-8 animate-slide-up pb-20 relative">
      {renderNotification()}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Correção de Redação</h2>
          <p className="text-slate-400">IA treinada nas competências do ENEM.</p>
        </div>
        <div className="flex items-center gap-4">
             {isBasicPlan ? (
                 <div className="bg-slate-900 px-4 py-2 rounded-xl border border-yellow-500/20 flex items-center gap-3 animate-pulse-slow">
                     <div className="flex flex-col items-end">
                         <span className="text-[10px] text-yellow-500 uppercase font-bold flex items-center gap-1"><Lock size={12}/> Recurso Advanced</span>
                     </div>
                 </div>
             ) : (
                 <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                     <div className="flex flex-col items-end">
                         <span className="text-[10px] text-slate-500 uppercase font-bold">Seus Créditos</span>
                         <span className="text-xl font-bold text-white">{user.essayCredits || 0}</span>
                     </div>
                     <div className="h-8 w-[1px] bg-white/10" />
                     <button onClick={() => setView('buy')} className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all" title="Comprar Créditos">
                         <Plus size={20} />
                     </button>
                 </div>
             )}
        </div>
      </div>
      
      <div className="relative overflow-hidden rounded-3xl glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-indigo-500/30 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] group-hover:bg-indigo-600/30 transition-all duration-700" />
          
          <div className="relative z-10 max-w-lg">
              <h3 className="text-2xl font-bold text-white mb-2">Envie sua redação agora</h3>
              <p className="text-slate-300 mb-6">
                  Tire uma foto nítida do seu texto manuscrito. Nossa IA analisa a caligrafia e corrige em segundos. <span className="text-xs text-yellow-400 block mt-1">*A imagem é processada e descartada instantaneamente para sua segurança.</span>
              </p>
              <button 
                onClick={() => {
                    if (isBasicPlan) {
                        onShowUpgrade?.();
                        return;
                    }
                    if((user.essayCredits || 0) > 0) setView('upload');
                    else { 
                        setNotification({type: 'error', message: 'Sem créditos suficientes.'});
                        setTimeout(() => setView('buy'), 1000); 
                    }
                }}
                className="px-8 py-4 bg-white text-indigo-950 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-xl shadow-white/10"
              >
                  {isBasicPlan ? <Lock size={20} /> : <Camera size={20} />} {isBasicPlan ? 'Desbloquear Correção' : 'Corrigir Minha Redação'}
              </button>
          </div>
          <div className="relative z-10 bg-slate-950 p-4 rounded-2xl border border-white/10 rotate-3 shadow-2xl group-hover:rotate-6 transition-transform duration-500">
              <div className="w-48 h-64 bg-slate-900 rounded-lg flex flex-col gap-2 p-4 opacity-50">
                  <div className="w-full h-2 bg-slate-800 rounded" />
                  <div className="w-3/4 h-2 bg-slate-800 rounded" />
                  <div className="w-full h-2 bg-slate-800 rounded" />
                  <div className="w-full h-32 bg-slate-800 rounded mt-2" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle size={48} className="text-emerald-500 drop-shadow-lg" />
              </div>
          </div>
      </div>

      <div>
          <h3 className="text-xl font-bold text-white mb-4">Histórico de Correções</h3>
          <div className="space-y-3">
              {history.map((item, idx) => (
                  <div key={idx} onClick={() => handleSelectHistoryItem(item)} className="glass-card p-4 rounded-xl flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition-all border border-white/5 hover:border-indigo-500/30 group">
                      <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 ${item.scoreTotal >= 900 ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-300'}`}>
                              {item.scoreTotal}
                          </div>
                          <div>
                              <p className="font-bold text-white truncate max-w-[150px] md:max-w-md group-hover:text-indigo-200 transition-colors">{item.theme}</p>
                              <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
                          </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
                  </div>
              ))}
              {history.length === 0 && <p className="text-slate-500 text-center py-8">Nenhuma redação enviada.</p>}
          </div>
      </div>
    </div>
  );
};

export default Redacao;