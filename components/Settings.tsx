import React, { useState } from 'react';
import { User, UserProfile } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Camera, Save, Loader2, CheckCircle } from 'lucide-react';

interface SettingsProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    try {
      // 1. Update Firebase Auth (for login session consistency)
      const updatedAuthUser = await AuthService.updateProfile(user, {
        displayName,
        photoURL
      });

      // 2. Update Realtime Database (for persistence and admin view)
      await DatabaseService.saveUserProfile(user.uid, {
        displayName,
        photoURL
      });

      // Merge updated User fields back into UserProfile
      const updatedProfile: UserProfile = { ...user, ...updatedAuthUser };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       // In production: Upload to Firebase Storage and get URL
       // For this environment: Create local blob URL
       const fakeUrl = URL.createObjectURL(e.target.files[0]);
       setPhotoURL(fakeUrl);
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

         {/* Mock Section for Theme */}
         <div className="space-y-3 pt-4 border-t border-white/5">
            <span className="text-sm font-medium text-slate-300">Tema da Interface</span>
            <div className="grid grid-cols-3 gap-3">
                <button className="p-3 rounded-xl bg-slate-950 border-2 border-indigo-500 text-indigo-400 text-sm font-medium">Escuro Premium</button>
                <button className="p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-medium opacity-50 cursor-not-allowed">Claro (Em breve)</button>
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