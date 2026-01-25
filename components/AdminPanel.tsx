import React, { useState, useEffect } from 'react';
import { UserProfile, Subject, Question, Lesson } from '../types';
import { DatabaseService } from '../services/databaseService';
import { Search, CheckCircle, XCircle, Loader2, UserPlus, FilePlus, BookOpen, Layers, Save, Trash2, Plus, Image as ImageIcon } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'content'>('users');
  const [contentTab, setContentTab] = useState<'question' | 'lesson'>('question');
  
  // Data
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, string[]>>({});
  
  // States
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Create User States
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserMode, setNewUserMode] = useState(false);
  const [userDataForm, setUserDataForm] = useState({
      displayName: '',
      email: '',
      status: 'free',
      expiry: '',
      isAdmin: false
  });

  // Content Creation States
  const [contentForm, setContentForm] = useState({
      subjectId: '',
      topicName: '',
      // Question specific
      qText: '',
      qImageUrl: '', // New field
      qOptions: ['', '', '', ''],
      qCorrect: 0,
      qDifficulty: 'medium',
      qExplanation: '',
      // Lesson specific
      lTitle: '',
      lUrl: '',
      lDuration: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const [u, s, t] = await Promise.all([
        DatabaseService.getAllUsers(),
        DatabaseService.getSubjects(),
        DatabaseService.getTopics()
    ]);
    setUsers(u);
    setSubjects(s);
    setTopics(t);
    setLoading(false);
  };

  // --- USER LOGIC ---
  const handleSaveUser = async (uid: string | null) => {
    if (!uid && newUserMode) {
        // Mock ID creation (In real app, Auth creates UID)
        const newUid = `user_${Date.now()}`;
        await DatabaseService.createUserProfile(newUid, {
            displayName: userDataForm.displayName,
            email: userDataForm.email,
            subscriptionStatus: userDataForm.status as any,
            subscriptionExpiry: userDataForm.expiry,
            isAdmin: userDataForm.isAdmin,
            xp: 0,
            photoURL: ''
        });
        setNewUserMode(false);
    } else if (uid) {
        await DatabaseService.updateUserPlan(uid, userDataForm.status as any, userDataForm.expiry);
        setEditingUserId(null);
    }
    fetchInitialData(); // Refresh
  };

  const startEditUser = (user: UserProfile) => {
      setEditingUserId(user.uid);
      setUserDataForm({
          displayName: user.displayName,
          email: user.email,
          status: user.subscriptionStatus,
          expiry: user.subscriptionExpiry,
          isAdmin: user.isAdmin || false
      });
  };

  // --- CONTENT LOGIC ---
  const handleSaveContent = async () => {
      if (!contentForm.subjectId || !contentForm.topicName) {
          alert("Selecione Matéria e Tópico");
          return;
      }

      try {
          if (contentTab === 'question') {
              if (!contentForm.qText) return;
              const newQuestion: Question = {
                  text: contentForm.qText,
                  imageUrl: contentForm.qImageUrl || undefined,
                  options: contentForm.qOptions.filter(o => o.trim() !== ''),
                  correctAnswer: contentForm.qCorrect,
                  difficulty: contentForm.qDifficulty as any,
                  explanation: contentForm.qExplanation
              };
              await DatabaseService.createQuestion(contentForm.subjectId, contentForm.topicName, newQuestion);
              alert("Questão criada com sucesso!");
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
          // Reset relevant fields
          setContentForm(prev => ({...prev, qText: '', qImageUrl: '', lTitle: '', qOptions: ['', '', '', '']}));
      } catch (e) {
          alert("Erro ao salvar conteúdo.");
      }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-slide-up pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Painel Administrativo</h2>
          <p className="text-slate-400">Controle total sobre usuários e conteúdo pedagógico.</p>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10">
            <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <UserPlus size={16} /> Usuários
            </button>
            <button 
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'content' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <BookOpen size={16} /> Conteúdo
            </button>
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
                    onClick={() => { setNewUserMode(true); setUserDataForm({displayName: '', email: '', status: 'free', expiry: '', isAdmin: false}); }}
                    className="px-4 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold hover:bg-emerald-600/30 flex items-center gap-2 transition-all"
                  >
                      <Plus size={20} /> Novo Cliente
                  </button>
              </div>

              {/* Create User Form */}
              {newUserMode && (
                  <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 animate-fade-in">
                      <h3 className="font-bold text-emerald-400 mb-4 flex items-center gap-2"><UserPlus size={20}/> Cadastrar Novo Usuário</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <input placeholder="Nome Completo" className="glass-input p-3 rounded-lg" value={userDataForm.displayName} onChange={e => setUserDataForm({...userDataForm, displayName: e.target.value})} />
                          <input placeholder="E-mail" className="glass-input p-3 rounded-lg" value={userDataForm.email} onChange={e => setUserDataForm({...userDataForm, email: e.target.value})} />
                          <select className="glass-input p-3 rounded-lg" value={userDataForm.status} onChange={e => setUserDataForm({...userDataForm, status: e.target.value})}>
                              <option value="free">Plano Free</option>
                              <option value="pro">Plano Pro</option>
                          </select>
                          <input type="date" className="glass-input p-3 rounded-lg" value={userDataForm.expiry} onChange={e => setUserDataForm({...userDataForm, expiry: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setNewUserMode(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                          <button onClick={() => handleSaveUser(null)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500">Salvar Usuário</button>
                      </div>
                  </div>
              )}

              {/* Users List */}
              <div className="glass-card rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-900/50">
                          <tr>
                              <th className="p-4 text-slate-400">Nome</th>
                              <th className="p-4 text-slate-400">Email</th>
                              <th className="p-4 text-slate-400">Plano</th>
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
                                      <span className="text-white font-medium">{user.displayName}</span>
                                      {user.isAdmin && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 rounded">ADMIN</span>}
                                  </td>
                                  <td className="p-4 text-slate-400">{user.email}</td>
                                  <td className="p-4">
                                      {editingUserId === user.uid ? (
                                          <select 
                                            className="glass-input p-1 rounded text-xs"
                                            value={userDataForm.status}
                                            onChange={(e) => setUserDataForm({...userDataForm, status: e.target.value})}
                                          >
                                              <option value="free">Free</option>
                                              <option value="pro">Pro</option>
                                          </select>
                                      ) : (
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${user.subscriptionStatus === 'pro' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-400'}`}>
                                              {user.subscriptionStatus?.toUpperCase()}
                                          </span>
                                      )}
                                  </td>
                                  <td className="p-4 text-right">
                                      {editingUserId === user.uid ? (
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => handleSaveUser(user.uid)} className="text-emerald-400 hover:bg-emerald-500/10 p-2 rounded"><Save size={18}/></button>
                                              <button onClick={() => setEditingUserId(null)} className="text-red-400 hover:bg-red-500/10 p-2 rounded"><XCircle size={18}/></button>
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

      {/* --- CONTENT TAB --- */}
      {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Creator Form */}
              <div className="lg:col-span-2 space-y-6">
                  <div className="glass-card p-6 rounded-2xl">
                      <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                          <button 
                            onClick={() => setContentTab('question')}
                            className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${contentTab === 'question' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}
                          >
                              <FilePlus size={18} /> Criar Questão
                          </button>
                          <button 
                            onClick={() => setContentTab('lesson')}
                            className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${contentTab === 'lesson' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500'}`}
                          >
                              <Layers size={18} /> Adicionar Aula
                          </button>
                      </div>

                      {/* Common Fields */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-1">
                              <label className="text-xs text-slate-400">Matéria</label>
                              <select 
                                className="w-full glass-input p-3 rounded-lg"
                                value={contentForm.subjectId}
                                onChange={(e) => setContentForm({...contentForm, subjectId: e.target.value})}
                              >
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
                              <datalist id="topics-list">
                                  {contentForm.subjectId && topics[contentForm.subjectId]?.map(t => <option key={t} value={t} />)}
                              </datalist>
                          </div>
                      </div>

                      {/* Question Specific */}
                      {contentTab === 'question' && (
                          <div className="space-y-4 animate-fade-in">
                              <textarea 
                                  className="w-full glass-input p-4 rounded-xl min-h-[100px]" 
                                  placeholder="Enunciado da questão..."
                                  value={contentForm.qText}
                                  onChange={e => setContentForm({...contentForm, qText: e.target.value})}
                              />

                              <div className="space-y-1">
                                <label className="text-xs text-slate-400 flex items-center gap-2"><ImageIcon size={12}/> URL da Imagem (Opcional)</label>
                                <input 
                                  className="w-full glass-input p-3 rounded-lg"
                                  placeholder="https://exemplo.com/imagem.png"
                                  value={contentForm.qImageUrl}
                                  onChange={e => setContentForm({...contentForm, qImageUrl: e.target.value})}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                  <label className="text-xs text-slate-400">Alternativas (Marque a correta)</label>
                                  {contentForm.qOptions.map((opt, idx) => (
                                      <div key={idx} className="flex gap-2 items-center">
                                          <input 
                                              type="radio" 
                                              name="correct" 
                                              checked={contentForm.qCorrect === idx}
                                              onChange={() => setContentForm({...contentForm, qCorrect: idx})}
                                          />
                                          <input 
                                              className="flex-1 glass-input p-2 rounded-lg"
                                              placeholder={`Alternativa ${idx + 1}`}
                                              value={opt}
                                              onChange={(e) => {
                                                  const newOpts = [...contentForm.qOptions];
                                                  newOpts[idx] = e.target.value;
                                                  setContentForm({...contentForm, qOptions: newOpts});
                                              }}
                                          />
                                      </div>
                                  ))}
                              </div>

                              <textarea 
                                  className="w-full glass-input p-3 rounded-lg" 
                                  placeholder="Explicação da resposta (opcional)"
                                  value={contentForm.qExplanation}
                                  onChange={e => setContentForm({...contentForm, qExplanation: e.target.value})}
                              />

                              <button onClick={handleSaveContent} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all">
                                  Salvar Questão no Banco
                              </button>
                          </div>
                      )}

                      {/* Lesson Specific */}
                      {contentTab === 'lesson' && (
                          <div className="space-y-4 animate-fade-in">
                              <input 
                                  className="w-full glass-input p-3 rounded-lg" 
                                  placeholder="Título da Aula"
                                  value={contentForm.lTitle}
                                  onChange={e => setContentForm({...contentForm, lTitle: e.target.value})}
                              />
                              <input 
                                  className="w-full glass-input p-3 rounded-lg" 
                                  placeholder="URL do Vídeo (YouTube/Vimeo)"
                                  value={contentForm.lUrl}
                                  onChange={e => setContentForm({...contentForm, lUrl: e.target.value})}
                              />
                              <input 
                                  className="w-full glass-input p-3 rounded-lg" 
                                  placeholder="Duração (ex: 12:30)"
                                  value={contentForm.lDuration}
                                  onChange={e => setContentForm({...contentForm, lDuration: e.target.value})}
                              />
                               <button onClick={handleSaveContent} className="w-full py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-500 transition-all">
                                  Adicionar Aula
                              </button>
                          </div>
                      )}
                  </div>
              </div>

              {/* Instructions Side */}
              <div className="space-y-4">
                  <div className="glass-card p-6 rounded-2xl bg-indigo-900/10 border-indigo-500/20">
                      <h4 className="font-bold text-indigo-400 mb-2">Estrutura de Dados</h4>
                      <p className="text-sm text-slate-300 leading-relaxed mb-4">
                          Ao salvar, os dados são gravados diretamente no Firebase Realtime Database.
                          Certifique-se de digitar o nome do tópico corretamente para agrupar as questões.
                      </p>
                      <div className="text-xs text-slate-500 bg-black/20 p-3 rounded-lg font-mono">
                          questions/{'{subjectId}'}/{'{topic}'}/...
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;