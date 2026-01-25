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
import AccessDenied from './components/AccessDenied'; // New Component
import { User, View, UserProfile } from './types';
import { AuthService, mapUser } from './services/authService';
import { DatabaseService } from './services/databaseService'; 
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null); // Use UserProfile type
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Responsive Check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth Persistence & DB Structure Enforcement
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Realtime Database under users/[uid]
        let dbUser = await DatabaseService.getUserProfile(firebaseUser.uid);
        const mappedUser = mapUser(firebaseUser);
        
        // If user doesn't exist in DB, create the structure now
        if (!dbUser) {
           await DatabaseService.createUserProfile(firebaseUser.uid, {
               displayName: mappedUser.displayName,
               email: mappedUser.email,
               photoURL: mappedUser.photoURL || '',
               plan: mappedUser.isAdmin ? 'admin' : 'basic',
               isAdmin: mappedUser.isAdmin
           });
           // Fetch again to ensure consistency
           dbUser = await DatabaseService.getUserProfile(firebaseUser.uid);
        }

        setUser({
            ...mappedUser,
            ...dbUser, 
            displayName: dbUser?.displayName || mappedUser.displayName,
            photoURL: dbUser?.photoURL || mappedUser.photoURL,
            plan: dbUser?.plan || (mappedUser.isAdmin ? 'admin' : 'basic') // Default plan
        });
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    // Optimistic set, real data comes from auth listener
    setLoadingAuth(true); 
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentView('dashboard');
  };

  const checkAccess = (view: View): boolean => {
    if (!user) return false;
    if (user.isAdmin || user.plan === 'admin' || user.plan === 'advanced') return true;

    // Plan Limits
    if (user.plan === 'basic') {
        if (['comunidade', 'competitivo', 'simulados', 'tutor'].includes(view)) return false;
    }
    
    // Intermediate has access to everything in UI, but features within (AI) are limited by config/API
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

  // View Container to handle rendering content
  const renderView = () => {
    if (!checkAccess(currentView)) {
        // Determine required plan message
        const required = user.plan === 'basic' ? 'intermediate' : 'advanced';
        return <AccessDenied currentPlan={user.plan} requiredPlan={required} />;
    }

    switch (currentView) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'aulas': return <Classes />;
      case 'questoes': return <QuestionBank />;
      case 'comunidade': return <Community />;
      case 'simulados': return <Simulations />;
      case 'tutor': return <AiTutor />;
      case 'ajustes': return <Settings user={user} onUpdateUser={setUser} />;
      case 'competitivo': return <Competitivo />;
      case 'admin': return user.isAdmin ? <AdminPanel /> : <Dashboard user={user} />;
      default: return <Dashboard user={user} />;
    }
  };

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
           <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto h-full">
            {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;