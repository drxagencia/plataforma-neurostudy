
import React, { useState, useEffect } from 'react';
import { UserProfile, Lead, RechargeRequest, UserPlan, Subject, Lesson, Simulation } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { Search, CheckCircle, XCircle, Loader2, Eye, EyeOff, X, Smartphone, Calendar, CreditCard, DollarSign, Edit, Send, UserCheck, BookOpen, Layers, PlayCircle, Plus, Trash2, ChevronRight, Save } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'finance' | 'content'>('leads');
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

  // --- LMS STATE ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [lessonsByTopic, setLessonsByTopic] = useState<Record<string, Lesson[]>>({});
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState<Partial<Lesson>>({ type: 'video', title: '', videoUrl: '', duration: '' });
  const [targetTopic, setTargetTopic] = useState('');

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
      setLoading(true);
      try {
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
        if (activeTab === 'content') {
            const s = await DatabaseService.getSubjects();
            const sims = await DatabaseService.getSimulations();
            setSubjects(s);
            setSimulations(sims);
        }
      } catch (e) {
          console.error("Fetch Error:", e);
      } finally {
        setLoading(false);
      }
  };

  // --- CONTENT HANDLERS ---
  const handleSelectSubject = async (s: Subject) => {
      setSelectedSubject(s);
      const data = await DatabaseService.getLessonsByTopic(s.id);
      setLessonsByTopic(data);
  };

  const handleSaveLesson = async () => {
      if (!selectedSubject || !targetTopic || !lessonForm.title) return;
      setLoading(true);
      const id = lessonForm.id || `l_${Date.now()}`;
      await DatabaseService.saveLesson(selectedSubject.id, targetTopic, id, { ...lessonForm, id } as Lesson);
      
      const updated = await DatabaseService.getLessonsByTopic(selectedSubject.id);
      setLessonsByTopic(updated);
      setShowLessonModal(false);
      setLessonForm({ type: 'video', title: '', videoUrl: '', duration: '' });
      setLoading(false);
  };

  const handleDeleteLesson = async (topic: string, lessonId: string) => {
      if (!selectedSubject || !confirm("Excluir aula?")) return;
      await DatabaseService.deleteLesson(selectedSubject.id, topic, lessonId);
      const updated = await DatabaseService.getLessonsByTopic(selectedSubject.id);
      setLessonsByTopic(updated);
  };

  const calculateDaysRemaining = (expiryStr?: string) => {
      if (!expiryStr) return 0;
      const diff = new Date(expiryStr).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getUserWelcomeLink = (u: UserProfile) => {
      const msg = `Olá ${u.displayName}! ✨ Seu cadastro na NeuroStudy AI foi concluído com sucesso.\n\nAcesse agora: https://neurostudy.com.br\n📧 Email: ${u.email}\n\nSe precisar de ajuda, é só chamar! 🚀`;
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
          essayCredits: 0, 
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
              totalSpent: targetLead.amount,
              billingCycle: targetLead.billing,
              subscriptionExpiry: accessForm.expiryDate,
              essayCredits: 0,
              aiUnlimitedExpiry: undefined,
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
              {['leads', 'users', 'finance', 'content'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                      {tab === 'content' ? 'Conteúdo' : tab}
                  </button>
              ))}
          </div>
      </div>

      {activeTab !== 'content' && (
          <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
      )}

      {/* --- ABA CONTEÚDO (LMS) --- */}
      {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-right duration-500">
              {/* Sidebar: Matérias */}
              <div className="lg:col-span-1 space-y-4">
                  <div className="glass-card p-4 rounded-2xl">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><BookOpen size={18}/> Disciplinas</h3>
                      <div className="space-y-2">
                          {subjects.map(s => (
                              <button 
                                key={s.id} 
                                onClick={() => handleSelectSubject(s)}
                                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all text-sm font-bold ${selectedSubject?.id === s.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                              >
                                  {s.name}
                                  <ChevronRight size={14} />
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div className="glass-card p-4 rounded-2xl bg-indigo-900/10 border-indigo-500/20">
                      <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Layers size={18}/> Simulados</h3>
                      <p className="text-[10px] text-slate-500 mb-4 uppercase font-bold">Total: {simulations.length}</p>
                      <div className="space-y-2">
                          {simulations.map(sim => (
                              <div key={sim.id} className="p-2 bg-black/40 rounded-lg text-xs flex items-center justify-between border border-white/5">
                                  <span className="text-slate-300 truncate pr-2">{sim.title}</span>
                                  <button onClick={() => DatabaseService.deleteSimulation(sim.id).then(fetchData)} className="text-red-500 hover:bg-red-500/20 p-1 rounded"><Trash2 size={12}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Main: Topics & Lessons */}
              <div className="lg:col-span-3">
                  {selectedSubject ? (
                      <div className="space-y-6">
                          <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-white/10">
                              <div>
                                  <h3 className="text-2xl font-bold text-white">{selectedSubject.name}</h3>
                                  <p className="text-slate-400 text-sm">Gerencie os tópicos e aulas desta disciplina.</p>
                              </div>
                              <button onClick={() => { setTargetTopic('Geral'); setLessonForm({ type: 'video' }); setShowLessonModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                                  <Plus size={16}/> Nova Aula
                              </button>
                          </div>

                          <div className="space-y-4">
                              {Object.entries(lessonsByTopic).map(([topic, lessons]) => (
                                  <div key={topic} className="glass-card p-6 rounded-2xl border border-white/5">
                                      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                          <h4 className="text-lg font-bold text-indigo-400">{topic}</h4>
                                          <span className="text-[10px] text-slate-600 uppercase font-black">{lessons.length} Itens</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {lessons.map(lesson => (
                                              <div key={lesson.id} className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                                  <div className="flex items-center gap-3">
                                                      <div className={`p-2 rounded-lg ${lesson.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                          {lesson.type === 'video' ? <PlayCircle size={18}/> : <Layers size={18}/>}
                                                      </div>
                                                      <div>
                                                          <p className="text-sm font-bold text-white leading-tight">{lesson.title}</p>
                                                          <p className="text-[10px] text-slate-500 uppercase">{lesson.duration || 'Block'}</p>
                                                      </div>
                                                  </div>
                                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => { setTargetTopic(topic); setLessonForm(lesson); setShowLessonModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><Edit size={14}/></button>
                                                      <button onClick={() => handleDeleteLesson(topic, lesson.id!)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-slate-600">
                          <BookOpen size={48} className="mb-4 opacity-20" />
                          <p className="font-bold uppercase tracking-widest text-xs">Selecione uma matéria para editar</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- LEADS, USERS, FINANCE (MANTIDOS) --- */}
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
                      </div>

                      <button onClick={() => handleOpenAccessModal(l)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]">
                          <UserCheck size={18}/> Aprovar e Criar Usuário
                      </button>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                  <div key={u.uid} className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-6 relative overflow-hidden group">
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
                      <div className="pt-4 border-t border-white/5 flex gap-2">
                          <button onClick={() => handleOpenEditModal(u)} className="flex-1 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2">
                              <Edit size={16}/> Editar Usuário
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* MODAL: SALVAR AULA (CONTENT) */}
      {showLessonModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-2xl font-black text-white mb-6 uppercase">Gerenciar Aula</h3>
                  <div className="space-y-4">
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Tópico</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={targetTopic} onChange={e => setTargetTopic(e.target.value)} placeholder="Ex: Álgebra" /></div>
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Título da Aula</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Tipo</label><select className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value as any})}><option value="video">Vídeo</option><option value="exercise_block">Bloco de Questões</option></select></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Duração/Tag</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} placeholder="15:00" /></div>
                      </div>
                      {lessonForm.type === 'video' && (
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">URL do Vídeo (YouTube)</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={lessonForm.videoUrl} onChange={e => setLessonForm({...lessonForm, videoUrl: e.target.value})} /></div>
                      )}
                      
                      <button onClick={handleSaveLesson} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl flex items-center justify-center gap-2 mt-4 transition-all">
                          <Save size={18}/> Salvar Aula
                      </button>
                      <button onClick={() => setShowLessonModal(false)} className="w-full text-slate-500 text-xs font-bold uppercase hover:text-white mt-2">Cancelar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: LIBERAR ACESSO (LEADS) */}
      {showAccessModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-white">Liberar Acesso Aluno</h3>
                      <button onClick={() => setShowAccessModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">E-mail</label><input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" value={accessForm.email} onChange={e => setAccessForm({...accessForm, email: e.target.value})} /></div>
                      <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Senha</label><input className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" value={accessForm.password} onChange={e => setAccessForm({...accessForm, password: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Plano</label><select className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white outline-none" value={accessForm.plan} onChange={e => setAccessForm({...accessForm, plan: e.target.value as any})}><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Expiração</label><input type="date" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white outline-none" value={accessForm.expiryDate} onChange={e => setAccessForm({...accessForm, expiryDate: e.target.value})} /></div>
                      </div>
                      <button onClick={handleSubmitAccess} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-lg flex items-center justify-center gap-2">
                          {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20}/>} Criar Aluno Agora
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
                          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Gestão de Perfil</h3>
                          <p className="text-slate-500 text-[10px] uppercase font-bold">UID: {editingUser.uid}</p>
                      </div>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full"><X size={24}/></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-4">
                          <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest border-b border-white/5 pb-2">Identidade e Financeiro</h4>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Nome</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} /></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">E-mail</label><input className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                          <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">LTV Manual (R$)</label><input type="number" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-emerald-400 font-black" value={editingUser.totalSpent} onChange={e => setEditingUser({...editingUser, totalSpent: parseFloat(e.target.value) || 0})} /></div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest border-b border-white/5 pb-2">Acessos e Planos</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Plano</label><select className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none" value={editingUser.plan} onChange={e => setEditingUser({...editingUser, plan: e.target.value as any})}><option value="basic">Basic</option><option value="advanced">Advanced</option></select></div>
                              <div><label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Vencimento</label><input type="date" className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white outline-none" value={editingUser.subscriptionExpiry} onChange={e => setEditingUser({...editingUser, subscriptionExpiry: e.target.value})} /></div>
                          </div>
                      </div>
                  </div>

                  <button onClick={handleSaveUserEdit} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all">
                      {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20}/>} Salvar Alterações
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
