
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
import { User, View, UserProfile } from './types';
import { AuthService, mapUser } from './services/authService';
import { DatabaseService } from './services/databaseService'; 
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { Zap } from 'lucide-react';
import { getRank } from './constants';

const XP_TOAST_DURATION = 3000;

// Sub-component for XP Notification
const XpToast = () => {
    const [xpNotification, setXpNotification] = useState<{amount: number, reason: string} | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = DatabaseService.onXpEarned((amount, reason) => {
            setXpNotification({ amount, reason });
            setIsVisible(true);
            
            // Hide after duration
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, XP_TOAST_DURATION);

            return () => clearTimeout(timer);
        });
        return () => unsubscribe();
    }, []);

    // Helper to format reason text nicely
    const getReasonLabel = (reason: string) => {
        switch(reason) {
            case 'QUESTION_CORRECT': return 'Resposta Correta';
            case 'LESSON_WATCHED': return 'Aula Concluída';
            case 'SIMULATION_FINISH': return 'Simulado Finalizado';
            case 'ESSAY_CORRECTION': return 'Redação Corrigida';
            case 'AI_CHAT_MESSAGE': return 'Interação IA';
            case 'DAILY_LOGIN_BASE': return 'Login Diário';
            case 'LIKE_COMMENT': return 'Interação Social';
            case 'FULLSCREEN_MODE': return 'Modo Foco';
            default: return 'Atividade';
        }
    };

    if (!xpNotification) return null;

    return (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 md:left-6 -translate-x-1/2 md:translate-x-0 z-[100] transition-all duration-500 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-slate-950/80 backdrop-blur-md border border-white/5 pr-5 pl-4 py-3 rounded-full shadow-2xl flex items-center gap-3">
                <div className="bg-yellow-500/10 p-1.5 rounded-full">
                    <Zap className="text-yellow-400 fill-yellow-400" size={14} />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white text-sm">+{xpNotification.amount} XP</span>
                    <span className="text-xs text-slate-500 border-l border-white/10 pl-2">{getReasonLabel(xpNotification.reason)}</span>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // ROBUST ROUTING CHECK
  const [showLanding, setShowLanding] = useState(() => {
      const p = window.location.pathname;
      const h = window.location.hash;
      const s = window.location.search;
      return p.endsWith('/lp') || h === '#lp' || s === '?lp' || s.includes('page=lp');
  });
  
  const [user, setUser] = useState<UserProfile | null>(null); 
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Rank Up Logic
  const [showRankUp, setShowRankUp] = useState(false);
  const prevXpRef = useRef<number>(0);
  const [rankTransition, setRankTransition] = useState<{old: any, new: any} | null>(null);

  // Responsive Check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme Application Logic
  useEffect(() => {
      const root = document.documentElement;
      // Force Dark Mode always for now
      root.classList.remove('light');
      root.classList.add('dark');
  }, [user?.theme]);

  // Auth Persistence & DB Structure Enforcement
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser = mapUser(firebaseUser);
        
        // Ensure user exists in Realtime Database under users/[uid]
        const dbUser = await DatabaseService.ensureUserProfile(firebaseUser.uid, {
               displayName: mappedUser.displayName,
               email: mappedUser.email,
               photoURL: mappedUser.photoURL || '',
               plan: mappedUser.isAdmin ? 'admin' : 'basic',
               isAdmin: mappedUser.isAdmin
        });

        // Initialize XP Ref on first load
        if (prevXpRef.current === 0 && dbUser?.xp) {
            prevXpRef.current = dbUser.xp;
        }

        // Fallback for deprecated 'midnight' theme in DB to 'dark'
        const safeTheme = (dbUser?.theme === 'light') ? 'light' : 'dark';

        setUser({
            ...mappedUser,
            ...dbUser, 
            displayName: dbUser?.displayName || mappedUser.displayName,
            photoURL: dbUser?.photoURL || mappedUser.photoURL,
            plan: dbUser?.plan || (mappedUser.isAdmin ? 'admin' : 'basic'), 
            theme: safeTheme
        });

        // Check Login Streak automatically
        await DatabaseService.processXpAction(firebaseUser.uid, 'DAILY_LOGIN_BASE');

      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Monitor XP for Rank Up
  useEffect(() => {
      if (user && user.xp !== undefined) {
          const oldXp = prevXpRef.current;
          const newXp = user.xp;

          if (newXp > oldXp) {
              const oldRank = getRank(oldXp);
              const newRank = getRank(newXp);

              if (newRank.name !== oldRank.name) {
                  setRankTransition({ old: oldRank, new: newRank });
                  setShowRankUp(true);
              }
          }
          prevXpRef.current = newXp;
      }
  }, [user?.xp]);

  const handleLogin = (loggedInUser: User) => {
    setLoadingAuth(true); 
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentView('dashboard');
  };

  const handleStartGame = () => {
      try {
          const url = new URL(window.location.href);
          if (url.pathname.endsWith('/lp')) url.pathname = '/';
          if (url.hash === '#lp') url.hash = '';
          if (url.searchParams.has('lp')) url.searchParams.delete('lp');
          window.history.pushState({}, '', url.toString());
      } catch (e) {
          window.history.pushState({}, '', '/');
      }
      setShowLanding(false);
  };

  const checkAccess = (view: View): boolean => {
    if (!user) return false;
    if (user.isAdmin || user.plan === 'admin' || user.plan === 'advanced') return true;

    if (user.plan === 'basic') {
        if (['comunidade', 'competitivo', 'simulados', 'tutor', 'redacao'].includes(view)) return false;
    }
    
    if (user.plan === 'intermediate') return true; 

    return true;
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
      setUser(updatedUser);
  };

  // --- LANDING PAGE RENDER ---
  if (showLanding) {
      return <LandingPage onStartGame={handleStartGame} />;
  }

  // --- APP RENDER ---
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      <FullScreenPrompt /> 
      <XpToast /> 
      
      {showRankUp && rankTransition && (
          <RankUpOverlay 
            oldRank={rankTransition.old} 
            newRank={rankTransition.new} 
            onClose={() => setShowRankUp(false)} 
          />
      )}

      {/* Background Animation Container */}
      <div className="stars-container">
          <div className="star-layer stars-1"></div>
          <div className="star-layer stars-2"></div>
          <div className="star-layer stars-3"></div>
          <div className="nebula-glow"></div>
      </div>

      <Navigation 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onLogout={handleLogout}
        isMobile={isMobile}
        isAdmin={user.isAdmin}
      />

      <main 
        className={`flex-1 relative overflow-y-auto overflow-x-hidden transition-all duration-300 z-10 ${
          isMobile ? 'pb-24 p-4' : 'ml-64 p-8'
        }`}
        style={{ height: '100vh' }}
      >
        <div className="max-w-7xl mx-auto h-full relative">
            {/* View Rendering Logic */}
            {!checkAccess(currentView) 
                ? <AccessDenied currentPlan={user.plan} requiredPlan={user.plan === 'basic' ? 'intermediate' : 'advanced'} />
                : (
                    <>
                    {currentView === 'dashboard' && <Dashboard user={user} onNavigate={setCurrentView} />}
                    {currentView === 'aulas' && <Classes onNavigate={setCurrentView} user={user} onUpdateUser={handleUpdateUser} />}
                    {currentView === 'militares' && <Militares />}
                    {currentView === 'redacao' && <Redacao user={user} onUpdateUser={handleUpdateUser} />}
                    {currentView === 'questoes' && <QuestionBank onUpdateUser={handleUpdateUser} />}
                    {currentView === 'comunidade' && <Community user={user} />}
                    {currentView === 'simulados' && <Simulations />}
                    {currentView === 'tutor' && <AiTutor user={user} onUpdateUser={handleUpdateUser} />}
                    {currentView === 'ajustes' && <Settings user={user} onUpdateUser={handleUpdateUser} />}
                    {currentView === 'competitivo' && <Competitivo />}
                    {currentView === 'admin' && (user.isAdmin ? <AdminPanel /> : <Dashboard user={user} onNavigate={setCurrentView} />)}
                    </>
                )
            }
        </div>
      </main>
    </div>
  );
};

export default App;
