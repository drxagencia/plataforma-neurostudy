
import React, { useState, useEffect, useRef } from 'react';
import Navigation from './components/Navigation';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Classes from './components/Classes';
import QuestionBank from './components/QuestionBank';
import Community from './components/Community';
import Simulations from './components/Simulations';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import Competitivo from './components/Competitivo';
import AiTutor from './components/AiTutor';
import Redacao from './components/Redacao';
import Militares from './components/Militares';
import AccessDenied from './components/AccessDenied'; 
import FullScreenPrompt from './components/FullScreenPrompt'; 
import RankUpOverlay from './components/RankUpOverlay'; 
import LandingPage from './components/LandingPage'; 
import UpgradeModal from './components/UpgradeModal'; 
import Support from './components/Support';
import { User, View, UserProfile } from './types';
import { AuthService, mapUser } from './services/authService';
import { DatabaseService } from './services/databaseService'; 
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { Zap, Smartphone, CheckCircle, Loader2 } from 'lucide-react';
import { getRank } from './constants';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(() => {
      const s = window.location.search;
      return s.includes('page=lp');
  });
  
  const [user, setUser] = useState<UserProfile | null>(null); 
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [hasSupportNotif, setHasSupportNotif] = useState(false);
  
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const mappedUser = mapUser(firebaseUser);
          const dbUser = await DatabaseService.ensureUserProfile(firebaseUser.uid, {
                 displayName: mappedUser.displayName,
                 email: mappedUser.email,
                 photoURL: mappedUser.photoURL || '',
                 plan: mappedUser.isAdmin ? 'admin' : 'basic',
                 isAdmin: mappedUser.isAdmin
          });

          setUser({ ...mappedUser, ...dbUser });
          
          // Trigger Onboarding if setup not done
          if (!dbUser.firstTimeSetupDone) {
              setShowOnboarding(true);
          }
        } else {
          setUser(null);
        }
      } catch (error) { setUser(null); } finally { setLoadingAuth(false); }
    });
    return () => unsubscribe();
  }, []);

  const handleOnboardingSubmit = async () => {
      if (whatsappInput.length < 10 || !user) return;
      setOnboardingLoading(true);
      try {
          await DatabaseService.updateOnboarding(user.uid, whatsappInput);
          setUser(prev => prev ? { ...prev, whatsapp: whatsappInput, firstTimeSetupDone: true } : null);
          setShowOnboarding(false);
      } catch (e) {
          alert("Erro ao salvar dados.");
      } finally {
          setOnboardingLoading(false);
      }
  };

  const handleLogout = async () => { await AuthService.logout(); setCurrentView('dashboard'); };
  const handleStartGame = () => { setShowLanding(false); };
  const handleUpdateUser = (updatedUser: UserProfile) => { setUser(updatedUser); };

  if (showLanding) return <LandingPage onStartGame={handleStartGame} />;
  if (loadingAuth) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;
  if (!user) return <Auth onLogin={() => setLoadingAuth(true)} />;

  return (
    <div className="flex min-h-screen text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* ONBOARDING MODAL */}
      {showOnboarding && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
              <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 text-center">
                  <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
                      <Smartphone size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Bem-vindo!</h2>
                  <p className="text-slate-400 mb-8 leading-relaxed">
                      Para continuar, precisamos do seu WhatsApp. Usaremos apenas para avisos importantes e suporte.
                  </p>
                  
                  <div className="space-y-4">
                      <div className="text-left">
                          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">WhatsApp (com DDD)</label>
                          <input 
                            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none mt-1"
                            placeholder="Ex: 11999999999"
                            type="tel"
                            value={whatsappInput}
                            onChange={e => setWhatsappInput(e.target.value.replace(/\D/g, ''))}
                          />
                      </div>
                      
                      <button 
                        onClick={handleOnboardingSubmit}
                        disabled={whatsappInput.length < 10 || onboardingLoading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 text-white font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                          {onboardingLoading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                          Finalizar Cadastro
                      </button>
                  </div>
              </div>
          </div>
      )}

      <FullScreenPrompt /> 
      <Navigation 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onLogout={handleLogout} 
        isMobile={isMobile} 
        isAdmin={user.isAdmin} 
        hasSupportNotification={hasSupportNotif} 
      />

      <main className={`flex-1 relative overflow-y-auto overflow-x-hidden transition-all duration-300 z-10 ${isMobile ? 'pb-24 p-4' : 'ml-64 p-8'}`} style={{ height: '100vh' }}>
        <div className="max-w-7xl mx-auto h-full relative">
            {currentView === 'dashboard' && <Dashboard user={user} onNavigate={setCurrentView} />}
            {currentView === 'aulas' && <Classes onNavigate={setCurrentView} user={user} onUpdateUser={handleUpdateUser} />}
            {currentView === 'militares' && <Militares />}
            {currentView === 'redacao' && <Redacao user={user} onUpdateUser={handleUpdateUser} />}
            {currentView === 'questoes' && <QuestionBank onUpdateUser={handleUpdateUser} />}
            {currentView === 'comunidade' && <Community user={user} />}
            {currentView === 'simulados' && <Simulations />}
            {currentView === 'tutor' && <AiTutor user={user} onUpdateUser={handleUpdateUser} />}
            {currentView === 'ajustes' && <Settings user={user} onUpdateUser={handleUpdateUser} />}
            {currentView === 'suporte' && <Support user={user} />}
            {currentView === 'competitivo' && <Competitivo />}
            {currentView === 'admin' && (user.isAdmin ? <AdminPanel /> : <Dashboard user={user} onNavigate={setCurrentView} />)}
        </div>
      </main>
    </div>
  );
};

export default App;
