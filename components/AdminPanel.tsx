
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan, LessonMaterial, Simulation, Lead, PlanConfig, PlanFeatures } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon, PenTool, Link, FileText, LayoutList, Pencil, Eye, RefreshCw, Upload, Users, UserCheck, Calendar, Shield, BarChart3, TrendingUp, PieChart, DollarSign, Activity, X, Video, Target, Tag, Megaphone, Copy, AlertTriangle, MousePointerClick, Clock, ShoppingCart, User, CreditCard } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'content' | 'finance' | 'config' | 'metrics' | 'traffic' | 'plans'>('leads');
  const [contentTab, setContentTab] = useState<'question' | 'lesson' | 'subject' | 'simulation' | 'import'>('question');
  
  // View Mode: Create New vs Manage Existing
  const [viewMode, setViewMode] = useState<'create' | 'manage'>('create');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null);
  
  // Traffic Data
  const [trafficConfig, setTrafficConfig] = useState({ vslScript: '', checkoutLinkMonthly: '', checkoutLinkYearly: '' });
  
  // Lead Creation Form
  const [leadForm, setLeadForm] = useState({ name: '', contact: '', planId: 'plan_basic', billing: 'monthly', paymentMethod: 'manual' });
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Loading
  const [loading, setLoading] = useState(true);

  // --- USER CREATION / APPROVAL STATE ---
  const [showUserModal, setShowUserModal] = useState(false);
  const [targetLead, setTargetLead] = useState<Lead | null>(null); 
  
  const [accessForm, setAccessForm] = useState({
      displayName: '',
      email: '',
      password: 'mudar123',
      plan: 'basic' as UserPlan,
      essayCredits: 0,
      balance: 0.00,
      expiryDate: '' 
  });

  // INITIAL LOAD
  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    setLoading(true);
    const [s, t, pc] = await Promise.all([
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        DatabaseService.getPlanConfig()
    ]);
    setSubjects(s);
    setTopics(t);
    setPlanConfig(pc);
    setLoading(false);
  };

  // LAZY LOAD: Users
  useEffect(() => {
      if (activeTab === 'users' || activeTab === 'metrics') {
          DatabaseService.getUsersPaginated(100).then(u => {
              const realUsers = u.filter(user => user.uid !== 'student_uid_placeholder');
              setUsers(realUsers);
          });
      }
  }, [activeTab]);

  // LAZY LOAD: Leads
  useEffect(() => {
      if (activeTab === 'leads' || activeTab === 'metrics') {
          DatabaseService.getLeads().then(l => setLeads(l.reverse()));
      }
  }, [activeTab, showLeadModal, showUserModal]); // Reload when modals close

  // LAZY LOAD: Finance
  useEffect(() => {
      if (activeTab === 'finance' || activeTab === 'metrics') {
          DatabaseService.getRechargeRequests().then(r => setRecharges(r.reverse()));
      }
  }, [activeTab]);

  // LAZY LOAD: Traffic
  useEffect(() => {
      if (activeTab === 'traffic') {
          DatabaseService.getTrafficSettings().then(t => setTrafficConfig(t));
      }
  }, [activeTab]);

  // --- ACCESS MANAGEMENT ---
  const handleOpenAccessModal = (lead?: Lead) => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const defaultExpiry = nextYear.toISOString().split('T')[0];

      if (lead) {
          setTargetLead(lead);
          let plan: UserPlan = 'basic';
          let credits = 0;
          let balance = 0;

          const pid = lead.planId.toLowerCase();
          if (pid.includes('pro') || pid.includes('adv')) {
              plan = 'advanced';
              credits = 30;
              balance = 5.00;
          } else {
              credits = 8;
          }

          setAccessForm({
              displayName: lead.name,
              email: '', 
              password: 'mudar123',
              plan: plan,
              essayCredits: credits,
              balance: balance,
              expiryDate: defaultExpiry
          });
      } else {
          setTargetLead(null);
          setAccessForm({
              displayName: '',
              email: '',
              password: 'mudar123',
              plan: 'basic',
              essayCredits: 8,
              balance: 0.00,
              expiryDate: defaultExpiry
          });
      }
      setShowUserModal(true);
  };

  const handleSubmitAccess = async () => {
      if (!accessForm.email || !accessForm.password || !accessForm.displayName) {
          alert("Campos obrigatórios: Nome, Email, Senha.");
          return;
      }

      setLoading(true);
      try {
          const newUid = await AuthService.registerStudent(accessForm.email, accessForm.password, accessForm.displayName);
          await DatabaseService.createUserProfile(newUid, {
              displayName: accessForm.displayName,
              email: accessForm.email,
              plan: accessForm.plan,
              subscriptionExpiry: accessForm.expiryDate,
              xp: 0,
              essayCredits: Number(accessForm.essayCredits),
              balance: Number(accessForm.balance),
              billingCycle: targetLead ? (targetLead.billing as any) : 'monthly' 
          });

          if (targetLead) {
              await DatabaseService.markLeadProcessed(targetLead.id);
          }

          alert(targetLead ? "Lead convertido em Aluno!" : "Aluno cadastrado com sucesso!");
          setShowUserModal(false);
          // Refresh lists
          DatabaseService.getUsersPaginated(100).then(setUsers);
          DatabaseService.getLeads().then(l => setLeads(l.reverse()));

      } catch (e: any) {
          console.error(e);
          alert(`Erro ao criar aluno: ${e.message}`);
      } finally {
          setLoading(false);
      }
  };

  // --- LEAD MANAGEMENT ---
  const handleCreateLead = async () => {
      if (!leadForm.name) return;
      await DatabaseService.createLead({
          name: leadForm.name,
          contact: leadForm.contact,
          planId: leadForm.planId,
          billing: leadForm.billing as any,
          paymentMethod: leadForm.paymentMethod,
          timestamp: new Date().toISOString(),
          status: 'pending_pix'
      });
      setShowLeadModal(false);
      setLeadForm({ name: '', contact: '', planId: 'plan_basic', billing: 'monthly', paymentMethod: 'manual' });
      // Refresh
      DatabaseService.getLeads().then(l => setLeads(l.reverse()));
  };

  // --- FINANCE MANAGEMENT ---
  const handleFinanceAction = async (id: string, action: 'approved' | 'rejected') => {
      if (!confirm(`Confirmar ${action === 'approved' ? 'APROVAÇÃO' : 'REJEIÇÃO'}?`)) return;
      await DatabaseService.processRecharge(id, action);
      // Refresh
      DatabaseService.getRechargeRequests().then(r => setRecharges(r.reverse()));
  };

  const handleSaveTraffic = async () => { try { await DatabaseService.saveTrafficSettings(trafficConfig); alert("Salvo!"); } catch(e) { alert("Erro."); } };

  return (
    <div className="space-y-6 animate-slide-up pb-20 relative">
      
      {/* ACCESS MODAL */}
      {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold text-white mb-6">Criar Aluno</h3>
                  <div className="space-y-4">
                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Nome Completo" value={accessForm.displayName} onChange={e => setAccessForm({...accessForm, displayName: e.target.value})} />
                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Email" value={accessForm.email} onChange={e => setAccessForm({...accessForm, email: e.target.value})} />
                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Senha" value={accessForm.password} onChange={e => setAccessForm({...accessForm, password: e.target.value})} />
                      
                      <div className="grid grid-cols-2 gap-4">
                          <select className="glass-input p-3 rounded-lg" value={accessForm.plan} onChange={e => setAccessForm({...accessForm, plan: e.target.value as any})}>
                              <option value="basic">Básico</option>
                              <option value="advanced">Advanced (Pro)</option>
                          </select>
                          <input type="date" className="glass-input p-3 rounded-lg" value={accessForm.expiryDate} onChange={e => setAccessForm({...accessForm, expiryDate: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <input type="number" className="glass-input p-3 rounded-lg" placeholder="Créditos Redação" value={accessForm.essayCredits} onChange={e => setAccessForm({...accessForm, essayCredits: Number(e.target.value)})} />
                          <input type="number" className="glass-input p-3 rounded-lg" placeholder="Saldo R$" value={accessForm.balance} onChange={e => setAccessForm({...accessForm, balance: Number(e.target.value)})} />
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white px-3">Cancelar</button>
                      <button onClick={handleSubmitAccess} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Salvar Aluno</button>
                  </div>
              </div>
          </div>
      )}

      {/* LEAD MODAL */}
      {showLeadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-white mb-4">Novo Lead</h3>
                  <div className="space-y-3">
                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Nome" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} />
                      <input className="w-full glass-input p-3 rounded-lg" placeholder="Contato/Email" value={leadForm.contact} onChange={e => setLeadForm({...leadForm, contact: e.target.value})} />
                      <select className="w-full glass-input p-3 rounded-lg" value={leadForm.planId} onChange={e => setLeadForm({...leadForm, planId: e.target.value})}>
                          <option value="plan_basic">Básico</option>
                          <option value="plan_advanced">Advanced</option>
                      </select>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                      <button onClick={() => setShowLeadModal(false)} className="text-slate-400">Cancelar</button>
                      <button onClick={handleCreateLead} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold">Criar Lead</button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end mb-6">
          <div>
              <h2 className="text-3xl font-bold text-white mb-2">Painel Administrativo</h2>
              <p className="text-slate-400">Controle total da plataforma.</p>
          </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-4 border-b border-white/10 pb-1 overflow-x-auto mb-6">
          {['leads', 'users', 'finance', 'content', 'config', 'traffic', 'plans'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 font-bold text-sm uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-white'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* --- LEADS TAB --- */}
      {activeTab === 'leads' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">Gestão de Leads (CRM)</h3>
                  <div className="flex gap-2">
                      <button onClick={() => setShowLeadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold border border-white/10">
                          <UserPlus size={18} /> Novo Lead
                      </button>
                      <button onClick={() => handleOpenAccessModal(undefined)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                          <UserCheck size={18} /> Criar Aluno Direto
                      </button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.map(l => (
                      <div key={l.id} className={`glass-card p-5 rounded-2xl border-l-4 ${l.processed ? 'border-l-emerald-500 opacity-60' : 'border-l-yellow-500'}`}>
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-white">{l.name}</h4>
                              {l.processed ? <CheckCircle size={16} className="text-emerald-500"/> : <Clock size={16} className="text-yellow-500"/>}
                          </div>
                          <p className="text-slate-400 text-xs mb-1">{l.contact}</p>
                          <p className="text-slate-300 text-xs font-bold mb-4 uppercase">{l.planId} ({l.billing})</p>
                          
                          {!l.processed && (
                              <button onClick={() => handleOpenAccessModal(l)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                                  <UserCheck size={14}/> Aprovar Acesso
                              </button>
                          )}
                      </div>
                  ))}
                  {leads.length === 0 && <p className="text-slate-500">Nenhum lead encontrado.</p>}
              </div>
          </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Base de Alunos ({users.length})</h3>
              <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                  <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
                          <tr>
                              <th className="p-4">Aluno</th>
                              <th className="p-4">Plano</th>
                              <th className="p-4">Saldo</th>
                              <th className="p-4">XP</th>
                              <th className="p-4">Expira em</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {users.map(u => (
                              <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                                  <td className="p-4">
                                      <p className="font-bold text-white">{u.displayName}</p>
                                      <p className="text-xs">{u.email}</p>
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.plan === 'advanced' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                          {u.plan}
                                      </span>
                                  </td>
                                  <td className="p-4 font-mono text-white">R$ {u.balance?.toFixed(2)}</td>
                                  <td className="p-4 font-mono text-yellow-400">{u.xp || 0}</td>
                                  <td className="p-4 text-xs">{u.subscriptionExpiry || 'Vitalício'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- FINANCE TAB --- */}
      {activeTab === 'finance' && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Solicitações Financeiras</h3>
              <div className="grid grid-cols-1 gap-4">
                  {recharges.filter(r => r.status === 'pending').map(req => (
                      <div key={req.id} className="glass-card p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40">
                          <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-full ${req.currencyType === 'CREDIT' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  <DollarSign size={24} />
                              </div>
                              <div>
                                  <p className="font-bold text-white text-lg">
                                      {req.currencyType === 'CREDIT' ? `${req.quantityCredits} Créditos` : `R$ ${req.amount.toFixed(2)}`}
                                  </p>
                                  <p className="text-sm text-slate-400">
                                      Solicitante (APP): <span className="text-white font-bold">{req.userDisplayName}</span>
                                  </p>
                                  {req.planLabel && <p className="text-xs text-yellow-400 font-bold mt-1">{req.planLabel}</p>}
                                  <p className="text-xs text-slate-500 mt-1">ID: {req.userId.substring(0,8)}... • {new Date(req.timestamp).toLocaleDateString()}</p>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                              <button onClick={() => handleFinanceAction(req.id, 'rejected')} className="p-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors border border-red-500/30">
                                  <X size={20} />
                              </button>
                              <button onClick={() => handleFinanceAction(req.id, 'approved')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg">
                                  <CheckCircle size={20} /> Aprovar
                              </button>
                          </div>
                      </div>
                  ))}
                  {recharges.filter(r => r.status === 'pending').length === 0 && (
                      <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-dashed border-white/10">
                          <CheckCircle size={48} className="mx-auto text-slate-600 mb-4" />
                          <p className="text-slate-500">Tudo limpo! Nenhuma solicitação pendente.</p>
                      </div>
                  )}
              </div>
              
              {/* History */}
              <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="font-bold text-slate-400 mb-4 uppercase text-xs tracking-wider">Histórico Recente</h4>
                  <div className="opacity-60 text-sm space-y-2">
                      {recharges.filter(r => r.status !== 'pending').slice(0, 5).map(r => (
                          <div key={r.id} className="flex justify-between p-3 bg-slate-900/30 rounded-lg">
                              <span>{r.userDisplayName} - R$ {r.amount}</span>
                              <span className={r.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}>{r.status.toUpperCase()}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      
      {/* Config/Traffic Tab */}
      {(activeTab === 'config' || activeTab === 'traffic') && (
          <div className="max-w-2xl">
              <div className="glass-card p-6 rounded-2xl space-y-6">
                  <h3 className="font-bold text-white mb-4">Configurações de Tráfego</h3>
                  <textarea className="w-full glass-input p-3 rounded-xl h-32 text-xs" value={trafficConfig.vslScript} onChange={e => setTrafficConfig({...trafficConfig, vslScript: e.target.value})} placeholder="Embed VSL" />
                  <input className="w-full glass-input p-3 rounded-xl" value={trafficConfig.checkoutLinkMonthly} onChange={e => setTrafficConfig({...trafficConfig, checkoutLinkMonthly: e.target.value})} placeholder="Link Mensal" />
                  <input className="w-full glass-input p-3 rounded-xl" value={trafficConfig.checkoutLinkYearly} onChange={e => setTrafficConfig({...trafficConfig, checkoutLinkYearly: e.target.value})} placeholder="Link Anual" />
                  <button onClick={handleSaveTraffic} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Salvar</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;
