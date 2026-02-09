
import React, { useState, useEffect } from 'react';
import { UserProfile, Lead, RechargeRequest, UserPlan, SupportTicket } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, Eye, EyeOff, X, Video, Smartphone, Calendar, Shield, CreditCard, ChevronRight, MessageSquare, Send, DollarSign, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'content' | 'finance' | 'support' | 'traffic'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Access Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [targetLead, setTargetLead] = useState<Lead | null>(null); 
  const [accessForm, setAccessForm] = useState({ displayName: '', email: '', password: '', plan: 'basic' as UserPlan, essayCredits: 8, balance: 0, expiryDate: '' });

  useEffect(() => {
      fetchData();
  }, [activeTab]);

  const fetchData = async () => {
      setLoading(true);
      if (activeTab === 'users') DatabaseService.getUsersPaginated(200).then(u => setUsers(u.filter(x => x.uid !== 'student_uid_placeholder')));
      if (activeTab === 'leads') DatabaseService.getLeads().then(l => setLeads(l.reverse()));
      if (activeTab === 'finance') DatabaseService.getRechargeRequests().then(r => setRecharges(r.reverse()));
      if (activeTab === 'support') DatabaseService.getAllSupportTickets().then(t => setSupportTickets(t.sort((a,b) => b.lastUpdated - a.lastUpdated)));
      setLoading(false);
  };

  const togglePass = (id: string) => setShowPassMap(prev => ({ ...prev, [id]: !prev[id] }));

  const calculateDaysRemaining = (expiryStr?: string) => {
      if (!expiryStr) return 0;
      const expiry = new Date(expiryStr);
      const today = new Date();
      const diff = expiry.getTime() - today.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getWhatsAppLink = (phone: string, name: string, plan: string, days: number) => {
      const msg = `Olá ${name.split(' ')[0]}! Aqui é da NeuroStudy. Notamos que seu plano ${plan.toUpperCase()} vence em ${days} dias. Gostaria de garantir sua renovação agora?`;
      return `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const handleOpenAccessModal = (lead: Lead) => {
      const nextYear = new Date(); nextYear.setDate(nextYear.getDate() + 30);
      const defaultExpiry = nextYear.toISOString().split('T')[0];
      setTargetLead(lead);
      setAccessForm({ 
          displayName: lead.name, 
          email: lead.contact, 
          password: lead.password || 'mudar123', 
          plan: lead.planId.toLowerCase().includes('adv') ? 'advanced' : 'basic', 
          essayCredits: lead.planId.toLowerCase().includes('adv') ? 30 : 8, 
          balance: lead.planId.toLowerCase().includes('adv') ? 5 : 0, 
          expiryDate: defaultExpiry 
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
              xp: 0,
              totalSpent: targetLead.amount,
              billingCycle: targetLead.billing,
              subscriptionExpiry: accessForm.expiryDate,
              firstTimeSetupDone: false
          });
          await DatabaseService.markLeadProcessed(targetLead.id, targetLead.amount, uid);
          alert("Acesso liberado com sucesso!");
          setShowUserModal(false);
          fetchData();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
          <div>
              <h2 className="text-3xl font-bold text-white mb-2">Painel Administrativo</h2>
              <p className="text-slate-400">Gestão de Leads, Alunos e LTV.</p>
          </div>
          <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-white/10 overflow-x-auto">
              {['leads', 'users', 'finance', 'support', 'content', 'traffic'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      {/* SEARCH BAR (Visible for Users/Leads) */}
      {(activeTab === 'users' || activeTab === 'leads') && (
          <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none" 
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
      )}

      {/* ================= LEADS TAB ================= */}
      {activeTab === 'leads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (
                  <div key={l.id} className={`glass-card p-6 rounded-2xl border transition-all relative overflow-hidden flex flex-col ${l.processed ? 'border-emerald-500/20 opacity-60' : 'border-yellow-500/30 shadow-lg shadow-yellow-900/10'}`}>
                      
                      {/* Payer Highlight (PIX) */}
                      <div className="bg-emerald-900/40 border border-emerald-500/30 p-3 rounded-xl mb-4">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Pagador do PIX</p>
                          <p className="text-white font-black text-lg">{l.payerName || 'Não informado'}</p>
                      </div>

                      <div className="space-y-3 mb-6">
                          <div>
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Dados do Usuário</p>
                              <p className="text-white font-bold">{l.name}</p>
                              <p className="text-xs text-indigo-400 font-mono">{l.contact}</p>
                          </div>

                          <div className="bg-black/20 p-2 rounded-lg flex items-center justify-between">
                              <div className="flex-1">
                                  <p className="text-[9px] text-slate-600 uppercase font-bold">Senha Sugerida</p>
                                  <p className="text-xs font-mono text-slate-300">
                                      {showPassMap[l.id] ? l.password : '••••••••'}
                                  </p>
                              </div>
                              <button onClick={() => togglePass(l.id)} className="p-1 hover:text-white text-slate-500">
                                  {showPassMap[l.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                              </button>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                              <div>
                                  <p className="text-[10px] text-slate-500 uppercase font-bold">Plano Escolhido</p>
                                  <p className="text-xs text-slate-300 font-bold">{l.planId} ({l.billing})</p>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold">Valor</p>
                                  <p className="text-lg font-black text-emerald-400">R$ {l.amount.toFixed(2)}</p>
                              </div>
                          </div>
                      </div>

                      {!l.processed ? (
                          <button 
                            onClick={() => handleOpenAccessModal(l)}
                            className="mt-auto w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
                          >
                              <CheckCircle size={18}/> Aprovar Acesso
                          </button>
                      ) : (
                          <div className="mt-auto text-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                              <span className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-2"><CheckCircle size={14}/> Já Aprovado</span>
                          </div>
                      )}
                  </div>
              ))}
              {leads.length === 0 && <p className="text-slate-500 col-span-full text-center py-20">Nenhum lead encontrado.</p>}
          </div>
      )}

      {/* ================= USERS TAB ================= */}
      {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase())).map(u => {
                  const daysLeft = calculateDaysRemaining(u.subscriptionExpiry);
                  const isExpiring = daysLeft > 0 && daysLeft <= 7;
                  
                  return (
                      <div key={u.uid} className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col gap-6 group">
                          
                          {/* Top: Profile & LTV */}
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-full border-2 border-indigo-500/30 overflow-hidden">
                                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-white text-lg">{u.displayName}</h4>
                                      <p className="text-xs text-slate-400">{u.email}</p>
                                      {u.whatsapp && <p className="text-[10px] text-indigo-400 font-bold mt-1 flex items-center gap-1"><Smartphone size={10}/> {u.whatsapp}</p>}
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Gasto Total (LTV)</p>
                                  <p className="text-xl font-black text-emerald-400">R$ {(u.totalSpent || 0).toFixed(2)}</p>
                              </div>
                          </div>

                          {/* Center: Plan Grid */}
                          <div className="grid grid-cols-2 gap-4">
                              <div className={`p-4 rounded-xl border ${isExpiring ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-slate-900/50 border-white/5'}`}>
                                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Assinatura ({u.plan?.toUpperCase()})</p>
                                  <div className="flex items-end justify-between">
                                      <span className={`text-xl font-black ${isExpiring ? 'text-red-400' : 'text-white'}`}>
                                          {daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}
                                      </span>
                                      <Calendar size={16} className="text-slate-600" />
                                  </div>
                                  <p className="text-[9px] text-slate-600 mt-1">Vence em: {u.subscriptionExpiry || 'N/A'}</p>
                              </div>

                              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Outros Planos</p>
                                  <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">IA Ilimitada:</span>
                                          <span className={u.aiUnlimitedExpiry ? 'text-emerald-400' : 'text-slate-600'}>
                                              {u.aiUnlimitedExpiry ? 'Ativa' : 'Off'}
                                          </span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                          <span className="text-slate-400">Redação:</span>
                                          <span className="text-indigo-300 font-bold">{u.essayCredits || 0} creds</span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Bottom: Actions */}
                          <div className="pt-4 border-t border-white/5 flex gap-2">
                              {u.whatsapp && (
                                  <a 
                                    href={getWhatsAppLink(u.whatsapp, u.displayName, u.plan || 'basic', daysLeft)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                                  >
                                      <Smartphone size={18}/> Aviso Renovação
                                  </a>
                              )}
                              <button 
                                onClick={() => { /* Modal para editar manualmente créditos/planos */ }}
                                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all border border-white/5"
                              >
                                  Editar Planos
                              </button>
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
                      <div>
                          <p className="font-bold text-white">R$ {r.amount.toFixed(2)} - {r.userDisplayName}</p>
                          <p className="text-[10px] text-indigo-400 uppercase font-bold">{r.planLabel || 'Recarga'}</p>
                      </div>
                      {r.status === 'pending' ? (
                          <div className="flex gap-2">
                              <button onClick={() => DatabaseService.processRecharge(r.id, 'rejected').then(fetchData)} className="p-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 transition-colors"><XCircle size={18}/></button>
                              <button onClick={() => DatabaseService.processRecharge(r.id, 'approved').then(fetchData)} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"><CheckCircle size={18}/></button>
                          </div>
                      ) : (
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>{r.status}</span>
                      )}
                  </div>
              ))}
          </div>
      )}

      {/* MODAL: APROVAR ACESSO (Otimizado) */}
      {showUserModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-white">Aprovar Novo Aluno</h3>
                      <button onClick={() => setShowUserModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Email de Acesso (Sugerido)</label>
                          <input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.email} onChange={e => setAccessForm({...accessForm, email: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Senha de Acesso</label>
                          <input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.password} onChange={e => setAccessForm({...accessForm, password: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold">Plano</label>
                              <select className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.plan} onChange={e => setAccessForm({...accessForm, plan: e.target.value as any})}>
                                  <option value="basic">Básico</option>
                                  <option value="advanced">Advanced</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 uppercase font-bold">Expiração</label>
                              <input type="date" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white" value={accessForm.expiryDate} onChange={e => setAccessForm({...accessForm, expiryDate: e.target.value})} />
                          </div>
                      </div>
                      
                      <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/20">
                          <p className="text-indigo-400 font-bold text-xs flex items-center gap-2 mb-2"><DollarSign size={14}/> Faturamento: R$ {targetLead?.amount.toFixed(2)}</p>
                          <p className="text-slate-400 text-[10px]">O valor será adicionado ao LTV do usuário automaticamente.</p>
                      </div>

                      <button 
                        onClick={handleSubmitAccess}
                        disabled={loading}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20}/>}
                          Confirmar e Criar Conta
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
