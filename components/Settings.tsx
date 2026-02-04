
import React, { useState, useEffect } from 'react';
import { UserProfile, PlanConfig } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { PixService } from '../services/pixService';
import { Save, Loader2, CheckCircle, Moon, Sun, Palette, Trophy, Shield, Star, Lock, RefreshCw, User, CreditCard, Zap, ArrowUpCircle, QrCode, Copy, Check } from 'lucide-react';
import { RANKS, getRank, getNextRank, KIRVANO_LINKS } from '../constants';

interface SettingsProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(user.theme || 'dark');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Plan Config & Upgrade State
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null);
  const [upgradeMode, setUpgradeMode] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<'intermediate' | 'advanced'>('advanced');
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<'pix' | 'card'>('pix');
  const [upgradePixPayload, setUpgradePixPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Rank Data
  const currentRank = getRank(user.xp || 0);
  const nextRank = getNextRank(user.xp || 0);
  const progressPercent = nextRank 
    ? ((user.xp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)) * 100 
    : 100;

  useEffect(() => {
    setDisplayName(user.displayName);
    setPhotoURL(user.photoURL || '');
    const theme = user.theme === 'light' ? 'light' : 'dark';
    setSelectedTheme(theme);
    
    // Fetch Plan Config for upgrades
    DatabaseService.getPlanConfig().then(setPlanConfig);
  }, [user]);

  const handleThemeChange = (theme: 'dark' | 'light') => {
      if (theme === 'light') return; // Locked to dark for now
      setSelectedTheme(theme);
      const root = document.documentElement;
      root.classList.remove('light');
      root.classList.remove('dark');
      root.classList.add(theme);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    try {
      if (photoURL && photoURL.startsWith('data:')) {
          alert("Erro de segurança: Imagens pesadas não permitidas. Gere um novo avatar.");
          setIsSaving(false);
          return;
      }
      const authUpdates: { displayName?: string; photoURL?: string } = { displayName };
      if (photoURL) authUpdates.photoURL = photoURL;

      const updatedAuthUser = await AuthService.updateProfile(user, authUpdates);
      await DatabaseService.saveUserProfile(user.uid, {
        displayName,
        photoURL,
        theme: 'dark'
      });

      const updatedProfile: UserProfile = { ...user, ...updatedAuthUser, photoURL, theme: 'dark' };
      onUpdateUser(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to update", e);
      alert("Erro ao salvar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAvatar = () => {
      const randomColor = Math.floor(Math.random()*16777215).toString(16);
      const newUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${randomColor}&color=fff&size=128&bold=true`;
      setPhotoURL(newUrl);
  };

  // --- UPGRADE CALCULATIONS ---
  const calculateUpgradeCost = () => {
      if (!planConfig) return 0;
      const currentPrice = planConfig.prices[user.plan as keyof typeof planConfig.prices] || 0;
      const targetPrice = planConfig.prices[upgradeTarget];
      
      // If user pays via PIX, we charge only the difference
      const diff = Math.max(0, targetPrice - currentPrice);
      return diff;
  };

  const handleUpgradeAction = () => {
      const cost = calculateUpgradeCost();
      const targetPrice = planConfig?.prices[upgradeTarget] || 0;

      if (upgradePaymentMethod === 'card') {
          // Card: User pays full price (system refunds diff later manually as per requirements)
          // Or strictly speaking, we just send them to checkout.
          const link = user.billingCycle === 'yearly' ? KIRVANO_LINKS.upgrade_yearly : KIRVANO_LINKS.upgrade_monthly;
          window.open(link, '_blank');
          return;
      }

      // PIX: Generate payload for difference
      try {
          const payload = PixService.generatePayload(cost);
          setUpgradePixPayload(payload);
          setCopied(false);
      } catch (e) {
          alert("Erro ao gerar PIX.");
      }
  };

  const handleConfirmUpgradePix = async () => {
      const cost = calculateUpgradeCost();
      // Create request
      await DatabaseService.createRechargeRequest(
          user.uid,
          user.displayName,
          cost,
          'BRL',
          undefined,
          `UPGRADE: ${user.plan} -> ${upgradeTarget}`
      );
      alert("Solicitação de Upgrade enviada! Aguarde a liberação.");
      setUpgradePixPayload(null);
      setUpgradeMode(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Ajustes da Conta</h2>
        <p className="text-slate-400">Gerencie suas informações pessoais, aparência e progresso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: EDIT PROFILE */}
          <div className="space-y-8">
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 space-y-8 h-fit">
                {/* Profile Picture */}
                <div className="flex flex-col items-center gap-6">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 shadow-xl relative">
                      {photoURL ? (
                        <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-500">{displayName.charAt(0)}</div>
                      )}
                  </div>
                  <button onClick={handleGenerateAvatar} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/10 transition-colors">
                      <RefreshCw size={14} /> Gerar Novo
                  </button>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Nome de Exibição</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Theme Section */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <span className="text-sm font-medium text-slate-300 flex items-center gap-2"><Palette size={16}/> Tema da Interface</span>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleThemeChange('dark')} className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-3 bg-slate-950 border-indigo-500 text-indigo-400`}>
                            <div className="w-8 h-8 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center"><Moon size={16} /></div>
                            <span>Dark Mode</span>
                        </button>
                        <button disabled={true} className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-3 bg-slate-900 border-transparent text-slate-600 opacity-50 cursor-not-allowed`}>
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center text-orange-500 opacity-50"><Sun size={16} /></div>
                            <span>White Mode</span>
                        </button>
                    </div>
                </div>

                <div className="pt-6 flex items-center gap-4">
                  <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium w-full justify-center disabled:opacity-50 ${success ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle size={20} /> : <Save size={20} />}
                    {success ? 'Salvo!' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>

              {/* PLAN MANAGEMENT & UPGRADE */}
              <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/20 rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <CreditCard size={20} className="text-indigo-400" /> Seu Plano
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-white/5 mb-6 relative z-10">
                      <div>
                          <p className="text-xs text-slate-400 uppercase font-bold">Plano Atual</p>
                          <p className="text-2xl font-black text-white capitalize">{user.plan === 'advanced' ? 'Advanced (Pro)' : user.plan}</p>
                      </div>
                      {user.plan === 'basic' && <div className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full">Básico</div>}
                      {user.plan === 'advanced' && <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">VIP</div>}
                  </div>

                  {user.plan !== 'advanced' && user.plan !== 'admin' && (
                      <div className="space-y-4">
                          <button 
                            onClick={() => setUpgradeMode(!upgradeMode)}
                            className="w-full py-3 bg-white text-indigo-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-lg"
                          >
                              <ArrowUpCircle size={20} /> Fazer Upgrade
                          </button>

                          {upgradeMode && planConfig && (
                              <div className="animate-in slide-in-from-top-2 pt-4 border-t border-white/5">
                                  <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Selecione o novo plano</label>
                                  <div className="flex gap-2 mb-4">
                                      {user.plan === 'basic' && (
                                          <button 
                                            onClick={() => setUpgradeTarget('intermediate')}
                                            className={`flex-1 p-3 rounded-lg border text-sm font-bold transition-all ${upgradeTarget === 'intermediate' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                          >
                                              Intermediário
                                          </button>
                                      )}
                                      <button 
                                        onClick={() => setUpgradeTarget('advanced')}
                                        className={`flex-1 p-3 rounded-lg border text-sm font-bold transition-all ${upgradeTarget === 'advanced' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                      >
                                          Avançado
                                      </button>
                                  </div>

                                  <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Forma de Pagamento</label>
                                  <div className="flex gap-2 mb-6">
                                      <button onClick={() => { setUpgradePaymentMethod('pix'); setUpgradePixPayload(null); }} className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${upgradePaymentMethod === 'pix' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}><QrCode size={16}/> PIX (Só a diferença)</button>
                                      <button onClick={() => { setUpgradePaymentMethod('card'); setUpgradePixPayload(null); }} className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${upgradePaymentMethod === 'card' ? 'bg-indigo-900/30 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}><CreditCard size={16}/> Cartão</button>
                                  </div>

                                  <div className="bg-slate-900 p-4 rounded-xl text-center mb-4 border border-white/5">
                                      <p className="text-slate-400 text-xs uppercase mb-1">Valor a Pagar</p>
                                      <p className="text-3xl font-black text-white">
                                          R$ {upgradePaymentMethod === 'pix' ? calculateUpgradeCost().toFixed(2) : planConfig.prices[upgradeTarget].toFixed(2)}
                                      </p>
                                      {upgradePaymentMethod === 'pix' && <p className="text-[10px] text-emerald-400 mt-1">Desconto do que você já pagou aplicado!</p>}
                                      {upgradePaymentMethod === 'card' && <p className="text-[10px] text-slate-500 mt-1">Valor integral (diferença estornada após confirmação)</p>}
                                  </div>

                                  {!upgradePixPayload ? (
                                      <button onClick={handleUpgradeAction} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all">
                                          {upgradePaymentMethod === 'card' ? 'Ir para Pagamento' : 'Gerar QR Code'}
                                      </button>
                                  ) : (
                                      <div className="text-center animate-in zoom-in-95">
                                          <div className="bg-white p-2 rounded-xl inline-block mb-4"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upgradePixPayload)}`} className="w-32 h-32 mix-blend-multiply"/></div>
                                          <div className="flex gap-2 mb-4">
                                              <input readOnly value={upgradePixPayload} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-400 truncate" />
                                              <button onClick={() => {navigator.clipboard.writeText(upgradePixPayload); setCopied(true);}} className="p-2 bg-slate-800 rounded-lg text-white">{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
                                          </div>
                                          <button onClick={handleConfirmUpgradePix} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">Já paguei</button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT: RANK SYSTEM */}
          <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl relative overflow-hidden bg-slate-900/80 border border-white/10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                  <div className="flex justify-between items-end mb-4 relative z-10">
                      <div><p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Rank Atual</p><h3 className={`text-3xl font-black ${currentRank.colorClass}`}>{currentRank.name}</h3></div>
                      <div className="text-right"><p className="text-white font-mono font-bold text-xl">{user.xp || 0} XP</p></div>
                  </div>
                  {nextRank ? (
                      <div className="space-y-2 relative z-10">
                          <div className="flex justify-between text-xs text-slate-400 font-medium"><span>Progresso</span><span>Faltam {nextRank.minXp - (user.xp || 0)} XP</span></div>
                          <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} /></div>
                          <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest mt-2">Próximo Rank: {nextRank.name}</p>
                      </div>
                  ) : (<div className="text-center py-2 relative z-10"><span className="text-yellow-400 font-bold flex items-center justify-center gap-2"><Trophy size={16}/> Nível Máximo Alcançado</span></div>)}
              </div>

              {/* Rank List */}
              <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col max-h-[500px]">
                  <div className="p-4 bg-slate-900/50 border-b border-white/5"><h4 className="font-bold text-white flex items-center gap-2"><Shield size={18}/> Hierarquia da Plataforma</h4></div>
                  <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {RANKS.map((rank, idx) => {
                          const isUnlocked = (user.xp || 0) >= rank.minXp;
                          const isNext = !isUnlocked && (idx > 0 && (user.xp || 0) >= RANKS[idx-1].minXp);
                          return (
                              <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isUnlocked ? 'bg-slate-800/40 border-white/5 opacity-100' : isNext ? 'bg-indigo-900/10 border-indigo-500/30' : 'opacity-40 border-transparent grayscale'}`}>
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${rank.bgClass} ${rank.borderClass} ${rank.colorClass}`}>{isUnlocked ? <Star size={14} fill="currentColor" /> : <Lock size={14} />}</div>
                                      <div><p className={`text-sm font-bold ${rank.colorClass}`}>{rank.name}</p><p className="text-[10px] text-slate-500">{rank.minXp} XP Necessários</p></div>
                                  </div>
                                  {isUnlocked && <CheckCircle size={16} className="text-emerald-500" />}
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;
