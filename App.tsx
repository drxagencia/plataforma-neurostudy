import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Classes from './components/Classes';
import QuestionBank from './components/QuestionBank';
import Community from './components/Community';
import Simulations from './components/Simulations';
import Settings from './components/Settings';
import { User, View } from './types';
import { AuthService, mapUser } from './services/authService';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Responsive Check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth Persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    // User state is handled by onAuthStateChanged, but we can optimistically clear it
    // setUser(null); 
    setCurrentView('dashboard');
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
    switch (currentView) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'aulas': return <Classes />;
      case 'questoes': return <QuestionBank />;
      case 'comunidade': return <Community />;
      case 'simulados': return <Simulations />;
      case 'ajustes': return <Settings user={user} onUpdateUser={setUser} />;
      case 'provas': return (
        <div className="flex items-center justify-center h-full text-slate-500">
           <div className="text-center">
             <h2 className="text-2xl font-bold text-white mb-2">Repositório de Provas</h2>
             <p>Em desenvolvimento. Acesse o Banco de Questões por enquanto.</p>
           </div>
        </div>
      );
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