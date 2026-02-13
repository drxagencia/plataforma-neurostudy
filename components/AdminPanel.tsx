
import React, { useState, useEffect } from 'react';
import { UserProfile, Lead, RechargeRequest, Subject, Lesson, Simulation, Question } from '../types';
import { DatabaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';
import { 
  Search, CheckCircle, XCircle, Loader2, Eye, EyeOff, X, Edit, UserCheck, 
  BookOpen, Layers, PlayCircle, Plus, Trash2, ChevronRight, Save, 
  FileQuestion, GraduationCap, ArrowLeft, Image as ImageIcon, Sparkles, PlusCircle, LayoutGrid, DollarSign, Users, Smartphone, Calendar, CreditCard, Mail
} from 'lucide-react';

type ContentSubTab = 'lms' | 'bank' | 'sims';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'finance' | 'content'>('leads');
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>('lms');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);

  // LMS States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSub, setSelectedSub] = useState<Subject | null>(null);
  const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState<Partial<Lesson>>({ type: 'video', title: '' });
  const [targetTopic, setTargetTopic] = useState('');

  // Question Bank States
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<Question>>({
      text: '', options: ['', '', '', '', ''], correctAnswer: 0, difficulty: 'medium', category: 'regular'
  });
  const [qLoc, setQLoc] = useState({ subject: '', topic: '', subtopic: '' });

  // Sims
  const [simulations, setSimulations] = useState<Simulation[]>([]);

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'leads') {
            const data = await DatabaseService.getLeads();
            setLeads(data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else if (activeTab === 'users') {
            const data = await DatabaseService.getAllUsers();
            setAllUsers(data);
        } else if (activeTab === 'finance') {
            const data = await DatabaseService.getRechargeRequests();
            setRechargeRequests(data.sort((a,b) => b.timestamp - a.timestamp));
        } else if (activeTab === 'content') {
            const [subs, sims] = await Promise.all([
                DatabaseService.getSubjects(),
                DatabaseService.getSimulations()
            ]);
            setSubjects(subs);
            setSimulations(sims);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- HANDLERS ---
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
          fetchData();
      } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleProcessRecharge = async (req: RechargeRequest, status: 'approved' | 'rejected') => {
      if (!confirm(`Confirmar ${status === 'approved' ? 'APROVAÇÃO' : 'REJEIÇÃO'} da recarga de R$ ${req.amount}?`)) return;
      setLoading(true);
      await DatabaseService.processRecharge(req.id, status);
      fetchData();
  };

  const handleOpenSubject = async (s: Subject) => {
      setSelectedSub(s);
      setLoading(true);
      const data = await DatabaseService.getLessonsByTopic(s.id);
      setLessonsMap(data);
      setLoading(false);
  };

  const handleSaveLesson = async () => {
      if (!selectedSub || !targetTopic || !lessonForm.title) return;
      setLoading(true);
      const id = lessonForm.id || `l_${Date.now()}`;
      await DatabaseService.saveLesson(selectedSub.id, targetTopic, id, { ...lessonForm, id } as Lesson);
      await handleOpenSubject(selectedSub);
      setShowLessonModal(false);
      setLoading(false);
  };

  const handleSaveQuestion = async () => {
      if (!qLoc.subject || !qLoc.topic || !qLoc.subtopic || !questionForm.text) {
          alert("Preencha todos os campos obrigatórios.");
          return;
      }
      setLoading(true);
      const qid = questionForm.id || `q_${Date.now()}`;
      const data = { ...questionForm, id: qid, subjectId: qLoc.subject, topic: qLoc.topic, subtopic: qLoc.subtopic } as Question;
      await DatabaseService.saveQuestion(questionForm.category || 'regular', qLoc.subject, qLoc.topic, qLoc.subtopic, qid, data);
      setShowQuestionModal(false);
      setLoading(false);
      alert("Questão salva!");
  };

  // --- RENDER HELPERS ---
  const filteredUsers = allUsers.filter(u => 
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Painel de Controle</h2>
              <p className="text-slate-400 text-sm">Gerencie o ecossistema NeuroStudy AI.</p>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10">
              {['leads', 'users', 'finance', 'content'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                      {tab === 'leads' ? 'Aguardando Pix' : tab === 'users' ? 'Alunos' : tab === 'finance' ? 'Finanças' : 'Conteúdo'}
                  </button>
              ))}
          </div>
      </div>

      {/* --- ABA LEADS (PIX ANUAL PENDENTE) --- */}
      {activeTab === 'leads' && (
          <div className="glass-card rounded-[2rem] overflow-hidden border-white/10">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                  <h3 className="font-bold text-white flex items-center gap-2"><Smartphone size={18}/> Inscrições Pendentes (Pix Anual)</h3>
                  <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-1 rounded">{leads.length} AGUARDANDO</span>
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
                                          <button onClick={() => DatabaseService.markLeadProcessed(lead.id).then(fetchData)} className="p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all"><Trash2 size={16}/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {leads.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-500 font-bold uppercase italic tracking-widest opacity-30">Nenhuma solicitação pendente</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- ABA ALUNOS (USER MANAGEMENT) --- */}
      {activeTab === 'users' && (
          <div className="space-y-4">
              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                  <input 
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none" 
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="glass-card rounded-[2rem] overflow-hidden border-white/10">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                              <tr>
                                  <th className="p-4">Aluno</th>
                                  <th className="p-4">Plano</th>
                                  <th className="p-4">NeuroAI Saldo</th>
                                  <th className="p-4">Créditos Redação</th>
                                  <th className="p-4">Gasto Total</th>
                                  <th className="p-4">XP</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {filteredUsers.map(user => (
                                  <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                                      <td className="p-4">
                                          <p className="font-bold text-white text-sm">{user.displayName}</p>
                                          <p className="text-[10px] text-slate-500">{user.email}</p>
                                      </td>
                                      <td className="p-4">
                                          <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${user.plan === 'advanced' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{user.plan}</span>
                                      </td>
                                      <td className={`p-4 font-mono text-sm ${user.balance > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>R$ {(user.balance || 0).toFixed(2)}</td>
                                      <td className="p-4 font-bold text-white">{user.essayCredits || 0}</td>
                                      <td className="p-4 font-bold text-indigo-400">R$ {(user.totalSpent || 0).toFixed(2)}</td>
                                      <td className="p-4 text-xs font-black text-yellow-500">{user.xp || 0} XP</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- ABA FINANÇAS (RECHARGE APPROVAL) --- */}
      {activeTab === 'finance' && (
          <div className="glass-card rounded-[2rem] overflow-hidden border-white/10">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                  <h3 className="font-bold text-white flex items-center gap-2"><DollarSign size={18}/> Solicitações de Recarga (Saldo/Redação)</h3>
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
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- ABA CONTEÚDO (REDESENHADA) --- */}
      {activeTab === 'content' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
              {/* Navegação Sub-Aba */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                      { id: 'lms', label: 'Grade de Aulas', icon: PlayCircle, color: 'text-indigo-400' },
                      { id: 'bank', label: 'Banco de Questões', icon: FileQuestion, color: 'text-emerald-400' },
                      { id: 'sims', label: 'Simulados', icon: GraduationCap, color: 'text-purple-400' }
                  ].map(sub => (
                      <button 
                        key={sub.id} 
                        onClick={() => setContentSubTab(sub.id as any)}
                        className={`p-6 rounded-3xl border transition-all text-left flex items-center gap-4 ${contentSubTab === sub.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}
                      >
                          <sub.icon className={sub.color} size={32} />
                          <div>
                              <p className={`text-sm font-black uppercase tracking-widest ${contentSubTab === sub.id ? 'text-white' : 'text-slate-500'}`}>{sub.label}</p>
                              <p className="text-[10px] text-slate-400">Clique para gerenciar</p>
                          </div>
                      </button>
                  ))}
              </div>

              <div className="glass-card rounded-[2.5rem] p-8 border-white/10 relative overflow-hidden min-h-[500px]">
                  
                  {/* === GERENCIADOR LMS === */}
                  {contentSubTab === 'lms' && (
                      <div className="animate-in fade-in duration-300">
                          {selectedSub ? (
                              <div className="space-y-6">
                                  <button onClick={() => setSelectedSub(null)} className="flex items-center gap-2 text-indigo-400 font-bold text-sm hover:translate-x-[-4px] transition-transform">
                                      <ArrowLeft size={16}/> Voltar para Disciplinas
                                  </button>
                                  
                                  <div className="flex justify-between items-center bg-slate-950/40 p-6 rounded-3xl border border-white/5">
                                      <div>
                                          <h3 className="text-2xl font-bold text-white flex items-center gap-2"><LayoutGrid size={20} className="text-indigo-400" /> {selectedSub.name}</h3>
                                          <p className="text-slate-500 text-xs mt-1">Gerencie os tópicos e aulas desta matéria.</p>
                                      </div>
                                      <button onClick={() => { setTargetTopic(''); setLessonForm({type:'video'}); setShowLessonModal(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-indigo-500 shadow-xl transition-all">
                                          <PlusCircle size={18}/> NOVA AULA
                                      </button>
                                  </div>

                                  <div className="space-y-4">
                                      {Object.keys(lessonsMap).length > 0 ? Object.keys(lessonsMap).map(topic => (
                                          <div key={topic} className="bg-white/5 rounded-3xl p-6 border border-white/5 hover:border-indigo-500/20 transition-all group">
                                              <div className="flex justify-between items-center mb-6">
                                                  <h4 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                                      <Layers size={18} className="text-indigo-400" /> {topic}
                                                  </h4>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                  {lessonsMap[topic].map((l, i) => (
                                                      <div key={i} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between group/item hover:bg-black/60 transition-all">
                                                          <div className="flex items-center gap-3 overflow-hidden">
                                                              {l.type === 'video' ? <PlayCircle size={16} className="text-blue-400 shrink-0"/> : <FileQuestion size={16} className="text-emerald-400 shrink-0"/>}
                                                              <span className="text-xs font-bold text-slate-300 truncate">{l.title}</span>
                                                          </div>
                                                          <div className="flex gap-1.5 opacity-0 group-item-hover:opacity-100 transition-opacity">
                                                              <button onClick={() => { setTargetTopic(topic); setLessonForm(l); setShowLessonModal(true); }} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-colors"><Edit size={14}/></button>
                                                              <button onClick={() => confirm("Excluir item?") && DatabaseService.deleteLesson(selectedSub.id, topic, l.id!).then(() => handleOpenSubject(selectedSub))} className="p-2 hover:bg-red-500/20 rounded-xl text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )) : (
                                          <div className="py-20 text-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                                              <Sparkles size={48} className="mx-auto mb-4 opacity-10"/>
                                              <p className="font-black uppercase tracking-widest text-xs">Nenhum tópico encontrado</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {subjects.map(s => (
                                      <button 
                                        key={s.id} 
                                        onClick={() => handleOpenSubject(s)}
                                        className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col items-center gap-4 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all group"
                                      >
                                          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-lg">
                                              <BookOpen size={28}/>
                                          </div>
                                          <span className="text-xs font-black text-slate-300 uppercase text-center tracking-tight">{s.name}</span>
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {/* === GERENCIADOR DE QUESTÕES === */}
                  {contentSubTab === 'bank' && (
                      <div className="animate-in fade-in duration-300 space-y-8">
                          <div className="flex justify-between items-center">
                              <div>
                                  <h3 className="text-2xl font-bold text-white">Banco de Exercícios</h3>
                                  <p className="text-slate-500 text-sm">Adicione questões categorizadas ao sistema.</p>
                              </div>
                              <button onClick={() => { setQuestionForm({ text: '', options: ['', '', '', '', ''], correctAnswer: 0, difficulty: 'medium', category: 'regular' }); setShowQuestionModal(true); }} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-900/20 transition-all flex items-center gap-2">
                                  <Plus size={20}/> CADASTRAR QUESTÃO
                              </button>
                          </div>

                          <div className="p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center text-slate-600 bg-slate-900/20">
                               <FileQuestion size={64} className="mx-auto mb-6 opacity-10" />
                               <p className="max-w-sm mx-auto font-medium">As questões cadastradas ficam disponíveis imediatamente no filtro do aluno.</p>
                          </div>
                      </div>
                  )}

                  {/* === SIMULADOS === */}
                  {contentSubTab === 'sims' && (
                      <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                           {simulations.map(sim => (
                               <div key={sim.id} className="p-8 bg-white/5 border border-white/5 rounded-3xl flex justify-between items-center group hover:border-purple-500/30 transition-all shadow-lg">
                                   <div>
                                       <h4 className="font-black text-white text-lg italic">{sim.title}</h4>
                                       <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{sim.durationMinutes} min • {sim.questionIds?.length || 0} questões</p>
                                   </div>
                                   <div className="flex gap-2">
                                       <button className="p-3 bg-slate-800 hover:bg-indigo-600 rounded-2xl text-slate-400 hover:text-white transition-all"><Edit size={18}/></button>
                                       <button onClick={() => confirm("Excluir simulado?") && DatabaseService.deleteSimulation(sim.id).then(fetchData)} className="p-3 bg-slate-800 hover:bg-red-600 rounded-2xl text-slate-400 hover:text-white transition-all"><Trash2 size={18}/></button>
                                   </div>
                               </div>
                           ))}
                           <button className="border-2 border-dashed border-white/10 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 text-slate-500 hover:bg-white/5 hover:border-indigo-500/40 transition-all group">
                               <Plus size={40} className="group-hover:scale-110 transition-transform" />
                               <span className="font-black uppercase tracking-[0.2em] text-xs">Novo Simulado</span>
                           </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- MODAIS DE CONTEÚDO --- */}

      {/* MODAL: SALVAR AULA */}
      {showLessonModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
              <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><PlayCircle size={100}/></div>
                  <h3 className="text-3xl font-black text-white mb-8 uppercase italic tracking-tighter">Configurar Aula</h3>
                  
                  <div className="space-y-5 relative z-10">
                      <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">Tópico (Pasta)</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none" value={targetTopic} onChange={e => setTargetTopic(e.target.value)} placeholder="Ex: Álgebra" /></div>
                      <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">Título da Aula</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">Tipo</label><select className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white outline-none" value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value as any})}><option value="video">🎥 Vídeo</option><option value="exercise_block">📝 Bloco Exercícios</option></select></div>
                          <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">Duração</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} placeholder="15:00" /></div>
                      </div>
                      {lessonForm.type === 'video' && (
                          <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">URL do YouTube</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none font-mono text-xs" value={lessonForm.videoUrl} onChange={e => setLessonForm({...lessonForm, videoUrl: e.target.value})} /></div>
                      )}
                      
                      <button onClick={handleSaveLesson} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 mt-4 shadow-xl transition-all hover:scale-[1.02]">
                          <Save size={20}/> SALVAR ITEM NA GRADE
                      </button>
                      <button onClick={() => setShowLessonModal(false)} className="w-full text-slate-500 text-xs font-black uppercase hover:text-white mt-4 tracking-widest">Cancelar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: CRIAR QUESTÃO */}
      {showQuestionModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-5xl shadow-2xl animate-in zoom-in-95 my-auto">
                  <h3 className="text-3xl font-black text-white mb-8 uppercase italic flex items-center gap-4">
                      <ImageIcon className="text-emerald-400"/> Editor de Questão Profissional
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Lado A: Meta & Localização */}
                      <div className="space-y-6">
                          <h4 className="text-xs text-indigo-400 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Indexação do Banco</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Matéria ID</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={qLoc.subject} onChange={e => setQLoc({...qLoc, subject: e.target.value})} placeholder="ex: fisica" /></div>
                              <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Assunto</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={qLoc.topic} onChange={e => setQLoc({...qLoc, topic: e.target.value})} placeholder="ex: Cinemática" /></div>
                              <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Sub-tópico</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={qLoc.subtopic} onChange={e => setQLoc({...qLoc, subtopic: e.target.value})} placeholder="ex: MRU" /></div>
                              <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">Dificuldade</label><select className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs" value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value as any})}><option value="easy">🟢 Fácil</option><option value="medium">🟡 Média</option><option value="hard">🔴 Difícil</option></select></div>
                          </div>
                          <div><label className="text-[10px] text-slate-500 font-black uppercase ml-1">URL Imagem Enunciado (Opcional)</label><input className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-xs font-mono" value={questionForm.imageUrl} onChange={e => setQuestionForm({...questionForm, imageUrl: e.target.value})} placeholder="https://..." /></div>
                      </div>

                      {/* Lado B: Enunciado e Alternativas */}
                      <div className="space-y-6">
                          <h4 className="text-xs text-emerald-400 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Enunciado & Opções</h4>
                          <div><textarea className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-sm h-40 focus:border-emerald-500 outline-none" value={questionForm.text} onChange={e => setQuestionForm({...questionForm, text: e.target.value})} placeholder="Escreva o texto da questão aqui..." /></div>
                          
                          <div className="space-y-2">
                              {questionForm.options?.map((opt, i) => (
                                  <div key={i} className="flex gap-3">
                                      <div 
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs cursor-pointer border transition-all ${questionForm.correctAnswer === i ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                                        onClick={() => setQuestionForm({...questionForm, correctAnswer: i})}
                                      >
                                          {String.fromCharCode(65+i)}
                                      </div>
                                      <input 
                                        className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-white/20" 
                                        value={opt} 
                                        onChange={e => {
                                          const next = [...(questionForm.options || [])];
                                          next[i] = e.target.value;
                                          setQuestionForm({...questionForm, options: next});
                                        }} 
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="mt-12 flex flex-col md:flex-row gap-4 border-t border-white/5 pt-8">
                      <button onClick={handleSaveQuestion} className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3">
                          <Save size={24}/> PUBLICAR NO BANCO
                      </button>
                      <button onClick={() => setShowQuestionModal(false)} className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black rounded-3xl transition-all">
                          DESCARTAR
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
