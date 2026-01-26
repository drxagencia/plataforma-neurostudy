
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { PixService } from '../services/pixService';
import { auth } from '../services/firebaseConfig';
import { EssayCorrection, UserProfile } from '../types';
import { PenTool, CheckCircle, Wallet, Plus, Camera, Scan, FileText, X, AlertTriangle, QrCode, Copy, Check, UploadCloud, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!auth.currentUser) return;
    // We only fetch history here. Credits are from `user` prop.
    const essays = await DatabaseService.getEssayCorrections(auth.currentUser.uid);
    setHistory(essays.reverse());
  };

  const handleSelectHistoryItem = async (item: EssayCorrection) => {
      setLoadingDetails(true);
      // Fetch the full image only now
      if (item.id && !item.imageUrl) {
          const imgUrl = await DatabaseService.getEssayImage(item.id);
          if (imgUrl) item.imageUrl = imgUrl;
      }
      setCurrentResult(item);
      setLoadingDetails(false);
      setView('result');
  };

  // --- Pricing Logic ---
  const getPricePerUnit = (qty: number) => {
      if (qty >= 10) return 2.00;
      if (qty >= 5) return 2.40;
      return 3.00;
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
          alert("Erro ao gerar PIX");
      }
  };

  const handleConfirmPayment = async () => {
      if (!auth.currentUser) return;
      await DatabaseService.createRechargeRequest(auth.currentUser.uid, auth.currentUser.displayName || 'User', totalPrice, 'CREDIT', buyQty);
      alert("Solicitação enviada! Aguarde a aprovação dos créditos.");
      setShowPix(false);
      setView('home');
  };

  // --- Upload Handlers ---
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
      if (confirmText !== 'CONFIRMAR') {
          alert("Digite CONFIRMAR corretamente.");
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
          // Extract JSON from text (Gemini sometimes adds markdown blocks)
          let cleanJson = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          // Fix for TS error: explicit number conversion and variable assignment
          const c1 = Number(parsed.c1) || 0;
          const c2 = Number(parsed.c2) || 0;
          const c3 = Number(parsed.c3) || 0;
          const c4 = Number(parsed.c4) || 0;
          const c5 = Number(parsed.c5) || 0;
          const calculatedTotal = c1 + c2 + c3 + c4 + c5;
          const finalTotal = Number(parsed.total) || calculatedTotal;

          const result: EssayCorrection = {
              theme,
              imageUrl: image, // Kept in memory for immediate display
              date: Date.now(),
              scoreTotal: finalTotal,
              competencies: {
                  c1,
                  c2,
                  c3,
                  c4,
                  c5
              },
              feedback: parsed.feedback,
              errors: parsed.errors
          };

          await DatabaseService.saveEssayCorrection(auth.currentUser.uid, result);
          
          // Update local credits immediately
          onUpdateUser({
              ...user,
              essayCredits: Number(user.essayCredits || 0) - 1
          });

          setCurrentResult(result);
          setView('result');
          fetchHistory(); // Refresh list

      } catch (e: any) {
          alert(`Falha: ${e.message}`);
          setView('upload');
      }
  };

  // --- RENDERERS ---

  if (view === 'scanning') {
      return (
          <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
              {/* Fake scanning effect */}
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
                      {Object.entries(currentResult.competencies).map(([key, score], idx) => (
                          <div key={key} className="flex items-center gap-4">
                              <span className="text-xs font-bold text-slate-500 w-8 uppercase">{key}</span>
                              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{width: `${(score/200)*100}%`}} />
                              </div>
                              <span className="text-sm font-bold text-white w-8 text-right">{score}</span>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Feedback */}
              <div className="glass-card p-6 rounded-2xl">
                  <h3 className="font-bold text-white mb-2">Comentário Geral</h3>
                  <p className="text-slate-300 leading-relaxed">{currentResult.feedback}</p>
              </div>

              {/* Image Preview (If available) */}
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
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-20">
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
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right pb-20">
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
                  <X size={20} /> Voltar
              </button>

              <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Loja de Créditos</h2>
                  <p className="text-slate-400">Adquira correções profissionais com IA.</p>
              </div>

              {!showPix ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {/* Pricing Table */}
                      <div className="glass-card p-6 rounded-2xl space-y-4">
                          <h3 className="font-bold text-white flex items-center gap-2"><Wallet size={20} className="text-emerald-400"/> Tabela de Preços</h3>
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between p-3 bg-slate-900/50 rounded-lg">
                                  <span className="text-slate-300">1 a 4 créditos</span>
                                  <span className="font-bold text-white">R$ 3,00 / un</span>
                              </div>
                              <div className="flex justify-between p-3 bg-slate-900/50 rounded-lg border border-indigo-500/30">
                                  <span className="text-indigo-300">5 a 9 créditos</span>
                                  <span className="font-bold text-indigo-300">R$ 2,40 / un</span>
                              </div>
                              <div className="flex justify-between p-3 bg-slate-900/50 rounded-lg border border-emerald-500/30 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 bg-emerald-500 text-slate-900 text-[9px] font-bold px-2">MELHOR VALOR</div>
                                  <span className="text-emerald-300">10 ou + créditos</span>
                                  <span className="font-bold text-emerald-300">R$ 2,00 / un</span>
                              </div>
                          </div>
                      </div>

                      {/* Calculator */}
                      <div className="glass-card p-6 rounded-2xl border-indigo-500/30 bg-indigo-900/10">
                          <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Quantidade Desejada</label>
                          <div className="flex items-center gap-4 mb-6">
                              <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))} className="w-10 h-10 bg-slate-800 rounded-lg text-white font-bold hover:bg-slate-700">-</button>
                              <input 
                                type="number" 
                                value={buyQty} 
                                onChange={e => setBuyQty(Math.max(1, parseInt(e.target.value) || 0))}
                                className="flex-1 bg-slate-950 p-2 text-center text-2xl font-bold text-white rounded-lg outline-none"
                              />
                              <button onClick={() => setBuyQty(buyQty + 1)} className="w-10 h-10 bg-slate-800 rounded-lg text-white font-bold hover:bg-slate-700">+</button>
                          </div>

                          <div className="flex justify-between items-end mb-6 pt-4 border-t border-white/10">
                              <span className="text-sm text-slate-400">Total a Pagar</span>
                              <span className="text-3xl font-bold text-emerald-400">R$ {totalPrice.toFixed(2)}</span>
                          </div>

                          <button 
                            onClick={handleGeneratePix}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                              <QrCode size={20} /> Gerar PIX
                          </button>
                      </div>
                  </div>
              ) : (
                  // Pix Display
                  <div className="max-w-md mx-auto glass-card p-8 rounded-2xl text-center animate-in zoom-in-95">
                      <h3 className="text-xl font-bold text-white mb-6">Pagamento via PIX</h3>
                      <div className="bg-white p-4 rounded-xl inline-block mb-6">
                           <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload || '')}`} className="w-48 h-48 mix-blend-multiply" />
                      </div>
                      <div className="flex gap-2 mb-6">
                          <input readOnly value={pixPayload || ''} className="flex-1 bg-slate-900 rounded-lg px-3 text-xs text-slate-400 truncate" />
                          <button onClick={() => {navigator.clipboard.writeText(pixPayload || ''); setCopied(true);}} className="p-3 bg-slate-800 rounded-lg text-white">
                              {copied ? <Check size={18}/> : <Copy size={18}/>}
                          </button>
                      </div>
                      <button onClick={handleConfirmPayment} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">
                          Já realizei o pagamento
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
    <div className="space-y-8 animate-slide-up pb-20">
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
      <div className="relative overflow-hidden rounded-3xl glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-indigo-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]" />
          
          <div className="relative z-10 max-w-lg">
              <h3 className="text-2xl font-bold text-white mb-2">Envie sua redação agora</h3>
              <p className="text-slate-300 mb-6">
                  Tire uma foto nítida do seu texto manuscrito. Nossa IA analisa a caligrafia e corrige em segundos baseada nos critérios oficiais.
              </p>
              <button 
                onClick={() => {
                    if((user.essayCredits || 0) > 0) setView('upload');
                    else { alert("Sem créditos suficientes."); setView('buy'); }
                }}
                className="px-8 py-4 bg-white text-indigo-950 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-xl shadow-white/10"
              >
                  <Camera size={20} /> Corrigir Minha Redação
              </button>
          </div>
          <div className="relative z-10 bg-slate-950 p-4 rounded-2xl border border-white/10 rotate-3 shadow-2xl">
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
