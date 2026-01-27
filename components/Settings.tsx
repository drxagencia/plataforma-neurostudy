
import React, { useState, useEffect } from 'react';
import { User, UserProfile } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Camera, Save, Loader2, CheckCircle, Moon, Sun, Palette, Trophy, Shield, Star, Lock } from 'lucide-react';
import { RANKS, getRank, getNextRank } from '../constants';

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

  // Rank Data
  const currentRank = getRank(user.xp || 0);
  const nextRank = getNextRank(user.xp || 0);
  const progressPercent = nextRank 
    ? ((user.xp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)) * 100 
    : 100;

  // Sync local state when user prop updates
  useEffect(() => {
    setDisplayName(user.displayName);
    setPhotoURL(user.photoURL || '');
    // Fallback if user had midnight stored previously
    const theme = user.theme === 'light' ? 'light' : 'dark';
    setSelectedTheme(theme);
  }, [user]);

  // Apply theme preview immediately
  const handleThemeChange = (theme: 'dark' | 'light') => {
      // Force Dark Mode Only for now
      if (theme === 'light') return;

      setSelectedTheme(theme);
      
      const root = document.documentElement;
      
      // Reset
      root.classList.remove('light');
      root.classList.remove('dark');
      
      root.classList.add(theme);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    try {
      // 1. Update Firebase Auth 
      const authUpdates: { displayName?: string; photoURL?: string } = { displayName };
      
      if (photoURL && !photoURL.startsWith('data:image')) {
          authUpdates.photoURL = photoURL;
      }

      const updatedAuthUser = await AuthService.updateProfile(user, authUpdates);

      // 2. Update Realtime Database
      await DatabaseService.saveUserProfile(user.uid, {
        displayName,
        photoURL,
        theme: 'dark' // Force save as dark for consistency
      });

      // Merge updated User fields back into UserProfile
      const updatedProfile: UserProfile = { 
          ...user, 
          ...updatedAuthUser, 
          photoURL, 
          theme: 'dark'
      };

      onUpdateUser(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to update", e);
      alert("Erro ao salvar perfil. Tente uma imagem menor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       if (file.size > 500000) {
           alert("A imagem deve ter no máximo 500KB.");
           return;
       }

       const reader = new FileReader();
       reader.onloadend = () => {
           setPhotoURL(reader.result as string);
       };
       reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Ajustes da Conta</h2>
        <p className="text-slate-400">Gerencie suas informações pessoais, aparência e progresso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: EDIT PROFILE */}
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 space-y-8 h-fit">
            
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-indigo-500 transition-colors bg-slate-800">
                  {photoURL ? (
                    <img 
                      src={photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-500">
                        {displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-500 shadow-lg transition-transform hover:scale-110">
                  <Camera size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
              <div>
                <h3 className="text-white font-medium">Foto de Perfil</h3>
                <p className="text-sm text-slate-500">A imagem será salva no banco de dados.</p>
              </div>
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
                    <button 
                        onClick={() => handleThemeChange('dark')}
                        className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-3 bg-slate-950 border-indigo-500 text-indigo-400`}
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center">
                            <Moon size={16} />
                        </div>
                        <span>Dark Mode</span>
                    </button>
                    <button 
                        disabled={true}
                        className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-3 bg-slate-900 border-transparent text-slate-600 opacity-50 cursor-not-allowed relative overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-10 backdrop-blur-[1px]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-700 px-2 py-1 rounded bg-slate-900">Em Breve</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center text-orange-500 opacity-50">
                            <Sun size={16} />
                        </div>
                        <span>White Mode</span>
                    </button>
                </div>
            </div>

            <div className="pt-6 flex items-center gap-4">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium w-full justify-center disabled:opacity-50 ${
                    success ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle size={20} /> : <Save size={20} />}
                {success ? 'Salvo!' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

          {/* RIGHT: RANK SYSTEM */}
          <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl relative overflow-hidden bg-slate-900/80 border border-white/10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                  
                  <div className="flex justify-between items-end mb-4 relative z-10">
                      <div>
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Rank Atual</p>
                          <h3 className={`text-3xl font-black ${currentRank.colorClass}`}>{currentRank.name}</h3>
                      </div>
                      <div className="text-right">
                          <p className="text-white font-mono font-bold text-xl">{user.xp || 0} XP</p>
                      </div>
                  </div>

                  {nextRank ? (
                      <div className="space-y-2 relative z-10">
                          <div className="flex justify-between text-xs text-slate-400 font-medium">
                              <span>Progresso</span>
                              <span>Faltam {nextRank.minXp - (user.xp || 0)} XP</span>
                          </div>
                          <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                                style={{ width: `${progressPercent}%` }}
                              />
                          </div>
                          <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest mt-2">Próximo Rank: {nextRank.name}</p>
                      </div>
                  ) : (
                      <div className="text-center py-2 relative z-10">
                          <span className="text-yellow-400 font-bold flex items-center justify-center gap-2"><Trophy size={16}/> Nível Máximo Alcançado</span>
                      </div>
                  )}
              </div>

              {/* Rank List */}
              <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col max-h-[500px]">
                  <div className="p-4 bg-slate-900/50 border-b border-white/5">
                      <h4 className="font-bold text-white flex items-center gap-2"><Shield size={18}/> Hierarquia da Plataforma</h4>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {RANKS.map((rank, idx) => {
                          const isUnlocked = (user.xp || 0) >= rank.minXp;
                          const isNext = !isUnlocked && (idx > 0 && (user.xp || 0) >= RANKS[idx-1].minXp);

                          return (
                              <div 
                                key={idx} 
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                    isUnlocked 
                                    ? 'bg-slate-800/40 border-white/5 opacity-100' 
                                    : isNext 
                                      ? 'bg-indigo-900/10 border-indigo-500/30' 
                                      : 'opacity-40 border-transparent grayscale'
                                }`}
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${rank.bgClass} ${rank.borderClass} ${rank.colorClass}`}>
                                          {isUnlocked ? <Star size={14} fill="currentColor" /> : <Lock size={14} />}
                                      </div>
                                      <div>
                                          <p className={`text-sm font-bold ${rank.colorClass}`}>{rank.name}</p>
                                          <p className="text-[10px] text-slate-500">{rank.minXp} XP Necessários</p>
                                      </div>
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
