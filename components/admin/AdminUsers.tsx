
import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction } from '../../types';
import { DatabaseService } from '../../services/databaseService';
import { 
  Search, Loader2, RefreshCw, Edit, X, Save, 
  Calendar, CreditCard, Shield, Zap, FileText, History, CheckCircle
} from 'lucide-react';

const AdminUsers: React.FC = () => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [loadingTrans, setLoadingTrans] = useState(false);
  
  // Edit Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const data = await DatabaseService.getAllUsers();
        setAllUsers(data.sort((a,b) => (b.totalSpent || 0) - (a.totalSpent || 0)));
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleEditClick = async (user: UserProfile) => {
      setSelectedUser(user);
      setFormData(user); 
      setLoadingTrans(true);
      try {
          const trans = await DatabaseService.getUserTransactions(user.uid);
          setUserTransactions(trans.sort((a,b) => b.timestamp - a.timestamp));
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingTrans(false);
      }
  };

  const handleSave = async () => {
      if (!selectedUser || !formData) return;
      if (!confirm("Confirmar alterações nos dados do usuário?")) return;

      try {
          await DatabaseService.saveUserProfile(selectedUser.uid, formData);
          alert("Dados atualizados com sucesso!");
          setSelectedUser(null);
          fetchUsers(); 
      } catch (e) {
          alert("Erro ao salvar.");
      }
  };

  const filteredUsers = allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDateForInput = (isoDate?: string | number) => {
      if (!isoDate) return '';
      const d = new Date(isoDate);
      return d.toISOString().split('T')[0];
  };

  if (loading && allUsers.length === 0) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in relative">
        {/* --- LISTA PRINCIPAL --- */}
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
                            <th className="p-4">Usuário</th>
                            <th className="p-4">Plano Ativo</th>
                            <th className="p-4">LTV (Gasto Total)</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map(user => (
                            <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                            {user.displayName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{user.displayName}</p>
                                            <p className="text-[10px] text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${user.plan === 'advanced' ? 'bg-indigo-600 text-white' : user.plan === 'admin' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {user.plan}
                                    </span>
                                    {user.essayPlanType && (
                                        <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold uppercase">
                                            Red. {user.essayPlanType}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className="font-mono font-bold text-emerald-400">R$ {(user.totalSpent || 0).toFixed(2)}</span>
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleEditClick(user)}
                                        className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                                    >
                                        <Edit size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- MODAL DE EDIÇÃO DETALHADA --- */}
        {selectedUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-slate-950 border border-white/10 w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh]">
                    
                    {/* Header Modal */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                {selectedUser.displayName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedUser.displayName}</h3>
                                <p className="text-slate-400 text-xs flex items-center gap-2">
                                    ID: <span className="font-mono bg-black/30 px-1 rounded">{selectedUser.uid}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors">
                                <Save size={18}/> Salvar
                            </button>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                        
                        {/* Seção 1: Plano Principal */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <Shield size={14}/> Assinatura Principal
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Plano Ativo</label>
                                    <select 
                                        value={formData.plan} 
                                        onChange={e => setFormData({...formData, plan: e.target.value as any})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500"
                                    >
                                        <option value="basic">Basic</option>
                                        <option value="advanced">Advanced</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Ciclo</label>
                                    <select 
                                        value={formData.billingCycle || 'monthly'} 
                                        onChange={e => setFormData({...formData, billingCycle: e.target.value as any})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500"
                                    >
                                        <option value="monthly">Mensal</option>
                                        <option value="yearly">Anual</option>
                                    </select>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Expiração</label>
                                    <input 
                                        type="date"
                                        value={formatDateForInput(formData.subscriptionExpiry)}
                                        onChange={e => setFormData({...formData, subscriptionExpiry: e.target.value})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Plano de Redação (NOVO) */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14}/> Plano de Redação
                            </h4>
                            <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Nível do Plano</label>
                                    <select 
                                        value={formData.essayPlanType || ''}
                                        onChange={e => setFormData({...formData, essayPlanType: e.target.value as any || null})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-emerald-500"
                                    >
                                        <option value="">Sem Plano</option>
                                        <option value="basic">Básico (1/sem)</option>
                                        <option value="medium">Médio (2/sem)</option>
                                        <option value="advanced">Avançado (4/sem)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Créditos (Saldo)</label>
                                    <input 
                                        type="number"
                                        value={formData.essayCredits || 0}
                                        onChange={e => setFormData({...formData, essayCredits: parseInt(e.target.value)})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Vencimento Redação</label>
                                    <input 
                                        type="date"
                                        value={formatDateForInput(formData.essayPlanExpiry)}
                                        onChange={e => setFormData({...formData, essayPlanExpiry: e.target.value})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seção 3: Outros Recursos */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={14}/> Outros Recursos
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Saldo IA (R$)</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={formData.balance || 0}
                                        onChange={e => setFormData({...formData, balance: parseFloat(e.target.value)})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white font-mono text-sm"
                                    />
                                </div>
                                <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Vencimento IA Ilimitada</label>
                                    <input 
                                        type="date"
                                        value={formatDateForInput(formData.aiUnlimitedExpiry)}
                                        onChange={e => setFormData({...formData, aiUnlimitedExpiry: e.target.value})}
                                        className="w-full bg-black border border-slate-700 rounded-lg p-2 text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Histórico */}
                        <div className="pt-4 border-t border-white/5">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Histórico</h4>
                            <div className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                {loadingTrans ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin"/></div> : (
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-white/5 text-slate-500 uppercase font-bold sticky top-0"><tr><th className="p-3">Data</th><th className="p-3">Desc</th><th className="p-3 text-right">Valor</th></tr></thead>
                                        <tbody>
                                            {userTransactions.map(t => (
                                                <tr key={t.id} className="hover:bg-white/5"><td className="p-3 text-slate-400">{new Date(t.timestamp).toLocaleDateString()}</td><td className="p-3 text-white">{t.description}</td><td className="p-3 text-right text-emerald-400">R$ {t.amount.toFixed(2)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminUsers;
