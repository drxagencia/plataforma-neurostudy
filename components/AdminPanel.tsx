
import React, { useState, useEffect } from 'react';
import { UserProfile, Lead, RechargeRequest, UserPlan, SupportTicket } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, Eye, EyeOff, X, Smartphone, Calendar, CreditCard, DollarSign, TrendingUp } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'finance' | 'support'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [targetLead, setTargetLead] = useState<Lead | null>(null); 
  const [accessForm, setAccessForm] = useState({ displayName: '', email: '', password: '', plan: 'basic' as UserPlan, essayCredits: 8, expiryDate: '' });

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
      setLoading(true);
      if (activeTab === 'users') DatabaseService.getUsersPaginated(300).then(u => setUsers(u.filter(x => x.uid !== 'placeholder')));
      if (activeTab === 'leads') DatabaseService.getLeads().then(l => setLeads(l.reverse()));
      if (activeTab === 'finance') DatabaseService.getRechargeRequests().then(r => setRecharges(r.reverse()));
      setLoading(false);
  };

  const calculateDaysRemaining = (expiryStr?: string) => {
      if (!expiryStr) return 0;
      const diff = new Date(expiryStr).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getWhatsAppLink = (phone: string, name: string, plan: string, days: number) => {
      const msg = `Olá ${name}! Vi que seu plano ${plan.toUpperCase()} vence em ${days} dias. Gostaria de renovar seu acesso para continuar estudando com a IA?`;
      return `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const handleOpenAccessModal = (lead: Lead) => {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      setTargetLead(lead);
      setAccessForm({ 
          displayName: lead.name, 
          email: lead.contact, 
          password: lead.password || 'estudante123', 
          plan: lead.planId.toLowerCase().includes('adv') ? 'advanced' : 'basic', 
          essayCredits: lead.planId.toLowerCase().includes('adv') ? 30 : 8, 
          expiryDate: expiry.toISOString().split('T')[0] 
      });
      setShowUserModal(true);
  };

  const handleSubmitAccess = async () => {
      if (!targetLead) return;
      setLoading(true);
      try {
          const uid = await AuthService.registerStudent(accessForm.email, accessForm.password, accessForm.displayName);
          await DatabaseService.createUserProfile(uid, {
              ...accessForm,
              uid,
              totalSpent: targetLead.amount,
              billingCycle: targetLead.billing,
              subscriptionExpiry: accessForm.expiryDate,
              firstTimeSetupDone: false
          });
          await DatabaseService.markLeadProcessed(targetLead.id, targetLead.amount, uid);
          setShowUserModal(false);
          fetchData();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Gestor Admin</h2>
              <p className="text-slate-400">Controle de faturamento, leads e alunos.</p>
          </div>
          <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-white/10">
              {['leads', 'users', 'finance', 'support'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* ABAS LEADS */}
      {activeTab === 'leads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (
                  <div key={l.id} className={`glass-card p-6 rounded-2xl border transition-all ${l.processed ? 'opacity-50 grayscale border-white/5' : 'border-yellow-500/30'}`}>
                      <div className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-xl mb-4 text-center">
                          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Pagador PIX</p>
                          <p className="text-white font-bold text-lg">{l.payerName || 'Não identificado'}</p>
                      </div>
                      <div className="space-y-2 mb-6">
                          <div><p className="text-[10px] text-slate-500 uppercase font-bold">Usuário</p><p className="text-white font-bold">{l.name}</p></div>
                          <div><p className="text-[10px] text-slate-500 uppercase font-bold">E-mail Sugerido</p><p className="text-xs text-indigo-400 font-mono">{l.contact}</p></div>
                          <div className="flex items-center justify-between bg-black/30 p-2 rounded-lg">
                              <span className="text-xs font-mono text-slate-400">{showPassMap[l.id] ? l.password : '••••••••'}</span>
                              <button onClick={() => setShowPassMap(p => ({...p, [l.id]: !p[l.id]}))}>{showPassMap[l.id] ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-white/5">
                              <span className="text-xs text-slate-300 font-bold">{l.planId} ({l.billing})</span>
                              <span className="text-emerald-400 font-black">R$ {l.amount.toFixed(2)}</span>
                          </div>
                      </div>
                      {!l.processed && (
                          <button onClick={() => handleOpenAccessModal(l)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20">
                              <CheckCircle size={18}/> Aprovar Acesso
                          </button>
                      )}
                  </div>
              ))}
          </div>
      )}

      {/* ABA USERS */}
      {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase())).map(u => {
                  const daysLeft = calculateDaysRemaining(u.subscriptionExpiry);
                  const isExpiring = daysLeft > 0 && daysLeft <= 7;
                  return (
                      <div key={u.uid} className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-4">
                                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-12 h-12 rounded-full border border-white/10" />
                                  <div><h4 className="font-bold text-white">{u.displayName}</h4><p className="text-xs text-slate-500">{u.email}</p></div>
                              </div>
                              <div className="text-right"><p className="text-[10px] text-slate-500 font-bold uppercase">LTV (Gasto Total)</p><p className="text-xl font-black text-emerald-400">R$ {(u.totalSpent || 0).toFixed(2)}</p></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className={`p-3 rounded-xl border ${isExpiring ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/50 border-white/5'}`}>
                                  <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Plano {u.plan?.toUpperCase()}</p>
                                  <span className={`font-black ${isExpiring ? 'text-red-400' : 'text-white'}`}>{daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}</span>
                                  <p className="text-[9px] text-slate-600">Expira: {u.subscriptionExpiry || 'N/A'}</p>
                              </div>
                              <div className="p-3 bg-slate-900/50 border border-white/5 rounded-xl">
                                  <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Extras</p>
                                  <div className="text-[10px] space-y-1">
                                      <div className="flex justify-between"><span>IA Ilimitada:</span><span className={u.aiUnlimitedExpiry ? 'text-emerald-400' : 'text-slate-600'}>{u.aiUnlimitedExpiry ? 'Ativo' : 'OFF'}</span></div>
                                      <div className="flex justify-between"><span>Redação:</span><span className="text-indigo-400">{u.essayCredits || 0} cr</span></div>
                                  </div>
                              </div>
                          </div>
                          <div className="pt-4 border-t border-white/5 flex gap-2">
                              {u.whatsapp && (
                                  <a href={getWhatsAppLink(u.whatsapp, u.displayName, u.plan || 'basic', daysLeft)} target="_blank" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                                      <Smartphone size={18}/> Aviso Renovação
                                  </a>
                              )}
                              <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all border border-white/5">Ajustar Planos</button>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {/* FINANCE TAB */}
      {activeTab === 'finance' && (
          <div className="space-y-4">
              {recharges.map(r => (
                  <div key={r.id} className="glass-card p-4 rounded-xl flex justify-between items-center border border-white/5">
                      <div><p className="font-bold text-white">R$ {r.amount.toFixed(2)} - {r.userDisplayName}</p><p className="text-[10px] text-indigo-400 font-bold uppercase">{r.planLabel || 'Recarga'}</p></div>
                      {r.status === 'pending' ? (
                          <div className="flex gap-2">
                              <button onClick={() => DatabaseService.processRecharge(r.id, 'rejected').then(fetchData)} className="p-2 bg-red-900/50 text-red-400 rounded-lg"><XCircle size={18}/></button>
                              <button onClick={() => DatabaseService.processRecharge(r.id, 'approved').then(fetchData)} className="p-2 bg-emerald-600 text-white rounded-lg"><CheckCircle size={18}/></button>
                          </div>
                      ) : (
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>{r.status}</span>
                      )}
                  </div>
              ))}
          </div>
      )}

      {/* MODAL APROVAR */}
      {showUserModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black text-white">Criar Acesso Aluno</h3><button onClick={() => setShowUserModal(false)}><X size={24}/></button></div>
                  <div className="space-y-4">
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase">Email</label><input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.email} onChange={e => setAccessForm({...accessForm, email: e.target.value})} /></div>
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase">Senha</label><input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.password} onChange={e => setAccessForm({...accessForm, password: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase">Plano</label><select className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.plan} onChange={e => setAccessForm({...accessForm, plan: e.target.value as any})}><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase">Expiração</label><input type="date" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.expiryDate} onChange={e => setAccessForm({...accessForm, expiryDate: e.target.value})} /></div>
                      </div>
                      <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/20"><p className="text-indigo-400 font-bold text-xs">Venda: R$ {targetLead?.amount.toFixed(2)}</p></div>
                      <button onClick={handleSubmitAccess} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20}/>} Criar Conta e Liberar Acesso
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
