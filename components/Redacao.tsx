
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { auth } from '../services/firebaseConfig';
import { EssayCorrection, UserProfile } from '../types';
import { PenTool, CheckCircle, Wallet, Plus, Camera, Scan, FileText, X, AlertTriangle, QrCode, Copy, Check, UploadCloud, Loader2, Sparkles, TrendingDown, ArrowRight, AlertCircle, MessageSquareText } from 'lucide-react';

interface RedacaoProps {
    user: UserProfile;
    onUpdateUser: (u: UserProfile) => void;
}

const Redacao: React.FC<RedacaoProps> = ({ user, onUpdateUser }) => {
  const [history, setHistory] = useState<EssayCorrection[]>([]);
  
  // Views
  const [view, setView] = useState<'home' | 'buy' | 'upload' | 'scanning' | 'result'>('home');
  
  // Buy Flow
  const [buyQty, setBuyQty] = useState<number>(1);
  const [showPix, setShowPix] = useState(false);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Upload Flow
  const [theme, setTheme] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [currentResult, setCurrentResult] = useState<EssayCorrection | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Competency Detail State
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Auto-dismiss notification
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
      if (item.id && !item.imageUrl) {
          const imgUrl = await DatabaseService.getEssayImage(item.id);
          if (imgUrl) item.imageUrl = imgUrl;
      }
      setCurrentResult(item);
      setExpandedCompetency(null);
      setLoadingDetails(false);
      setView('result');
  };

  // --- Pricing Logic ---
  const getPricePerUnit = (qty: number) => {
      if (qty >= 10) return 3.50;
      if (qty >= 5) return 3.75;
      return 4.00;
  };

  const totalPrice = buyQty * getPricePerUnit(buyQty);

  // --- Payment Handlers ---
  const handleGeneratePix = () => {
      if (buyQty < 1) return;
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
      await DatabaseService.createRechargeRequest(auth.currentUser.uid, auth.currentUser.displayName || 'User', totalPrice, 'CREDIT', buyQty);
      setNotification({ type: 'success', message: "Solicitação enviada! Aguarde a aprovação." });
      setShowPix(false);
      setView('home');
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
      // 1. Credit Check
      const availableCredits = typeof user.essayCredits === 'number' ? user.essayCredits : 0;
      if (availableCredits <= 0) {
          setNotification({ type: 'error', message: "Sem créditos suficientes para enviar a redação." });
          // Optional: redirect to buy screen after delay?
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

          // Parse new structure (Object with score & comment)
          // Helper to safely extract number
          const parseScore = (val: any) => {
            const num = Number(val?.score ?? val);
            return isNaN(num) ? 0 : num;
          };

          const c1 = parseScore(parsed.c1);
          const c2 = parseScore(parsed.c2);
          const c3 = parseScore(parsed.c3);
          const c4 = parseScore(parsed.c4);
          const c5 = parseScore(parsed.c5);
          
          const calculatedTotal = c1 + c2 + c3 + c4 + c5;
          const finalTotal = Number(parsed.total) || calculatedTotal;

          const result: EssayCorrection = {
              theme,
              imageUrl: image,
              date: Date.now(),
              scoreTotal: finalTotal,
              competencies: { c1, c2, c3, c4, c5 },
              competencyFeedback: {
                  c1: parsed.c1?.comment || "Sem comentário.",
                  c2: parsed.c2?.comment || "Sem comentário.",
                  c3: parsed.c3?.comment || "Sem comentário.",
                  c4: parsed.c4?.comment || "Sem comentário.",
                  c5: parsed.c5?.comment || "Sem comentário."
              },
              feedback: parsed.feedback,
              errors: parsed.errors
          };

          await DatabaseService.saveEssayCorrection(auth.currentUser.uid, result);
          
          const currentCredits = typeof user.essayCredits === 'number' ? user.essayCredits : 0;
          onUpdateUser({
              ...user,
              essayCredits: Math.max(0, Number(currentCredits) - 1)
          });

          setCurrentResult(result);
          setExpandedCompetency(null);
          setView('result');
          fetchHistory();

      } catch (e: any) {
          setNotification({ type: 'error', message: `Falha: ${e.message}` });
          setView('upload');
      }
  };

  // --- RENDERERS ---

  // NOTIFICATION TOAST
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
                  <div className="relative w-64 h-80 border-2 border-indigo-500 rounded-lg overflow-hidden bg-white/5">
                      {image && <img src={image} className="w-full h-full object-cover opacity-50" />}
                      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                  <div className="mt-8 flex items-center gap-3 text-indigo-400 font-bold animate-pulse">
                      <Scan size={24} />
                      Analisando Manuscrito...
                  </div>
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
      return (
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 pb-20">
              {renderNotification()}
              <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => setView('home')} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                  <h2 className="text-2xl font-bold text-white">Correção Finalizada</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Score Card */}
                  <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center bg-indigo-900/20 border-indigo-500/30">
                      <p className="text-slate-400 uppercase font-bold text-xs tracking-wider">Nota Total</p>
                      <p className="text-6xl font-black text-white mt-2 mb-2">{currentResult.scoreTotal}</p>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${currentResult.scoreTotal >= 900 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                          {currentResult.scoreTotal >= 900 ? 'EXCELENTE' : 'BOM'}
                      </div>
                  </div>

                  {/* Competencies */}
                  <div className="md:col-span-2 glass-card p-6 rounded-2xl space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-2"><FileText size={18} /> Competências ENEM</h3>
                      {Object.entries(currentResult.competencies).map(([key, score]) => {
                          const feedbackText = currentResult.competencyFeedback ? (currentResult.competencyFeedback as any)[key] : null;
                          const isExpanded = expandedCompetency === key;

                          return (
                          <div key={key} className="flex flex-col">
                              <div className="flex items-center gap-4">
                                  <span className="text-xs font-bold text-slate-500 w-8 uppercase">{key}</span>
                                  <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500" style={{width: `${(score/200)*100}%`}} />
                                  </div>
                                  <span className="text-sm font-bold text-white w-8 text-right">{score}</span>
                                  
                                  {/* Info Icon Button */}
                                  {feedbackText && (
                                    <button 
                                        onClick={() => setExpandedCompetency(isExpanded ? null : key)}
                                        className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-white/10 hover:text-indigo-400'}`}
                                        title="Ver explicação da nota"
                                    >
                                        <MessageSquareText size={16} />
                                    </button>
                                  )}
                              </div>
                              
                              {/* Expandable Feedback */}
                              {isExpanded && feedbackText && (
                                  <div className="mt-3 ml-12 p-3 bg-indigo-900/20 border border-indigo-500/20 rounded-xl rounded-tl-none animate-in slide-in-from-top-2 fade-in duration-300">
                                      <div className="flex items-start gap-2">
                                          <Sparkles size={14} className="text-indigo-400 mt-1 flex-shrink-0" />
                                          <p className="text-sm text-slate-300 italic">"{feedbackText}"</p>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )})}
                  </div>
              </div>

              {/* Feedback */}
              <div className="glass-card p-6 rounded-2xl">
                  <h3 className="font-bold text-white mb-2">Comentário Geral</h3>
                  <p className="text-slate-300 leading-relaxed">{currentResult.feedback}</p>
              </div>

              {/* Image Preview */}
              {currentResult.imageUrl && (
                  <div className="glass-card p-4 rounded-xl">
                      <h3 className="font-bold text-white mb-4 text-sm">Imagem Enviada</h3>
                      <img src={currentResult.imageUrl} className="w-full max-h-96 object-contain rounded-lg border border-white/5" />
                  </div>
              )}

              {/* Errors */}
              <div className="glass-card p-6 rounded-2xl border-red-500/20 bg-red-900/5">
                  <h3 className="font-bold text-red-300 mb-4 flex items-center gap-2"><AlertTriangle size={18} /> Pontos de Atenção</h3>
                  <ul className="space-y-2">
                      {currentResult.errors.map((err, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                              <span className="text-red-500 mt-1">•</span> {err}
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
      );
  }

  if (view === 'upload') {
      return (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-20 relative">
              {renderNotification()}
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
                  <X size={20} /> Cancelar
              </button>

              <h2 className="text-2xl font-bold text-white">Enviar Redação</h2>
              
              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Tema da Redação</label>
                      <input 
                        className="w-full glass-input p-3 rounded-xl text-white" 
                        placeholder="Ex: Desafios para a valorização de comunidades..." 
                        value={theme}
                        onChange={e => setTheme(e.target.value)}
                      />
                  </div>

                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {image ? (
                          <img src={image} className="max-h-64 rounded-lg shadow-lg" />
                      ) : (
                          <>
                            <UploadCloud size={40} className="text-indigo-500 mb-2" />
                            <p className="font-bold text-white">Clique para enviar foto</p>
                            <p className="text-xs text-slate-500">A imagem deve estar nítida e iluminada.</p>
                          </>
                      )}
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                      <label className="text-xs text-yellow-200 font-bold uppercase mb-1 block">Confirmação de Segurança</label>
                      <p className="text-xs text-yellow-500/80 mb-2">Ao confirmar, 1 crédito será descontado. Essa ação é irreversível.</p>
                      <input 
                        className="w-full bg-slate-900 border border-yellow-500/30 p-2 rounded-lg text-white text-sm placeholder:text-slate-600" 
                        placeholder="Digite CONFIRMAR"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                      />
                  </div>

                  <button 
                    onClick={handleCorrectionSubmit}
                    disabled={!image || !theme || confirmText !== 'CONFIRMAR'}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all"
                  >
                      Confirmar Envio (1 Crédito)
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'buy') {
      return (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right pb-20 relative">
              {renderNotification()}
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
                  <X size={20} /> Voltar
              </button>

              <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Pacotes de Correção</h2>
                  <p className="text-slate-400">Escolha a quantidade ideal para sua rotina de estudos.</p>
              </div>

              {!showPix ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                      {/* Left: Pricing Tiers Visualization */}
                      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Tier 1 */}
                          <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/20 transition-all">
                              <div>
                                <h3 className="font-bold text-white text-lg">Básico</h3>
                                <p className="text-slate-400 text-xs mt-1">Para correções pontuais.</p>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-white">R$ 4,00</span>
                                    <span className="text-slate-500 text-sm"> /un</span>
                                </div>
                              </div>
                              <div className="mt-6 pt-4 border-t border-white/5">
                                  <p className="text-xs text-slate-400">Ao comprar 1 a 4 créditos</p>
                              </div>
                          </div>

                          {/* Tier 2 */}
                          <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 flex flex-col justify-between bg-indigo-900/5 hover:bg-indigo-900/10 transition-all relative overflow-hidden">
                              <div>
                                <h3 className="font-bold text-indigo-300 text-lg">Intermediário</h3>
                                <p className="text-slate-400 text-xs mt-1">Foco e constância.</p>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-white">R$ 3,75</span>
                                    <span className="text-slate-500 text-sm"> /un</span>
                                </div>
                              </div>
                              <div className="mt-6 pt-4 border-t border-white/5">
                                  <p className="text-xs text-indigo-300 font-bold">Ao comprar 5 a 9 créditos</p>
                              </div>
                          </div>

                          {/* Tier 3 (Best Value) */}
                          <div className="glass-card p-6 rounded-2xl border border-emerald-500/50 flex flex-col justify-between bg-emerald-900/10 hover:bg-emerald-900/20 transition-all relative shadow-lg shadow-emerald-900/20">
                              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl">MELHOR PREÇO</div>
                              <div>
                                <h3 className="font-bold text-emerald-400 text-lg">Pro</h3>
                                <p className="text-slate-300 text-xs mt-1">Intensivo reta final.</p>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-white">R$ 3,50</span>
                                    <span className="text-slate-500 text-sm"> /un</span>
                                </div>
                              </div>
                              <div className="mt-6 pt-4 border-t border-white/5">
                                  <p className="text-xs text-emerald-400 font-bold">Ao comprar 10+ créditos</p>
                              </div>
                          </div>
                      </div>

                      {/* Right: Interactive Calculator */}
                      <div className="glass-card p-8 rounded-3xl border-t-4 border-t-indigo-500 bg-slate-900/80 shadow-2xl">
                          <label className="text-xs text-slate-400 font-bold uppercase mb-4 block tracking-wider">Calculadora de Investimento</label>
                          
                          <div className="flex items-center gap-2 mb-8">
                              <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))} className="w-12 h-12 bg-slate-800 rounded-xl text-white font-bold hover:bg-slate-700 transition-colors text-xl">-</button>
                              <div className="flex-1 text-center">
                                  <input 
                                    type="number" 
                                    value={buyQty} 
                                    onChange={e => setBuyQty(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="w-full bg-transparent text-center text-4xl font-black text-white outline-none"
                                  />
                                  <p className="text-xs text-slate-500 mt-1 uppercase">Créditos</p>
                              </div>
                              <button onClick={() => setBuyQty(buyQty + 1)} className="w-12 h-12 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition-colors text-xl">+</button>
                          </div>

                          <div className="space-y-4 mb-8">
                              <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-400">Preço Unitário</span>
                                  <span className="text-white font-medium">R$ {getPricePerUnit(buyQty).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                  <span className="text-slate-300 font-bold">Total</span>
                                  <span className="text-3xl font-black text-emerald-400">R$ {totalPrice.toFixed(2)}</span>
                              </div>
                          </div>

                          <button 
                            onClick={handleGeneratePix}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02]"
                          >
                              <QrCode size={20} /> Gerar Pagamento PIX
                          </button>
                          <p className="text-center text-[10px] text-slate-500 mt-4">Liberação automática após verificação.</p>
                      </div>
                  </div>
              ) : (
                  // Pix Display
                  <div className="max-w-md mx-auto glass-card p-8 rounded-2xl text-center animate-in zoom-in-95 relative border border-emerald-500/20 shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                      <h3 className="text-2xl font-bold text-white mb-2">Pagamento via PIX</h3>
                      <p className="text-slate-400 text-sm mb-6">Escaneie o QR Code ou copie o código abaixo.</p>
                      
                      <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-inner">
                           <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48 mix-blend-multiply" />
                      </div>
                      
                      <div className="flex gap-2 mb-8">
                          <input readOnly value={pixPayload || ''} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 text-xs text-slate-400 truncate" />
                          <button onClick={() => {navigator.clipboard.writeText(pixPayload || ''); setCopied(true);}} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors">
                              {copied ? <Check size={18} className="text-emerald-400"/> : <Copy size={18}/>}
                          </button>
                      </div>
                      
                      <button onClick={handleConfirmPayment} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                          <CheckCircle size={20} /> Já realizei o pagamento
                      </button>
                  </div>
              )}
          </div>
      );
  }

  if (loadingDetails) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500" /></div>;
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
        </div>
      </div>

      {/* Action Card */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-indigo-500/30 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] group-hover:bg-indigo-600/30 transition-all duration-700" />
          
          <div className="relative z-10 max-w-lg">
              <h3 className="text-2xl font-bold text-white mb-2">Envie sua redação agora</h3>
              <p className="text-slate-300 mb-6">
                  Tire uma foto nítida do seu texto manuscrito. Nossa IA analisa a caligrafia e corrige em segundos baseada nos critérios oficiais.
              </p>
              <button 
                onClick={() => {
                    if((user.essayCredits || 0) > 0) setView('upload');
                    else { 
                        setNotification({type: 'error', message: 'Sem créditos suficientes.'});
                        setTimeout(() => setView('buy'), 1000); 
                    }
                }}
                className="px-8 py-4 bg-white text-indigo-950 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-xl shadow-white/10"
              >
                  <Camera size={20} /> Corrigir Minha Redação
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

      {/* History */}
      <div>
          <h3 className="text-xl font-bold text-white mb-4">Histórico de Correções</h3>
          <div className="space-y-3">
              {history.map((item, idx) => (
                  <div key={idx} onClick={() => handleSelectHistoryItem(item)} className="glass-card p-4 rounded-xl flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition-all border border-white/5 hover:border-indigo-500/30">
                      <div>
                          <p className="font-bold text-white truncate max-w-[200px] md:max-w-md">{item.theme}</p>
                          <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <span className={`text-lg font-bold ${item.scoreTotal >= 900 ? 'text-emerald-400' : 'text-white'}`}>{item.scoreTotal}</span>
                          <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                              <FileText size={18} />
                          </div>
                      </div>
                  </div>
              ))}
              {history.length === 0 && <p className="text-slate-500 text-center py-8">Nenhuma redação enviada.</p>}
          </div>
      </div>
    </div>
  );
};

export default Redacao;
