import React, { useState, useEffect } from 'react';
import { UserProfile, Subject, Question, Lesson, RechargeRequest, AiConfig, UserPlan } from '../types';
import { DatabaseService } from '../services/databaseService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon, Wallet, Settings as SettingsIcon } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'content' | 'finance' | 'config'>('users');
  const [contentTab, setContentTab] = useState<'question' | 'lesson'>('question');
  
  // Data
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  const [subtopics, setSubtopics] = useState<Record<string, string[]>>({});
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  
  // States
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit User
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserMode, setNewUserMode] = useState(false);
  const [userDataForm, setUserDataForm] = useState({
      displayName: '',
      email: '',
      plan: 'basic',
      expiry: '',
      isAdmin: false
  });

  // Content Form
  const [contentForm, setContentForm] = useState({
      subjectId: '',
      topicName: '',
      subtopicName: '', // Required for new structure
      qText: '',
      qImageUrl: '', 
      qOptions: ['', '', '', ''],
      qCorrect: 0,
      qDifficulty: 'medium',
      qExplanation: '',
      lTitle: '',
      lUrl: '',
      lDuration: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const [u, s, t, st, r, ac] = await Promise.all([
        DatabaseService.getAllUsers(),
        DatabaseService.getSubjects(),
        DatabaseService.getTopics(),
        DatabaseService.getSubTopics(),
        DatabaseService.getRechargeRequests(),
        DatabaseService.getAiConfig()
    ]);
    setUsers(u);
    setSubjects(s);
    setTopics(t);
    setSubtopics(st);
    setRecharges(r);
    setAiConfig(ac);
    setLoading(false);
  };

  // --- USER LOGIC ---
  const handleSaveUser = async (uid: string | null) => {
    if (!uid && newUserMode) {
        const newUid = `user_${Date.now()}`;
        await DatabaseService.createUserProfile(newUid, {
            displayName: userDataForm.displayName,
            email: userDataForm.email,
            isAdmin: userDataForm.isAdmin,
            plan: userDataForm.plan as UserPlan,
            subscriptionExpiry: userDataForm.expiry,
            xp: 0,
            photoURL: ''
        });
        setNewUserMode(false);
    } else if (uid) {
        await DatabaseService.updateUserPlan(uid, userDataForm.plan as UserPlan, userDataForm.expiry);
        setEditingUserId(null);
    }
    fetchInitialData();
  };

  const startEditUser = (user: UserProfile) => {
      setEditingUserId(user.uid);
      setUserDataForm({
          displayName: user.displayName,
          email: user.email,
          plan: user.plan || 'basic',
          expiry: user.subscriptionExpiry,
          isAdmin: user.isAdmin || false
      });
  };

  // --- FINANCIAL LOGIC ---
  const handleProcessRecharge = async (id: string, status: 'approved' | 'rejected') => {
      if (!confirm(`Tem certeza que deseja marcar como ${status}?`)) return;
      await DatabaseService.processRecharge(id, status);
      fetchInitialData();
  };

  // --- CONFIG LOGIC ---
  const handleSaveConfig = async () => {
      if (aiConfig) {
          await DatabaseService.updateAiConfig(aiConfig);
          alert("Configurações salvas!");
      }
  };

  // --- CONTENT LOGIC ---
  const handleSaveContent = async () => {
      if (!contentForm.subjectId || !contentForm.topicName) {
          alert("Selecione Matéria e Tópico");
          return;
      }
      try {
          if (contentTab === 'question') {
              if (!contentForm.qText || !contentForm.subtopicName) {
                  alert("Preencha o Enunciado e o Subtópico para manter a organização.");
                  return;
              }
              const newQuestion: Question = {
                  text: contentForm.qText,
                  imageUrl: contentForm.qImageUrl || undefined,
                  options: contentForm.qOptions.filter(o => o.trim() !== ''),
                  correctAnswer: contentForm.qCorrect,
                  difficulty: contentForm.qDifficulty as any,
                  explanation: contentForm.qExplanation,
                  subjectId: contentForm.subjectId,
                  topic: contentForm.topicName
              };
              
              await DatabaseService.createQuestion(contentForm.subjectId, contentForm.topicName, contentForm.subtopicName, newQuestion);
              
              // Force refresh to update topics/subtopics lists if they were new
              await fetchInitialData(); 
              
              alert("Questão criada com sucesso e estrutura atualizada!");
          } else {
              if (!contentForm.lTitle) return;
              const newLesson: Lesson = {
                  title: contentForm.lTitle,
                  videoUrl: contentForm.lUrl,
                  duration: contentForm.lDuration
              };
              await DatabaseService.createLesson(contentForm.subjectId, contentForm.topicName, newLesson);
              alert("Aula criada com sucesso!");
          }
          setContentForm(prev => ({...prev, qText: '', qImageUrl: '', lTitle: '', qOptions: ['', '', '', ''], qExplanation: ''}));
      } catch (e) {
          console.error(e);
          alert("Erro ao salvar conteúdo.");
      }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-slide-up pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Painel Administrativo</h2>
          <p className="text-slate-400">Controle total sobre usuários, finanças e conteúdo.</p>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
            {[
                { id: 'users', label: 'Usuários', icon: UserPlus },
                { id: 'content', label: 'Conteúdo', icon: BookOpen },
                { id: 'finance', label: 'Financeiro', icon: Wallet },
                { id: 'config', label: 'Config. IA', icon: SettingsIcon }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>
      </header>

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
          <div className="space-y-6">
              <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => { setNewUserMode(true); setUserDataForm({displayName: '', email: '', plan: 'basic', expiry: '', isAdmin: false}); }}
                    className="px-4 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold hover:bg-emerald-600/30 flex items-center gap-2 transition-all"
                  >
                      <Plus size={20} /> Novo Cliente
                  </button>
              </div>

              {newUserMode && (
                  <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 animate-fade-in">
                      <h3 className="font-bold text-emerald-400 mb-4 flex items-center gap-2"><UserPlus size={20}/> Cadastrar</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <input placeholder="Nome" className="glass-input p-3 rounded-lg" value={userDataForm.displayName} onChange={e => setUserDataForm({...userDataForm, displayName: e.target.value})} />
                          <input placeholder="E-mail" className="glass-input p-3 rounded-lg" value={userDataForm.email} onChange={e => setUserDataForm({...userDataForm, email: e.target.value})} />
                          <select className="glass-input p-3 rounded-lg" value={userDataForm.plan} onChange={e => setUserDataForm({...userDataForm, plan: e.target.value})}>
                              <option value="basic">Básico</option>
                              <option value="intermediate">Intermediário</option>
                              <option value="advanced">Avançado</option>
                              <option value="admin">Admin</option>
                          </select>
                          <input type="date" className="glass-input p-3 rounded-lg" value={userDataForm.expiry} onChange={e => setUserDataForm({...userDataForm, expiry: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setNewUserMode(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                          <button onClick={() => handleSaveUser(null)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Salvar</button>
                      </div>
                  </div>
              )}

              <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                          <tr>
                              <th className="p-4 text-slate-400">Nome</th>
                              <th className="p-4 text-slate-400">Plano</th>
                              <th className="p-4 text-slate-400">Saldo</th>
                              <th className="p-4 text-slate-400 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {users.filter(u => u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                              <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                                  <td className="p-4 flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                          {user.displayName?.charAt(0)}
                                      </div>
                                      <div>
                                          <p className="text-white font-medium">{user.displayName}</p>
                                          <p className="text-xs text-slate-500">{user.email}</p>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      {editingUserId === user.uid ? (
                                          <select 
                                            className="glass-input p-1 rounded text-xs"
                                            value={userDataForm.plan}
                                            onChange={(e) => setUserDataForm({...userDataForm, plan: e.target.value})}
                                          >
                                              <option value="basic">Básico</option>
                                              <option value="intermediate">Intermediário</option>
                                              <option value="advanced">Avançado</option>
                                              <option value="admin">Admin</option>
                                          </select>
                                      ) : (
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                              user.plan === 'advanced' ? 'bg-purple-500/20 text-purple-300' : 
                                              user.plan === 'intermediate' ? 'bg-indigo-500/20 text-indigo-300' :
                                              user.plan === 'admin' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-400'
                                          }`}>
                                              {user.plan}
                                          </span>
                                      )}
                                  </td>
                                  <td className="p-4 font-mono text-emerald-400">R$ {user.balance?.toFixed(2) || '0.00'}</td>
                                  <td className="p-4 text-right">
                                      {editingUserId === user.uid ? (
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => handleSaveUser(user.uid)} className="text-emerald-400 p-2"><Save size={18}/></button>
                                              <button onClick={() => setEditingUserId(null)} className="text-red-400 p-2"><XCircle size={18}/></button>
                                          </div>
                                      ) : (
                                          <button onClick={() => startEditUser(user)} className="text-indigo-400 hover:text-indigo-300 font-medium text-sm">Editar</button>
                                      )}
                                  </td>
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
              <h3 className="text-xl font-bold text-white">Solicitações de Recarga (PIX)</h3>
              <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                          <tr>
                              <th className="p-4 text-slate-400">Usuário</th>
                              <th className="p-4 text-slate-400">Valor</th>
                              <th className="p-4 text-slate-400">Data</th>
                              <th className="p-4 text-slate-400">Status</th>
                              <th className="p-4 text-slate-400 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {recharges.map(req => (
                              <tr key={req.id} className="hover:bg-white/5">
                                  <td className="p-4 text-white font-medium">{req.userDisplayName}</td>
                                  <td className="p-4 font-mono text-lg text-emerald-400">R$ {req.amount.toFixed(2)}</td>
                                  <td className="p-4 text-sm text-slate-500">{new Date(req.timestamp).toLocaleDateString()} {new Date(req.timestamp).toLocaleTimeString()}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                          req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                      }`}>{req.status}</span>
                                  </td>
                                  <td className="p-4 text-right">
                                      {req.status === 'pending' && (
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => handleProcessRecharge(req.id, 'approved')} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2 rounded transition-colors" title="Aprovar">
                                                  <CheckCircle size={18} />
                                              </button>
                                              <button onClick={() => handleProcessRecharge(req.id, 'rejected')} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded transition-colors" title="Rejeitar">
                                                  <XCircle size={18} />
                                              </button>
                                          </div>
                                      )}
                                  </td>
                              </tr>
                          ))}
                          {recharges.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma solicitação pendente.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- CONFIG AI TAB --- */}
      {activeTab === 'config' && aiConfig && (
          <div className="max-w-2xl glass-card p-8 rounded-2xl">
              <h3 className="text-xl font-bold text-white mb-6">Configuração do Plano Intermediário</h3>
              <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
                      <div>
                          <p className="font-bold text-white">IA: Explicação de Erros</p>
                          <p className="text-xs text-slate-400">Permitir função "Quer saber pq errou?"</p>
                      </div>
                      <div 
                        onClick={() => setAiConfig({...aiConfig, intermediateLimits: {...aiConfig.intermediateLimits, canUseExplanation: !aiConfig.intermediateLimits.canUseExplanation}})}
                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${aiConfig.intermediateLimits.canUseExplanation ? 'bg-indigo-600' : 'bg-slate-700'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiConfig.intermediateLimits.canUseExplanation ? 'left-7' : 'left-1'}`} />
                      </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
                      <div>
                          <p className="font-bold text-white">IA: Chat Livre</p>
                          <p className="text-xs text-slate-400">Permitir conversa livre no Tutor.</p>
                      </div>
                      <div 
                        onClick={() => setAiConfig({...aiConfig, intermediateLimits: {...aiConfig.intermediateLimits, canUseChat: !aiConfig.intermediateLimits.canUseChat}})}
                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${aiConfig.intermediateLimits.canUseChat ? 'bg-indigo-600' : 'bg-slate-700'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiConfig.intermediateLimits.canUseChat ? 'left-7' : 'left-1'}`} />
                      </div>
                  </div>

                  <button onClick={handleSaveConfig} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500">
                      Salvar Regras de IA
                  </button>
              </div>
          </div>
      )}

      {/* --- CONTENT TAB --- */}
      {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Creator Form */}
              <div className="lg:col-span-2 space-y-6">
                  <div className="glass-card p-6 rounded-2xl">
                      <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                          <button onClick={() => setContentTab('question')} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${contentTab === 'question' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><FilePlus size={18} /> Criar Questão</button>
                          <button onClick={() => setContentTab('lesson')} className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${contentTab === 'lesson' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}><Layers size={18} /> Adicionar Aula</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-1">
                              <label className="text-xs text-slate-400">Matéria</label>
                              <select className="w-full glass-input p-3 rounded-lg" value={contentForm.subjectId} onChange={(e) => setContentForm({...contentForm, subjectId: e.target.value})}>
                                  <option value="">Selecione...</option>
                                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs text-slate-400">Tópico</label>
                              <input 
                                className="w-full glass-input p-3 rounded-lg" 
                                placeholder="Ex: Cinemática" 
                                value={contentForm.topicName} 
                                onChange={(e) => setContentForm({...contentForm, topicName: e.target.value})} 
                                list="topics-list" 
                              />
                              <datalist id="topics-list">{contentForm.subjectId && topics[contentForm.subjectId]?.map(t => <option key={t} value={t} />)}</datalist>
                          </div>
                      </div>

                      {contentTab === 'question' && (
                          <div className="space-y-4 animate-fade-in">
                              {/* Subtopic Input - Critical for new structure */}
                              <div className="space-y-1">
                                  <label className="text-xs text-slate-400">Subtópico</label>
                                  <input 
                                    className="w-full glass-input p-3 rounded-lg" 
                                    placeholder="Ex: Movimento Uniforme" 
                                    value={contentForm.subtopicName} 
                                    onChange={(e) => setContentForm({...contentForm, subtopicName: e.target.value})} 
                                    list="subtopics-list"
                                  />
                                  <datalist id="subtopics-list">{contentForm.topicName && subtopics[contentForm.topicName]?.map(st => <option key={st} value={st} />)}</datalist>
                                  <p className="text-[10px] text-slate-500">Subtópicos organizam as questões. Se não existir, será criado.</p>
                              </div>

                              <textarea className="w-full glass-input p-4 rounded-xl min-h-[100px]" placeholder="Enunciado da questão..." value={contentForm.qText} onChange={e => setContentForm({...contentForm, qText: e.target.value})} />
                              <input className="w-full glass-input p-3 rounded-lg" placeholder="URL da Imagem (Opcional)" value={contentForm.qImageUrl} onChange={e => setContentForm({...contentForm, qImageUrl: e.target.value})} />
                              
                              <div className="space-y-2">
                                  <label className="text-xs text-slate-400">Alternativas</label>
                                  {contentForm.qOptions.map((opt, idx) => (
                                      <div key={idx} className="flex gap-2 items-center">
                                          <input type="radio" name="correct" checked={contentForm.qCorrect === idx} onChange={() => setContentForm({...contentForm, qCorrect: idx})} />
                                          <input className="flex-1 glass-input p-2 rounded-lg" placeholder={`Alternativa ${idx + 1}`} value={opt} onChange={(e) => { const newOpts = [...contentForm.qOptions]; newOpts[idx] = e.target.value; setContentForm({...contentForm, qOptions: newOpts}); }} />
                                      </div>
                                  ))}
                              </div>

                              <textarea className="w-full glass-input p-3 rounded-lg" placeholder="Explicação da resposta" value={contentForm.qExplanation} onChange={e => setContentForm({...contentForm, qExplanation: e.target.value})} />
                              <button onClick={handleSaveContent} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all">Salvar Questão</button>
                          </div>
                      )}

                      {contentTab === 'lesson' && (
                          <div className="space-y-4 animate-fade-in">
                              <input className="w-full glass-input p-3 rounded-lg" placeholder="Título da Aula" value={contentForm.lTitle} onChange={e => setContentForm({...contentForm, lTitle: e.target.value})} />
                              <input className="w-full glass-input p-3 rounded-lg" placeholder="URL do Vídeo" value={contentForm.lUrl} onChange={e => setContentForm({...contentForm, lUrl: e.target.value})} />
                              <input className="w-full glass-input p-3 rounded-lg" placeholder="Duração" value={contentForm.lDuration} onChange={e => setContentForm({...contentForm, lDuration: e.target.value})} />
                               <button onClick={handleSaveContent} className="w-full py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-500 transition-all">Adicionar Aula</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;