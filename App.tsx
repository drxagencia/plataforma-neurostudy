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
import { AuthService } from './services/authService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Responsive Check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    setCurrentView('dashboard');
  };

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