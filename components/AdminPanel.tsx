
import React, { useState } from 'react';
import { 
  Users, DollarSign, BookOpen, Smartphone
} from 'lucide-react';
import AdminLeads from './admin/AdminLeads';
import AdminContent from './admin/AdminContent';
import AdminFinance from './admin/AdminFinance';
import AdminUsers from './admin/AdminUsers';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'finance' | 'content'>('leads');

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Painel de Controle</h2>
              <p className="text-slate-400 text-sm">Gerencie o ecossistema NeuroStudy AI.</p>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
              {[
                  { id: 'leads', label: 'Aguardando Pix', icon: Smartphone },
                  { id: 'users', label: 'Alunos', icon: Users },
                  { id: 'finance', label: 'Aprovações', icon: DollarSign },
                  { id: 'content', label: 'Conteúdo', icon: BookOpen }
              ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                      <tab.icon size={14} />
                      {tab.label}
                  </button>
              ))}
          </div>
      </div>

      <div className="min-h-[500px]">
          {activeTab === 'leads' && <AdminLeads />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'finance' && <AdminFinance />}
          {activeTab === 'content' && <AdminContent />}
      </div>
    </div>
  );
};

export default AdminPanel;
    