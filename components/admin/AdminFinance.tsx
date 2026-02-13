
import React, { useState, useEffect } from 'react';
import { RechargeRequest } from '../../types';
import { DatabaseService } from '../../services/databaseService';
import { DollarSign, Loader2, RefreshCw } from 'lucide-react';

const AdminFinance: React.FC = () => {
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const data = await DatabaseService.getRechargeRequests();
        setRechargeRequests(data.sort((a,b) => b.timestamp - a.timestamp));
    } catch (error) {
        console.error("Error fetching finance data", error);
    } finally {
        setLoading(false);
    }
  };

  const handleProcessRecharge = async (req: RechargeRequest, status: 'approved' | 'rejected') => {
      if (!confirm(`Confirmar ${status === 'approved' ? 'APROVAÇÃO' : 'REJEIÇÃO'} da recarga de R$ ${req.amount}?`)) return;
      setLoading(true);
      try {
          await DatabaseService.processRecharge(req.id, status);
          fetchData();
      } catch (e) {
          console.error(e);
          alert("Erro ao processar.");
      } finally {
          setLoading(false);
      }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden border-white/10 animate-in fade-in">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2"><DollarSign size={18}/> Solicitações de Recarga (Saldo/Redação)</h3>
            <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><RefreshCw size={14} className="text-slate-400"/></button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    <tr>
                        <th className="p-4">Aluno</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Valor R$</th>
                        <th className="p-4">Quantidade</th>
                        <th className="p-4">Data</th>
                        <th className="p-4 text-center">Status / Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {rechargeRequests.map(req => (
                        <tr key={req.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                                <p className="font-bold text-white text-sm">{req.userDisplayName}</p>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase">{req.planLabel || 'Recarga Avulsa'}</p>
                            </td>
                            <td className="p-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded ${req.currencyType === 'BRL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                    {req.currencyType === 'BRL' ? 'SALDO IA' : 'REDAÇÃO'}
                                </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-white text-sm">R$ {req.amount.toFixed(2)}</td>
                            <td className="p-4 text-xs font-bold text-white">{req.quantityCredits || '-'}</td>
                            <td className="p-4 text-[10px] text-slate-500">{new Date(req.timestamp).toLocaleString()}</td>
                            <td className="p-4">
                                {req.status === 'pending' ? (
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleProcessRecharge(req, 'approved')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase transition-all">Aprovar</button>
                                        <button onClick={() => handleProcessRecharge(req, 'rejected')} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all">Recusar</button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <span className={`text-[10px] font-black uppercase ${req.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>{req.status}</span>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rechargeRequests.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-500 font-bold uppercase italic tracking-widest opacity-30">Sem solicitações recentes</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default AdminFinance;
    