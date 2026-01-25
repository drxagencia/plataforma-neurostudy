import React, { useState, useEffect } from 'react';
import { User, UserProfile } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Camera, Save, Loader2, CheckCircle, Moon, Sun, Palette } from 'lucide-react';

interface SettingsProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'midnight'>(user.theme || 'dark');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync local state when user prop updates
  useEffect(() => {
    setDisplayName(user.displayName);
    setPhotoURL(user.photoURL || '');
    setSelectedTheme(user.theme || 'dark');
  }, [user]);

  // Apply theme preview immediately
  const handleThemeChange = (theme: 'dark' | 'light' | 'midnight') => {
      setSelectedTheme(theme);
      
      const root = document.documentElement;
      const body = document.body;
      
      // Reset
      root.classList.remove('light');
      root.classList.add('dark'); // Default base
      body.classList.remove('theme-midnight');

      if (theme === 'light') {
          root.classList.remove('dark');
          root.classList.add('light');
      } else if (theme === 'midnight') {
          body.classList.add('theme-midnight');
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    try {
      // 1. Update Firebase Auth 
      // CRITICAL FIX: Firebase Auth allows max 2048 chars for photoURL. 
      // Base64 images are much larger. We ONLY update displayName in Auth.
      // The PhotoURL will be stored in Realtime Database.
      
      const authUpdates: { displayName?: string; photoURL?: string } = { displayName };
      
      // Only send photo to Auth if it's NOT a base64 data string (i.e. it's a short https link)
      if (photoURL && !photoURL.startsWith('data:image')) {
          authUpdates.photoURL = photoURL;
      }

      const updatedAuthUser = await AuthService.updateProfile(user, authUpdates);

      // 2. Update Realtime Database (Supports large Base64 strings)
      await DatabaseService.saveUserProfile(user.uid, {
        displayName,
        photoURL,
        theme: selectedTheme
      });

      // Merge updated User fields back into UserProfile
      const updatedProfile: UserProfile = { 
          ...user, 
          ...updatedAuthUser, 
          photoURL, // Ensure local state reflects the base64
          theme: selectedTheme
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
       // Limit size to 500KB for Base64 storage performance
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
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Ajustes da Conta</h2>
        <p className="text-slate-400">Gerencie suas informações pessoais e aparência.</p>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 space-y-8">
        
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
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => handleThemeChange('midnight')}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-2 ${selectedTheme === 'midnight' ? 'bg-[#0f172a] border-indigo-500 text-indigo-400' : 'bg-slate-900 border-transparent text-slate-400'}`}
                >
                    <div className="w-4 h-4 rounded-full bg-[#0f172a] border border-white/20"></div>
                    Azul Escuro
                </button>
                <button 
                    onClick={() => handleThemeChange('dark')}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-2 ${selectedTheme === 'dark' ? 'bg-[#020617] border-indigo-500 text-indigo-400' : 'bg-slate-950 border-transparent text-slate-400'}`}
                >
                    <div className="w-4 h-4 rounded-full bg-[#020617] border border-white/20"></div>
                    Dark Mode
                </button>
                <button 
                    onClick={() => handleThemeChange('light')}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-2 ${selectedTheme === 'light' ? 'bg-white border-indigo-500 text-indigo-600' : 'bg-slate-100 border-transparent text-slate-500'}`}
                >
                    <div className="w-4 h-4 rounded-full bg-white border border-slate-300"></div>
                    Light Mode
                </button>
            </div>
         </div>

        <div className="pt-6 flex items-center gap-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium disabled:opacity-50 ${
                success ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle size={20} /> : <Save size={20} />}
            {success ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;