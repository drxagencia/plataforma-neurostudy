
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Classes from './components/Classes';
import QuestionBank from './components/QuestionBank';
import Community from './components/Community';
import Simulations from './components/Simulations';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import FinanceiroPanel from './components/FinanceiroPanel'; 
import Competitivo from './components/Competitivo';
import AiTutor from './components/AiTutor';
import Redacao from './components/Redacao';
import Militares from './components/Militares';
import FullScreenPrompt from './components/FullScreenPrompt'; 
import LandingPage from './components/LandingPage'; 
import Support from './components/Support';
import UpgradeModal from './components/UpgradeModal'; // Import global modal
import { View, UserProfile } from './types';
import { mapUser } from './services/authService';
import { DatabaseService } from './services/databaseService'; 
import { auth } from './services/firebaseConfig';
import { Smartphone, CheckCircle, Loader2, Trophy } from 'lucide-react';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(() => window.location.search.includes('page=lp'));
  const [user, setUser] = useState<UserProfile | null>(null); 
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  
  // Global Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMode, setUpgradeMode] = useState<'plan' | 'ai'>('plan');

  // XP Alert State
  const [xpNotification, setXpNotification] = useState<{ show: boolean, amount: number, type: string } | null>(null);

  // DB Optimization: Buffer
  const [unsavedStudyMinutes, setUnsavedStudyMinutes] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Monitora o estado de autenticação e decide se mostra o onboarding
  useEffect(() => {
    // Use compat auth.onAuthStateChanged
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
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
          
          const finalUser = { ...mappedUser, ...dbUser };
          if (typeof finalUser.dailyStudyMinutes === 'undefined') finalUser.dailyStudyMinutes = 0;
          
          setUser(finalUser);
          
          if (!dbUser.firstTimeSetupDone && !showLanding) {
              setShowOnboarding(true);
          } else {
              setShowOnboarding(false);
          }
        } else {
          setUser(null);
          setShowOnboarding(false);
        }
      } catch (error) { 
          setUser(null); 
          setShowOnboarding(false);
      } finally { 
          setLoadingAuth(false); 
      }
    });
    return () => unsubscribe();
  }, [showLanding]); 

  // GLOBAL STUDY TIMER - OPTIMIZED BATCHING
  useEffect(() => {
      if (!user?.uid || showLanding) return;

      const timer = setInterval(() => {
          // Increment Local Buffer
          setUnsavedStudyMinutes(prev => {
              const newValue = prev + 1;
              // Auto Sync every 15 minutes
              if (newValue >= 15) {
                  DatabaseService.trackStudyTime(user.uid, newValue);
                  return 0;
              }
              return newValue;
          });

          // Update UI instantly (Optimistic)
          setUser(currentUser => {
              if (!currentUser) return null;
              
              const today = new Date().toLocaleDateString('en-CA');
              const isNewDay = currentUser.lastStudyDate !== today;

              return {
                  ...currentUser,
                  dailyStudyMinutes: isNewDay ? 1 : (currentUser.dailyStudyMinutes || 0) + 1,
                  hoursStudied: (currentUser.hoursStudied || 0) + (1/60),
                  lastStudyDate: today
              };
          });
      }, 60000); 

      return () => clearInterval(timer);
  }, [user?.uid, showLanding]);

  // XP Notification Listener
  useEffect(() => {
      const handleXpEvent = (event: any) => {
          const { amount, type } = event.detail;
          if (amount <= 0) return;
          
          setXpNotification({ show: true, amount, type });
          
          // Auto hide after 3s
          setTimeout(() => {
              setXpNotification(null);
          }, 3000);
      };

      window.addEventListener('xp-gained', handleXpEvent);
      return () => window.removeEventListener('xp-gained', handleXpEvent);
  }, []);

  const handleManualTimeSync = () => {
      if (user?.uid && unsavedStudyMinutes > 0) {
          DatabaseService.trackStudyTime(user.uid, unsavedStudyMinutes);
          setUnsavedStudyMinutes(0);
          // Optional: Add a simple toast or animation here if desired
      }
  };

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

  const handleShowUpgrade = (mode: 'plan' | 'ai' = 'plan') => {
      setUpgradeMode(mode);
      setShowUpgradeModal(true);
  };

  if (showLanding) {
      return <LandingPage onStartGame={() => setShowLanding(false)} />;
  }

  if (loadingAuth) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" />
          </div>
      );
  }

  if (!user) return <Auth onLogin={() => setLoadingAuth(true)} />;

  return (
    <div className="flex min-h-screen text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* XP NOTIFICATION TOAST */}
      {xpNotification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 px-6 py-3 rounded-full shadow-[0_0_30px_rgba(79,70,229,0.4)] flex items-center gap-3">
                  <div className="bg-indigo-600 rounded-full p-1.5 animate-bounce">
                      <Trophy size={16} className="text-white" />
                  </div>
                  <div>
                      <p className="text-sm font-black text-white uppercase tracking-wider">
                          +{xpNotification.amount} XP
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Global Upgrade Modal */}
      {showUpgradeModal && <UpgradeModal user={user} onClose={() => setShowUpgradeModal(false)} mode={upgradeMode} />}

      {/* MODAL DE CAPTURA DE WHATSAPP */}
      {showOnboarding && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
              <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 text-center">
                  <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
                      <Smartphone size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Quase lá!</h2>
                  <p className="text-slate-400 mb-8 leading-relaxed">
                      Para sua segurança e melhor suporte, confirme seu WhatsApp. Usaremos apenas para avisos urgentes.
                  </p>
                  
                  <div className="space-y-4">
                      <div className="text-left">
                          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">WhatsApp (DDD + Número)</label>
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
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
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
        onLogout={() => auth.signOut()} 
        isMobile={isMobile} 
        isAdmin={user.isAdmin} 
        hasSupportNotification={user.hasSupportNotification} 
      />

      <main className={`flex-1 relative overflow-y-auto transition-all duration-300 z-10 ${isMobile ? 'pb-24 p-4' : 'ml-64 p-8'}`} style={{ height: '100vh' }}>
        <div className="max-w-7xl mx-auto h-full">
            {/* PLAN FEATURES (Basic vs Advanced) */}
            {currentView === 'dashboard' && <Dashboard user={user} onNavigate={setCurrentView} onManualSync={handleManualTimeSync} />}
            {currentView === 'redacao' && <Redacao user={user} onUpdateUser={u => setUser(u)} onShowUpgrade={() => handleShowUpgrade('plan')} />}
            {currentView === 'comunidade' && <Community user={user} onShowUpgrade={() => handleShowUpgrade('plan')} />}
            {currentView === 'simulados' && <Simulations user={user} onShowUpgrade={() => handleShowUpgrade('plan')} />}
            {currentView === 'competitivo' && <Competitivo user={user} onShowUpgrade={() => handleShowUpgrade('plan')} />}
            
            {/* AI FEATURES (Separate Subscription) */}
            {currentView === 'aulas' && <Classes onNavigate={setCurrentView} user={user} onUpdateUser={u => setUser(u)} onShowUpgrade={() => handleShowUpgrade('ai')} />}
            {currentView === 'questoes' && <QuestionBank user={user} onUpdateUser={u => setUser(u)} onShowUpgrade={() => handleShowUpgrade('ai')} />}
            {currentView === 'tutor' && <AiTutor user={user} onUpdateUser={u => setUser(u)} onShowUpgrade={() => handleShowUpgrade('ai')} />}
            
            {/* STANDARD FEATURES */}
            {currentView === 'militares' && <Militares />}
            {currentView === 'ajustes' && <Settings user={user} onUpdateUser={u => setUser(u)} />}
            {currentView === 'suporte' && <Support user={user} />}
            {currentView === 'financeiro' && (user.isAdmin ? <FinanceiroPanel /> : <Dashboard user={user} onNavigate={setCurrentView} />)}
            {currentView === 'admin' && (user.isAdmin ? <AdminPanel /> : <Dashboard user={user} onNavigate={setCurrentView} />)}
        </div>
      </main>
    </div>
  );
};

export default App;
