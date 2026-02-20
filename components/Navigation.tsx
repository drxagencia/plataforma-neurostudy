import React, { useState } from 'react';
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
  Skull,
  LifeBuoy,
  DollarSign,
  Menu,
  X
} from 'lucide-react';

interface NavigationProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  isMobile: boolean;
  isAdmin?: boolean;
  hasSupportNotification?: boolean; // NEW prop
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, onLogout, isMobile, isAdmin, hasSupportNotification }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems: { id: View; label: string; icon: React.ReactNode; adminOnly?: boolean; hasNotif?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'aulas', label: 'Aulas', icon: <BookOpen size={20} /> },
    { id: 'militares', label: 'Militares', icon: <Skull size={20} /> },
    { id: 'redacao', label: 'Redação', icon: <PenTool size={20} /> },
    { id: 'tutor', label: 'NeuroAI', icon: <BrainCircuit size={20} /> },
    { id: 'simulados', label: 'Simulados', icon: <GraduationCap size={20} /> },
    { id: 'questoes', label: 'Questões', icon: <FileQuestion size={20} /> },
    { id: 'comunidade', label: 'Comunidade', icon: <Users size={20} /> },
    { id: 'competitivo', label: 'Competitivo', icon: <Trophy size={20} /> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={20} />, adminOnly: true },
    { id: 'admin', label: 'Admin', icon: <ShieldAlert size={20} />, adminOnly: true },
    { id: 'ajustes', label: 'Ajustes', icon: <Settings size={20} /> },
    { id: 'suporte', label: 'Suporte', icon: <LifeBuoy size={20} />, hasNotif: hasSupportNotification },
  ];

  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || (item.adminOnly && isAdmin));

  if (isMobile) {
    const mainItems = visibleMenuItems.slice(0, 4);

    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-[60] px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all active:scale-95 flex-1 relative ${
                currentView === item.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.hasNotif && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              <div className={`${currentView === item.id ? 'bg-indigo-500/20 p-1.5 rounded-lg' : ''} transition-all`}>
                {item.icon}
              </div>
              <span className="text-[9px] mt-1 font-medium font-sans">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all active:scale-95 flex-1 relative ${
              isMobileMenuOpen ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`${isMobileMenuOpen ? 'bg-indigo-500/20 p-1.5 rounded-lg' : ''} transition-all`}>
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </div>
            <span className="text-[9px] mt-1 font-medium font-sans">{isMobileMenuOpen ? 'Fechar' : 'Menu'}</span>
          </button>
        </nav>

        {/* Mobile Full Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[55] flex flex-col pt-10 pb-24 px-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center gap-3 mb-8 mt-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                 <BrainCircuit className="w-7 h-7 text-indigo-500" />
              </div>
              <h1 className="text-3xl font-bold text-white leading-tight tracking-tight font-display">
                NeuroStudy<br/><span className="text-indigo-400 text-sm font-semibold uppercase tracking-widest font-sans">AI Platform</span>
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {visibleMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 gap-3 ${
                    currentView === item.id 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                      : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="relative">
                    {item.icon}
                    {item.hasNotif && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />}
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={onLogout}
              className="mt-8 mb-8 w-full flex items-center justify-center gap-3 p-4 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl transition-all active:scale-95"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair da Conta</span>
            </button>
          </div>
        )}
      </>
    );
  }

  // Desktop Sidebar - Unified Glass Effect
  return (
    <aside className="w-64 h-screen bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/10">
           <BrainCircuit className="w-6 h-6 text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-white leading-tight tracking-tight font-display">
          NeuroStudy<br/><span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest font-sans">AI Platform</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {visibleMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden font-sans ${
              currentView === item.id 
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:pl-5'
            }`}
          >
             {/* Hover Glow Effect */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full transition-all duration-300 ${currentView === item.id ? 'opacity-100' : 'opacity-0'}`} />

            <span className={`transition-transform duration-300 relative ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
              {item.hasNotif && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />}
            </span>
            <span className="font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all hover:scale-[1.02]"
        >
          <LogOut size={20} />
          <span className="font-medium font-sans">Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
};

export default Navigation;
