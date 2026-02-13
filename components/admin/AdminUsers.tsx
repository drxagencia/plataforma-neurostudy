
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { DatabaseService } from '../../services/databaseService';
import { Search, Loader2, RefreshCw } from 'lucide-react';

const AdminUsers: React.FC = () => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const data = await DatabaseService.getAllUsers();
        setAllUsers(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && allUsers.length === 0) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in">
        <div className="flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                <input 
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none" 
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button onClick={fetchUsers} className="bg-slate-900 border border-white/10 px-4 rounded-2xl text-slate-400 hover:text-white transition-colors"><RefreshCw size={20}/></button>
        </div>

        <div className="glass-card rounded-[2rem] overflow-hidden border-white/10">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        <tr>
                            <th className="p-4">Aluno</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4">Ciclo</th>
                            <th className="p-4">NeuroAI Saldo</th>
                            <th className="p-4">Redação (Créditos)</th>
                            <th className="p-4">LTV (Gasto Total)</th>
                            <th className="p-4">XP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map(user => (
                            <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <p className="font-bold text-white text-sm">{user.displayName}</p>
                                    <p className="text-[10px] text-slate-500">{user.email}</p>
                                    {user.whatsapp && <p className="text-[9px] text-emerald-500/70">{user.whatsapp}</p>}
                                </td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${user.plan === 'advanced' ? 'bg-indigo-600 text-white' : user.plan === 'admin' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {user.plan}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="text-xs text-slate-400 uppercase font-medium">{user.billingCycle || 'Mensal'}</span>
                                </td>
                                <td className={`p-4 font-mono text-sm ${user.balance > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                    R$ {(user.balance || 0).toFixed(2)}
                                </td>
                                <td className="p-4 font-bold text-white">
                                    {user.essayCredits || 0}
                                </td>
                                <td className="p-4 font-bold text-indigo-400">
                                    R$ {(user.totalSpent || 0).toFixed(2)}
                                </td>
                                <td className="p-4 text-xs font-black text-yellow-500">
                                    {user.xp || 0} XP
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-500">Nenhum aluno encontrado</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default AdminUsers;
    