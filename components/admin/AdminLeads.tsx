
import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import { DatabaseService } from '../../services/databaseService';
import { AuthService } from '../../services/authService';
import { Smartphone, CheckCircle, Trash2, Loader2, RefreshCw, Calendar, CreditCard, User, AlertCircle } from 'lucide-react';

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
        // Filtra para mostrar pendentes ou não processados primeiro
        setLeads(data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
        console.error("Error fetching leads", error);
    } finally {
        setLoading(false);
    }
  };

  const handleApproveLead = async (lead: Lead) => {
      const confirmMsg = `APROVAR ACESSO?\n\nAluno: ${lead.name}\nPlano: ${lead.planId}\nValor: R$ ${lead.amount}`;
      if (!confirm(confirmMsg)) return;
      
      setLoading(true);
      try {
          // 1. Criar conta de autenticação (Secondary App para não deslogar Admin)
          const uid = await AuthService.registerStudent(lead.contact, lead.password || 'estudante123', lead.name);
          
          // 2. Criar perfil no Database
          await DatabaseService.createUserProfile(uid, {
              uid,
              displayName: lead.name,
              email: lead.contact,
              // Mapeia planId do Lead para plan do UserProfile
              plan: lead.planId.toLowerCase().includes('pro') || lead.planId.toLowerCase().includes('advanced') ? 'advanced' : 'basic',
              billingCycle: lead.billing,
              balance: 0,
              essayCredits: lead.planId.toLowerCase().includes('pro') ? 10 : 0, // Bônus inicial para Pro
              totalSpent: lead.amount,
              whatsapp: lead.contact, // Usa o contato como whatsapp inicial
              firstTimeSetupDone: false
          });

          // 3. Deletar permanentemente do banco
          await DatabaseService.deleteLead(lead.id);
          
          alert(`Sucesso! Aluno criado com UID: ${uid}`);
          fetchLeads();
      } catch (e: any) { 
          alert(`Erro no processo: ${e.message}`); 
      } finally { 
          setLoading(false); 
      }
  };

  const handleRejectLead = async (lead: Lead) => {
      if (!confirm("Isso irá abrir o WhatsApp e deletar a solicitação. Confirmar?")) return;
      setLoading(true);
      try {
          // 1. Open WhatsApp
          const phone = lead.contact.replace(/\D/g, '');
          const message = encodeURIComponent(`Olá ${lead.name}, aqui é do suporte NeuroStudy. Vimos sua tentativa de inscrição no plano ${lead.planId}. Houve um problema com o comprovante ou dados. Poderia reenviar?`);
          window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

          // 2. Delete request
          await DatabaseService.deleteLead(lead.id);
          fetchLeads();
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-[2rem] border border-white/5">
            <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Smartphone className="text-emerald-400" /> Inscrições Pendentes
                </h3>
                <p className="text-slate-400 text-sm">Gerencie solicitações de acesso via PIX Anual/Manual.</p>
            </div>
            <button onClick={fetchLeads} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors">
                <RefreshCw size={20} />
            </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {leads.length > 0 ? leads.map(lead => (
                <div key={lead.id} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <CreditCard size={100} />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        {/* Info Principal */}
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xl border border-white/10">
                                {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                    {lead.name}
                                    {lead.status === 'approved_access' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">Aprovado</span>}
                                </h4>
                                <p className="text-slate-400 text-sm flex items-center gap-2">
                                    <User size={12} /> {lead.contact}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20 font-bold uppercase">
                                        {lead.planId.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-white/5 flex items-center gap-1">
                                        <Calendar size={10} /> {lead.billing === 'yearly' ? 'Anual' : 'Mensal'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Detalhes Financeiros */}
                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 min-w-[200px]">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Detalhes do Pagamento</p>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-400 text-xs">Valor:</span>
                                <span className="text-emerald-400 font-mono font-bold text-lg">R$ {lead.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs">Pagador:</span>
                                <span className="text-white text-xs font-medium truncate max-w-[120px]">{lead.pixIdentifier || lead.payerName || 'N/A'}</span>
                            </div>
                            <div className="mt-2 text-[10px] text-slate-600 text-right">
                                {new Date(lead.timestamp).toLocaleString()}
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => handleApproveLead(lead)}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
                            >
                                <CheckCircle size={18} /> Aprovar Acesso
                            </button>
                            <button 
                                onClick={() => handleRejectLead(lead)}
                                className="px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 font-bold rounded-xl border border-red-500/20 flex items-center justify-center gap-2 transition-all"
                            >
                                <Trash2 size={18} /> Rejeitar e Contatar
                            </button>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem]">
                    <AlertCircle size={48} className="mx-auto text-slate-600 mb-4 opacity-50" />
                    <h3 className="text-xl font-bold text-white mb-2">Nenhuma solicitação pendente</h3>
                    <p className="text-slate-500">O sistema está aguardando novos leads via PIX.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default AdminLeads;
