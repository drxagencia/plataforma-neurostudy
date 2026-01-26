
import React from 'react';
import { View } from '../types';
import { 
  LayoutDashboard, 
  GraduationCap, 
  FileQuestion, 
  Users, 
  Settings, 
  LogOut,
  BookOpen,
  ShieldAlert,
  Trophy,
  Bot,
  BrainCircuit,
  PenTool,
  Sword
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
    { id: 'militares', label: 'Militares', icon: <Sword size={20} /> },
    { id: 'redacao', label: 'Redação', icon: <PenTool size={20} /> },
    { id: 'tutor', label: 'NeuroTutor', icon: <Bot size={20} /> },
    { id: 'simulados', label: 'Simulados', icon: <GraduationCap size={20} /> },
    { id: 'questoes', label: 'Questões', icon: <FileQuestion size={20} /> },
    { id: 'comunidade', label: 'Comunidade', icon: <Users size={20} /> },
    { id: 'competitivo', label: 'Competitivo', icon: <Trophy size={20} /> },
    { id: 'admin', label: 'Admin', icon: <ShieldAlert size={20} />, adminOnly: true },
    { id: 'ajustes', label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || (item.adminOnly && isAdmin));

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-50 px-2 pb-safe">
        {visibleMenuItems.slice(0, 6).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all active:scale-95 ${
              currentView === item.id ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`${currentView === item.id ? 'bg-indigo-500/20 p-1.5 rounded-lg' : ''} transition-all`}>
              {item.icon}
            </div>
            <span className="text-[9px] mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  // Desktop Sidebar
  return (
    <aside className="w-64 h-screen bg-[#020617] border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/10">
           <BrainCircuit className="w-6 h-6 text-indigo-500" />
        </div>
        <h1 className="text-xl font-bold text-white leading-tight tracking-tight">
          NeuroStudy<br/><span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">AI Platform</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {visibleMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
              currentView === item.id 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:pl-5'
            }`}
          >
             {/* Hover Glow Effect */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full transition-all duration-300 ${currentView === item.id ? 'opacity-100' : 'opacity-0'}`} />

            <span className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span className="font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all hover:scale-[1.02]"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
};

export default Navigation;
