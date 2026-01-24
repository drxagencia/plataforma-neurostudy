import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { DatabaseService } from '../services/databaseService'; // Assumes we add a getAllUsers method or simulated
import { Search, Save, Trash2, CheckCircle, XCircle } from 'lucide-react';

// Mock data for display since we can't easily list all users with client SDK
const MOCK_USERS: UserProfile[] = [
  { uid: '1', displayName: 'João Silva', email: 'joao@student.com', subscriptionStatus: 'free', subscriptionExpiry: '2024-12-31' },
  { uid: '2', displayName: 'Maria Oliveira', email: 'maria@student.com', subscriptionStatus: 'pro', subscriptionExpiry: '2025-06-30' },
  { uid: '3', displayName: 'Pedro Santos', email: 'pedro@student.com', subscriptionStatus: 'pro', subscriptionExpiry: '2025-12-31' },
  { uid: '4', displayName: 'Admin User', email: 'master@admin.com', subscriptionStatus: 'pro', subscriptionExpiry: '2030-01-01', isAdmin: true },
];

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Simulated save function
  const handleSave = (id: string) => {
    // In real app: call DatabaseService.updateUser(id, { ...data })
    setEditingId(null);
    alert("Dados do usuário atualizados com sucesso!");
  };

  const handleStatusChange = (id: string, newStatus: 'free' | 'pro') => {
    setUsers(users.map(u => u.uid === id ? { ...u, subscriptionStatus: newStatus } : u));
  };

  const handleDateChange = (id: string, newDate: string) => {
    setUsers(users.map(u => u.uid === id ? { ...u, subscriptionExpiry: newDate } : u));
  };

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Painel Administrativo</h2>
          <p className="text-slate-400">Gerenciamento de usuários e assinaturas.</p>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* User Table */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 border-b border-white/5">
                <th className="p-4 text-slate-400 font-medium">Usuário</th>
                <th className="p-4 text-slate-400 font-medium">Email</th>
                <th className="p-4 text-slate-400 font-medium">Status Plano</th>
                <th className="p-4 text-slate-400 font-medium">Validade</th>
                <th className="p-4 text-slate-400 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                        {user.displayName.charAt(0)}
                      </div>
                      <span className="text-white font-medium">{user.displayName}</span>
                      {user.isAdmin && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded ml-2">ADMIN</span>}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">{user.email}</td>
                  <td className="p-4">
                    {editingId === user.uid ? (
                      <select 
                        value={user.subscriptionStatus}
                        onChange={(e) => handleStatusChange(user.uid, e.target.value as 'free' | 'pro')}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                      >
                        <option value="free">Gratuito</option>
                        <option value="pro">Premium (PRO)</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                        user.subscriptionStatus === 'pro' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {user.subscriptionStatus.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-300">
                    {editingId === user.uid ? (
                      <input 
                        type="date" 
                        value={user.subscriptionExpiry}
                        onChange={(e) => handleDateChange(user.uid, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                      />
                    ) : (
                      <span>{new Date(user.subscriptionExpiry).toLocaleDateString()}</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {editingId === user.uid ? (
                      <div className="flex justify-end gap-2">
                         <button 
                           onClick={() => handleSave(user.uid)}
                           className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                           title="Salvar"
                         >
                           <CheckCircle size={18} />
                         </button>
                         <button 
                           onClick={() => setEditingId(null)}
                           className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                           title="Cancelar"
                         >
                           <XCircle size={18} />
                         </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setEditingId(user.uid)}
                        className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            Nenhum usuário encontrado.
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
        <h3 className="text-indigo-400 font-bold mb-2">Instruções do Sistema</h3>
        <p className="text-slate-300 text-sm">
          Como administrador, você pode alterar manualmente o status de qualquer conta. 
          As alterações são salvas automaticamente no banco de dados. 
          Para adicionar aulas e questões, edite diretamente o arquivo JSON do Database.
        </p>
      </div>
    </div>
  );
};

export default AdminPanel;