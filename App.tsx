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
import Competitivo from './components/Competitivo';
import AiTutor from './components/AiTutor';
import AccessDenied from './components/AccessDenied'; 
import { User, View, UserProfile } from './types';
import { AuthService, mapUser } from './services/authService';
import { DatabaseService } from './services/databaseService'; 
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null); 
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Responsive Check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme Application Logic
  useEffect(() => {
      const root = document.documentElement;
      // Clear all potential themes first
      root.classList.remove('light');
      root.classList.remove('dark');
      
      if (user && user.theme === 'light') {
          root.classList.add('light');
      } else {
          // Default to dark
          root.classList.add('dark');
      }
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
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setLoadingAuth(true); 
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentView('dashboard');
  };

  const checkAccess = (view: View): boolean => {
    if (!user) return false;
    if (user.isAdmin || user.plan === 'admin' || user.plan === 'advanced') return true;

    if (user.plan === 'basic') {
        if (['comunidade', 'competitivo', 'simulados', 'tutor'].includes(view)) return false;
    }
    
    if (user.plan === 'intermediate') return true; 

    return true;
  };

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
    <div className="flex min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <Navigation 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onLogout={handleLogout}
        isMobile={isMobile}
        isAdmin={user.isAdmin}
      />

      <main 
        className={`flex-1 relative overflow-y-auto overflow-x-hidden transition-all duration-300 ${
          isMobile ? 'pb-20 p-4' : 'ml-64 p-8'
        }`}
        style={{ height: '100vh' }}
      >
        {/* Background Glows */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
           {/* Dark Mode Glows */}
           <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] dark:block hidden" />
           <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px] dark:block hidden" />
           
           {/* Light Mode Glows (More subtle, different colors) */}
           <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] dark:hidden block" />
           <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] dark:hidden block" />
        </div>

        <div className="max-w-7xl mx-auto h-full">
            {/* View Rendering Logic */}
            {!checkAccess(currentView) 
                ? <AccessDenied currentPlan={user.plan} requiredPlan={user.plan === 'basic' ? 'intermediate' : 'advanced'} />
                : (
                    <>
                    {currentView === 'dashboard' && <Dashboard user={user} onNavigate={setCurrentView} />}
                    {currentView === 'aulas' && <Classes />}
                    {currentView === 'questoes' && <QuestionBank />}
                    {currentView === 'comunidade' && <Community />}
                    {currentView === 'simulados' && <Simulations />}
                    {currentView === 'tutor' && <AiTutor />}
                    {currentView === 'ajustes' && <Settings user={user} onUpdateUser={setUser} />}
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