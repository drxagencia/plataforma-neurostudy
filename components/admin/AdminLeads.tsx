
import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import { DatabaseService } from '../../services/databaseService';
import { AuthService } from '../../services/authService';
import { Smartphone, CheckCircle, Trash2, Loader2, RefreshCw } from 'lucide-react';

const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
        const data = await DatabaseService.getLeads();
        setLeads(data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
        console.error("Error fetching leads", error);
    } finally {
        setLoading(false);
    }
  };

  const handleApproveLead = async (lead: Lead) => {
      if (!confirm(`Aprovar acesso para ${lead.name}?`)) return;
      setLoading(true);
      try {
          const uid = await AuthService.registerStudent(lead.contact, lead.password || 'estudante123', lead.name);
          await DatabaseService.createUserProfile(uid, {
              uid,
              displayName: lead.name,
              email: lead.contact,
              plan: lead.planId.toLowerCase() as any,
              billingCycle: lead.billing,
              balance: 0,
              essayCredits: lead.planId === 'Advanced' ? 10 : 0,
              totalSpent: lead.amount,
              whatsapp: lead.pixIdentifier || ''
          });
          await DatabaseService.markLeadProcessed(lead.id);
          fetchLeads();
      } catch (e: any) { 
          alert(e.message); 
      } finally { 
          setLoading(false); 
      }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden border-white/10 animate-in fade-in">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2"><Smartphone size={18}/> Inscrições Pendentes (Pix Anual)</h3>
            <div className="flex items-center gap-2">
                <button onClick={fetchLeads} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><RefreshCw size={14} className="text-slate-400"/></button>
                <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-1 rounded">{leads.length} AGUARDANDO</span>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    <tr>
                        <th className="p-4">Aluno / Contato</th>
                        <th className="p-4">Plano Escolhido</th>
                        <th className="p-4">Pagador Pix</th>
                        <th className="p-4">Valor</th>
                        <th className="p-4">Data</th>
                        <th className="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {leads.map(lead => (
                        <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                                <p className="font-bold text-white text-sm">{lead.name}</p>
                                <p className="text-xs text-slate-500">{lead.contact}</p>
                            </td>
                            <td className="p-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded ${lead.planId === 'Advanced' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                                    {lead.planId} ({lead.billing})
                                </span>
                            </td>
                            <td className="p-4 text-xs font-medium text-emerald-400 uppercase">{lead.payerName || lead.name}</td>
                            <td className="p-4 font-mono font-bold text-white text-sm">R$ {lead.amount.toFixed(2)}</td>
                            <td className="p-4 text-[10px] text-slate-500">{new Date(lead.timestamp).toLocaleDateString()}</td>
                            <td className="p-4">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => handleApproveLead(lead)} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all" title="Aprovar Pix e Criar Conta"><CheckCircle size={16}/></button>
                                    <button onClick={() => DatabaseService.markLeadProcessed(lead.id).then(fetchLeads)} className="p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {leads.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-500 font-bold uppercase italic tracking-widest opacity-30">Nenhuma solicitação pendente</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default AdminLeads;
    