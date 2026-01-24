import React from 'react';
import { View } from '../types';
import { 
  LayoutDashboard, 
  GraduationCap, 
  FileQuestion, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  BookOpen,
  ShieldAlert
} from 'lucide-react';

interface NavigationProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  isMobile: boolean;
  isAdmin?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, onLogout, isMobile, isAdmin }) => {
  const menuItems: { id: View; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'aulas', label: 'Aulas', icon: <BookOpen size={20} /> },
    { id: 'simulados', label: 'Simulados', icon: <GraduationCap size={20} /> },
    { id: 'questoes', label: 'Questões', icon: <FileQuestion size={20} /> },
    { id: 'comunidade', label: 'Comunidade', icon: <Users size={20} /> },
    { id: 'provas', label: 'Provas', icon: <FileText size={20} /> },
    { id: 'admin', label: 'Admin', icon: <ShieldAlert size={20} />, adminOnly: true },
    { id: 'ajustes', label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || (item.adminOnly && isAdmin));

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-50 px-2">
        {visibleMenuItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              currentView === item.id ? 'text-indigo-400 scale-110' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  // Desktop Sidebar
  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-white/10 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
           <img src="/logo_neuro.png" alt="NeuroStudy AI" className="w-full h-full object-contain" onError={(e) => {
             // Fallback if image fails
             e.currentTarget.style.display = 'none';
             e.currentTarget.parentElement!.classList.add('bg-indigo-600');
             e.currentTarget.parentElement!.innerHTML = '<span class="text-white font-bold">N</span>';
           }}/>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 leading-tight">
          NeuroStudy<br/><span className="text-indigo-400 text-sm">AI Platform</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {visibleMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === item.id 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
            }`}
          >
            <span className={`transition-transform duration-200 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
            {currentView === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_currentColor]" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Navigation;