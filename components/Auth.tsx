
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, BrainCircuit } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const user = await AuthService.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError("Falha ao entrar. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-pulse-slow delay-1000" />

      <div className="w-full max-w-md p-8 rounded-3xl glass-card z-10 mx-4 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4 bg-indigo-500/10 rounded-2xl p-2 border border-indigo-500/20 shadow-xl shadow-indigo-500/10">
            <BrainCircuit className="w-12 h-12 text-indigo-500 drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">NeuroStudy AI</h1>
          <p className="text-slate-400 text-sm">Plataforma de ensino de alta performance.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wide">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wide">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium animate-fade-in">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Acessar Plataforma
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Não tem acesso? <a href="https://wa.me/558494446745" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline">Falar com Suporte</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
