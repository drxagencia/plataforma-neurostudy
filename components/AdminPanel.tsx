
import React, { useState, useEffect } from 'react';
import { UserProfile, Lead, RechargeRequest, UserPlan } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, Eye, EyeOff, X, Smartphone, Calendar, CreditCard, DollarSign, Edit, Send, UserCheck } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'finance' | 'support'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form de Criação (Leads)
  const [targetLead, setTargetLead] = useState<Lead | null>(null); 
  const [accessForm, setAccessForm] = useState({ displayName: '', email: '', password: '', plan: 'basic' as UserPlan, essayCredits: 0, expiryDate: '' });
  
  // Form de Edição (Users)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
      setLoading(true);
      if (activeTab === 'users') {
          const u = await DatabaseService.getUsersPaginated(500);
          setUsers(u.filter(x => x.uid && x.uid !== 'placeholder').reverse());
      }
      if (activeTab === 'leads') {
          const l = await DatabaseService.getLeads();
          setLeads(l.filter(x => !x.processed).reverse());
      }
      if (activeTab === 'finance') {
          const r = await DatabaseService.getRechargeRequests();
          setRecharges(r.reverse());
      }
      setLoading(false);
  };

  const calculateDaysRemaining = (expiryStr?: string) => {
      if (!expiryStr) return 0;
      const diff = new Date(expiryStr).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getWelcomeLink = (lead: Lead) => {
      const msg = `Olá ${lead.name}! ✨ Bem-vindo(a) à NeuroStudy AI!\n\nSeu acesso foi liberado com sucesso. ✅\n\n🔗 Link: https://neurostudy.com.br\n📧 E-mail: ${lead.contact}\n🔑 Senha: ${lead.password}\n\nBons estudos! 🚀`;
      return `https://wa.me/55${lead.contact.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const getUserWelcomeLink = (u: UserProfile) => {
      const msg = `Olá ${u.displayName}! ✨ Seu cadastro na NeuroStudy AI foi concluído com sucesso.\n\nAcesse agora: https://neurostudy.com.br\nEmail: ${u.email}\n\nSe precisar de ajuda, é só chamar! 🚀`;
      return `https://wa.me/55${u.whatsapp?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(msg)}`;
  };

  const handleOpenAccessModal = (lead: Lead) => {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      setTargetLead(lead);
      setAccessForm({ 
          displayName: lead.name, 
          email: lead.contact, 
          password: lead.password || 'aluno123', 
          plan: lead.planId.toLowerCase().includes('adv') ? 'advanced' : 'basic', 
          essayCredits: 0, // Inicia com 0 conforme solicitado
          expiryDate: expiry.toISOString().split('T')[0] 
      });
      setShowAccessModal(true);
  };

  const handleOpenEditModal = (u: UserProfile) => {
      setEditingUser(u);
      setShowEditModal(true);
  };

  const handleSubmitAccess = async () => {
      if (!targetLead) return;
      setLoading(true);
      try {
          const uid = await AuthService.registerStudent(accessForm.email, accessForm.password, accessForm.displayName);
          await DatabaseService.createUserProfile(uid, {
              ...accessForm,
              uid,
              totalSpent: targetLead.amount, // LTV real (197 ou 94)
              billingCycle: targetLead.billing,
              subscriptionExpiry: accessForm.expiryDate,
              essayCredits: 0,
              aiUnlimitedExpiry: undefined, // IA OFF por padrão
              firstTimeSetupDone: false
          });
          await DatabaseService.markLeadProcessed(targetLead.id);
          setShowAccessModal(false);
          fetchData();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleSaveUserEdit = async () => {
      if (!editingUser) return;
      setLoading(true);
      try {
          await DatabaseService.saveUserProfile(editingUser.uid, editingUser);
          setShowEditModal(false);
          fetchData();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-display">Controle de Operação</h2>
              <p className="text-slate-400">Gestão avançada de faturamento e acesso.</p>
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
          <input className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* ABA LEADS: Somente leads não processados */}
      {activeTab === 'leads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (
                  <div key={l.id} className="glass-card p-6 rounded-2xl border border-emerald-500/40 shadow-lg shadow-emerald-500/5 transition-all">
                      <div className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-xl mb-4 text-center">
                          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Nome no PIX (Comprovante)</p>
                          <p className="text-white font-black text-lg truncate px-2">{l.payerName || 'Não Informado'}</p>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                          <div><p className="text-[10px] text-slate-500 uppercase font-bold">Aluno</p><p className="text-white font-bold">{l.name}</p></div>
                          <div><p className="text-[10px] text-slate-500 uppercase font-bold">E-mail</p><p className="text-xs text-indigo-400 font-mono truncate">{l.contact}</p></div>
                          
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                              <div className="flex-1">
                                  <p className="text-[9px] text-slate-500 uppercase font-bold">Senha Escolhida</p>
                                  <span className="text-xs font-mono text-slate-300">{showPassMap[l.id] ? l.password : '••••••••'}</span>
                              </div>
                              <button onClick={() => setShowPassMap(p => ({...p, [l.id]: !p[l.id]}))} className="text-slate-500 hover:text-white">
                                  {showPassMap[l.id] ? <EyeOff size={16}/> : <Eye size={16}/>}
                              </button>
                          </div>
                          
                          <div className="flex justify-between items-end pt-2 border-t border-white/5">
                              <div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">Plano</p>
                                  <span className="text-xs text-slate-300 font-bold">{l.planId} / {l.billing}</span>
                              </div>
                              <div className="text-right">
                                  <span className="text-emerald-400 font-black text-xl">R$ {l.amount.toFixed(2)}</span>
                              </div>
                          </div>
                      </div>

                      <button onClick={() => handleOpenAccessModal(l)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]">
                          <UserCheck size={18}/> Aprovar e Criar Usuário
                      </button>
                  </div>
              ))}
              {leads.length === 0 && <div className="col-span-full py-20 text-center text-slate-500 font-bold">Nenhum lead pendente. 🎉</div>}
          </div>
      )}

      {/* ABA USERS: Lista geral de usuários cadastrados */}
      {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(u => {
                  const daysLeft = calculateDaysRemaining(u.subscriptionExpiry);
                  const isExpiring = daysLeft > 0 && daysLeft <= 7;
                  
                  return (
                      <div key={u.uid} className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-6 relative overflow-hidden group">
                          {isExpiring && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />}
                          
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-4">
                                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-14 h-14 rounded-full border-2 border-indigo-500/20 object-cover" />
                                  <div>
                                      <h4 className="font-bold text-white text-lg">{u.displayName}</h4>
                                      <p className="text-xs text-slate-500">{u.email}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Gasto Total (LTV)</p>
                                  <p className="text-2xl font-black text-emerald-400">R$ {(u.totalSpent || 0).toFixed(2)}</p>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className={`p-4 rounded-2xl border ${isExpiring ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-950/50 border-white/5'}`}>
                                  <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-wider">Acesso {u.plan?.toUpperCase()}</p>
                                  <div className="flex items-baseline gap-2">
                                      <span className={`text-2xl font-black ${daysLeft > 0 ? 'text-white' : 'text-red-400'}`}>
                                          {daysLeft > 0 ? `${daysLeft} dias` : 'Vencido'}
                                      </span>
                                  </div>
                                  <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold">Vence em: {u.subscriptionExpiry || 'Sem Data'}</p>
                              </div>
                              
                              <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl">
                                  <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-wider">Serviços Ativos</p>
                                  <div className="space-y-1">
                                      <div className="flex justify-between text-[10px]">
                                          <span className="text-slate-400">IA Ilimitada:</span>
                                          <span className={u.aiUnlimitedExpiry ? 'text-emerald-400 font-bold' : 'text-slate-600'}>{u.aiUnlimitedExpiry ? 'Ativo' : 'Não'}</span>
                                      </div>
                                      <div className="flex justify-between text-[10px]">
                                          <span className="text-slate-400">Redações:</span>
                                          <span className="text-indigo-400 font-bold">{u.essayCredits || 0} unid.</span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="pt-4 border-t border-white/5 flex gap-2">
                              {u.whatsapp && (
                                  <a href={getUserWelcomeLink(u)} target="_blank" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                                      <Send size={16}/> AVISAR CADASTRO FEITO
                                  </a>
                              )}
                              <button onClick={() => handleOpenEditModal(u)} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all border border-white/10 flex items-center gap-2">
                                  <Edit size={16}/> Editar Usuário
                              </button>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {/* MODAL: APROVAR LEAD */}
      {showAccessModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-white">Liberar Acesso Aluno</h3>
                      <button onClick={() => setShowAccessModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">E-mail de Acesso</label>
                          <input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" value={accessForm.email} onChange={e => setAccessForm({...accessForm, email: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Senha</label>
                          <input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" value={accessForm.password} onChange={e => setAccessForm({...accessForm, password: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Plano</label>
                              <select className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" value={accessForm.plan} onChange={e => setAccessForm({...accessForm, plan: e.target.value as any})}>
                                  <option value="basic">Basic</option>
                                  <option value="advanced">Advanced</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Expiração</label>
                              <input type="date" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" value={accessForm.expiryDate} onChange={e => setAccessForm({...accessForm, expiryDate: e.target.value})} />
                          </div>
                      </div>
                      <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/20 text-center">
                          <p className="text-indigo-400 font-bold text-xs">Venda Detectada: <span className="text-white text-lg font-black">R$ {targetLead?.amount.toFixed(2)}</span></p>
                      </div>
                      <button onClick={handleSubmitAccess} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                          {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20}/>} Confirmar e Ativar Aluno
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: EDITAR USUÁRIO */}
      {showEditModal && editingUser && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
              <div className="bg-slate-900 border border-indigo-500/20 p-8 rounded-3xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-2xl font-black text-white">Gestão de Usuário</h3>
                          <p className="text-slate-500 text-xs uppercase font-bold">UID: {editingUser.uid}</p>
                      </div>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full"><X size={24}/></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-4">
                          <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest border-b border-white/5 pb-2">Informações Base</h4>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Nome Completo</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} /></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">E-mail de Acesso</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">LTV (Gasto Total R$)</label><input type="number" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-emerald-400 font-black" value={editingUser.totalSpent} onChange={e => setEditingUser({...editingUser, totalSpent: parseFloat(e.target.value) || 0})} /></div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest border-b border-white/5 pb-2">Planos e Acessos</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Plano Base</label><select className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.plan} onChange={e => setEditingUser({...editingUser, plan: e.target.value as any})}><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
                              <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Expiração</label><input type="date" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.subscriptionExpiry} onChange={e => setEditingUser({...editingUser, subscriptionExpiry: e.target.value})} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Saldo IA (R$)</label><input type="number" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.balance} onChange={e => setEditingUser({...editingUser, balance: parseFloat(e.target.value) || 0})} /></div>
                              <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Créditos Redação</label><input type="number" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.essayCredits} onChange={e => setEditingUser({...editingUser, essayCredits: parseInt(e.target.value) || 0})} /></div>
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Expiração IA Ilimitada (Opcional)</label>
                              <input type="date" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-emerald-400" value={editingUser.aiUnlimitedExpiry || ''} onChange={e => setEditingUser({...editingUser, aiUnlimitedExpiry: e.target.value || undefined})} />
                          </div>
                      </div>
                  </div>

                  <button onClick={handleSaveUserEdit} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all">
                      {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20}/>} Salvar Alterações no Perfil
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
