
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, OperationalCost, UserProfile } from '../types';
import { DatabaseService } from '../services/databaseService';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight, 
  ArrowDownRight, Loader2, Download, BarChart3, Zap, PenTool, Plus, Trash2, PieChart, Info, CheckCircle
} from 'lucide-react';

const FinanceiroPanel: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [operationalCosts, setOperationalCosts] = useState<OperationalCost[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [viewMode, setViewMode] = useState<'monthly' | 'total'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Form State
  const [showAddCost, setShowAddCost] = useState(false);
  const [newCost, setNewCost] = useState({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });

  const months = ["Jan", "Fev", "Mar", "Abr", "Maio", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const years = [2024, 2025, 2026, 2027];

  const fetchData = async () => {
    setLoading(true);
    const [trans, costs, users] = await Promise.all([
      DatabaseService.getAllGlobalTransactions(),
      DatabaseService.getOperationalCosts(),
      DatabaseService.getAllUsers()
    ]);
    setAllTransactions(trans);
    setOperationalCosts(costs);
    setAllUsers(users);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const metrics = useMemo(() => {
    // 1. Calculate Gross Revenue (All-time LTV from users)
    const grossTotal = allUsers.reduce((acc, user) => acc + (user.totalSpent || 0), 0);
    
    // 2. Filter data for the current view
    const filteredTransactions = viewMode === 'total' 
        ? allTransactions 
        : allTransactions.filter(t => {
            const d = new Date(t.timestamp);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

    const filteredCosts = viewMode === 'total'
        ? operationalCosts
        : operationalCosts.filter(c => {
            const d = new Date(c.date);
            return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
        });

    // Gross Revenue for the selected period
    // If 'total', we use the LTV sum. If 'monthly', we sum credits in the period.
    const periodGross = viewMode === 'total' 
        ? grossTotal 
        : filteredTransactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.amount, 0);

    // Operational Costs for the period (Manual Costs registered by admin)
    const periodExpenses = filteredCosts.reduce((acc, c) => acc + c.amount, 0);

    // Sales breakdown by offer (using transaction descriptions)
    const salesByOffer = { basic: 0, advanced: 0, essay: 0, ai: 0 };
    filteredTransactions.forEach(t => {
        if (t.type === 'credit') {
            const desc = t.description.toLowerCase();
            if (desc.includes('basic')) salesByOffer.basic += t.amount;
            else if (desc.includes('adv')) salesByOffer.advanced += t.amount;
            else if (desc.includes('redação') || desc.includes('correção')) salesByOffer.essay += t.amount;
            else salesByOffer.ai += t.amount;
        }
    });

    return { 
        revenue: periodGross, 
        expenses: periodExpenses, 
        profit: periodGross - periodExpenses, 
        salesByOffer, 
        filteredTransactions,
        filteredCosts
    };
  }, [allTransactions, operationalCosts, allUsers, selectedMonth, selectedYear, viewMode]);

  const handleAddCost = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCost.name || !newCost.amount || !newCost.date) return;
      
      setLoading(true);
      await DatabaseService.saveOperationalCost({
          name: newCost.name,
          amount: parseFloat(newCost.amount),
          date: newCost.date
      });
      setNewCost({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
      setShowAddCost(false);
      await fetchData();
  };

  const handleDeleteCost = async (id: string) => {
      if (!confirm("Excluir este custo operacional?")) return;
      await DatabaseService.deleteOperationalCost(id);
      await fetchData();
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-white flex items-center gap-3">
            BI Financeiro <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded uppercase font-bold tracking-widest">Admin</span>
          </h2>
          <p className="text-slate-400">Inteligência de faturamento e gestão de custos NeuroStudy.</p>
        </div>

        <div className="flex flex-wrap gap-2">
           <div className="bg-slate-900 p-1 rounded-xl border border-white/10 flex">
                <button 
                    onClick={() => setViewMode('monthly')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                    Filtro Mensal
                </button>
                <button 
                    onClick={() => setViewMode('total')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'total' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                    Saldo Total
                </button>
           </div>

           {viewMode === 'monthly' && (
                <div className="flex gap-2 bg-slate-900 p-2 rounded-xl border border-white/10">
                    <Calendar size={18} className="text-indigo-400" />
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-white text-sm font-bold outline-none">
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-white text-sm font-bold outline-none">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
           )}

           <button 
                onClick={() => setShowAddCost(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
           >
               <Plus size={16}/> Lançar Custo
           </button>
        </div>
      </div>

      {/* Main Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border-indigo-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5"><DollarSign size={40}/></div>
          <p className="text-[10px] text-indigo-400 font-black uppercase mb-1 flex items-center gap-1">
              Faturamento Bruto {viewMode === 'total' && <span className="text-[8px] bg-indigo-500/20 px-1 rounded">LTV</span>}
          </p>
          <p className="text-3xl font-black text-white">R$ {metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <div className="mt-2 flex items-center gap-1 text-emerald-400 text-xs font-bold"><ArrowUpRight size={14}/> Entradas {viewMode === 'total' ? 'Acumuladas' : 'no Mês'}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-red-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5"><TrendingDown size={40}/></div>
          <p className="text-[10px] text-red-400 font-black uppercase mb-1">Custos Operacionais</p>
          <p className="text-3xl font-black text-white">R$ {metrics.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <div className="mt-2 flex items-center gap-1 text-red-400 text-xs font-bold"><TrendingDown size={14}/> Despesas Lançadas</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-emerald-500/20 bg-gradient-to-br from-emerald-900/10 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Zap size={40} className="text-emerald-400" /></div>
          <p className="text-[10px] text-emerald-400 font-black uppercase mb-1">Lucro Líquido Real</p>
          <p className={`text-3xl font-black ${metrics.profit >= 0 ? 'text-white' : 'text-red-500'}`}>
            R$ {metrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-2 flex items-center gap-1 text-indigo-400 text-xs font-bold"><CheckCircle size={14}/> Performance</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-white/5 bg-slate-900/50">
          <p className="text-[10px] text-white/50 font-black uppercase mb-1">Margem de Lucro</p>
          <p className="text-3xl font-black text-white">
            {metrics.revenue > 0 ? ((metrics.profit / metrics.revenue) * 100).toFixed(1) : '0'}%
          </p>
          <div className="mt-2 flex items-center gap-1 text-slate-500 text-xs font-bold"><PieChart size={14}/> Eficiência Financeira</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales by Product */}
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <BarChart3 className="text-indigo-400" /> Vendas por Produto {viewMode === 'total' ? '(Histórico)' : `(${months[selectedMonth]})`}
          </h3>
          <div className="space-y-6">
            {[
              { label: 'Advanced (Upgrade/Anual)', val: metrics.salesByOffer.advanced, color: 'bg-indigo-500' },
              { label: 'Basic (Inscrições)', val: metrics.salesByOffer.basic, color: 'bg-slate-500' },
              { label: 'Redações (Pacotes)', val: metrics.salesByOffer.essay, color: 'bg-emerald-500' },
              { label: 'Recargas de Saldo IA', val: metrics.salesByOffer.ai, color: 'bg-purple-500' },
            ].sort((a,b) => b.val - a.val).map(o => {
              const perc = metrics.revenue > 0 ? (o.val / metrics.revenue) * 100 : 0;
              return (
                <div key={o.label}>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-300 font-medium">{o.label}</span>
                        <div className="text-right">
                            <span className="text-white font-bold block">R$ {o.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{perc.toFixed(1)}% do faturamento</span>
                        </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${o.color} transition-all duration-1000 shadow-[0_0_10px_currentColor]`} style={{ width: `${perc}%` }} />
                    </div>
                </div>
              )
            })}
          </div>

          <div className="mt-10 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
              <Info size={18} className="text-indigo-400 mt-0.5" />
              <p className="text-xs text-indigo-200/70 leading-relaxed">
                  <strong>Dica de BI:</strong> O faturamento bruto é calculado com base nas transações de crédito aprovadas. 
                  No modo <strong>Saldo Total</strong>, utilizamos a soma do LTV (total gasto) de todos os perfis de usuários para maior precisão histórica.
              </p>
          </div>
        </div>

        {/* Cost Management List */}
        <div className="glass-card rounded-3xl overflow-hidden flex flex-col max-h-[600px] border border-white/5 shadow-xl">
          <div className="p-6 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingDown className="text-red-400" size={18} /> Custos Lançados
            </h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase">{metrics.filteredCosts.length} Itens</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {metrics.filteredCosts.length > 0 ? metrics.filteredCosts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(cost => (
              <div key={cost.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-colors">
                <div>
                  <p className="text-sm font-bold text-white mb-1">{cost.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 bg-black/40 px-2 py-0.5 rounded font-mono">
                        {new Date(cost.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-red-400 font-black text-sm">- R$ {cost.amount.toFixed(2)}</span>
                    <button onClick={() => handleDeleteCost(cost.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14}/>
                    </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-600">
                <TrendingDown size={32} className="mx-auto mb-2 opacity-20"/>
                <p className="text-xs uppercase font-bold tracking-widest">Nenhum custo no período.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COST FORM MODAL */}
      {showAddCost && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
              <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-white italic">LANÇAR DESPESA</h3>
                      <button onClick={() => setShowAddCost(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <form onSubmit={handleAddCost} className="space-y-4">
                      <div>
                          <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Descrição do Custo</label>
                          <input 
                            required
                            className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white focus:border-indigo-500 outline-none mt-1" 
                            placeholder="Ex: Recarga API OpenAI, Servidor..."
                            value={newCost.name}
                            onChange={e => setNewCost({...newCost, name: e.target.value})}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Valor (R$)</label>
                            <input 
                                required
                                type="number"
                                step="0.01"
                                className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white focus:border-indigo-500 outline-none mt-1" 
                                placeholder="0,00"
                                value={newCost.amount}
                                onChange={e => setNewCost({...newCost, amount: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Data do Gasto</label>
                            <input 
                                required
                                type="date"
                                className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white focus:border-indigo-500 outline-none mt-1"
                                value={newCost.date}
                                onChange={e => setNewCost({...newCost, date: e.target.value})}
                            />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                      >
                          <CheckCircle size={20}/> Registrar Custo
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

// Icons wrapper for close
const X = ({ className, size }: { className?: string, size?: number }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default FinanceiroPanel;
