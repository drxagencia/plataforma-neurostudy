
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, RechargeRequest } from '../types';
import { DatabaseService } from '../services/databaseService';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight, 
  ArrowDownRight, Loader2, Download, BarChart3, Zap, PenTool 
} from 'lucide-react';

const FinanceiroPanel: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  useEffect(() => {
    DatabaseService.getAllGlobalTransactions().then(data => {
      setAllTransactions(data);
      setLoading(false);
    });
  }, []);

  const metrics = useMemo(() => {
    const filtered = allTransactions.filter(t => {
      const d = new Date(t.timestamp);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    let revenue = 0;
    let expenses = 0;
    const salesByOffer = { basic: 0, advanced: 0, essay: 0, ai: 0 };

    filtered.forEach(t => {
      if (t.type === 'credit') {
        revenue += t.amount;
        const desc = t.description.toLowerCase();
        if (desc.includes('basic')) salesByOffer.basic += t.amount;
        else if (desc.includes('adv')) salesByOffer.advanced += t.amount;
        else if (desc.includes('redação')) salesByOffer.essay += t.amount;
        else salesByOffer.ai += t.amount;
      } else {
        expenses += t.amount; // Gastos de API
      }
    });

    return { revenue, expenses, profit: revenue - expenses, salesByOffer, filtered };
  }, [allTransactions, selectedMonth, selectedYear]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white">BI Financeiro</h2>
          <p className="text-slate-400">Inteligência de faturamento NeuroStudy.</p>
        </div>
        <div className="flex gap-2 bg-slate-900 p-2 rounded-xl border border-white/10">
          <Calendar size={18} className="text-indigo-400" />
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-white font-bold outline-none">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-white font-bold outline-none">
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border-emerald-500/20">
          <p className="text-[10px] text-emerald-400 font-black uppercase mb-1">Faturamento Bruto</p>
          <p className="text-3xl font-black text-white">R$ {metrics.revenue.toFixed(2)}</p>
          <div className="mt-2 flex items-center gap-1 text-emerald-400 text-xs font-bold"><ArrowUpRight size={14}/> Entradas</div>
        </div>
        <div className="glass-card p-6 rounded-2xl border-indigo-500/20">
          <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">Lucro Líquido</p>
          <p className="text-3xl font-black text-white">R$ {metrics.profit.toFixed(2)}</p>
          <div className="mt-2 flex items-center gap-1 text-indigo-400 text-xs font-bold"><Zap size={14}/> Performance</div>
        </div>
        <div className="glass-card p-6 rounded-2xl border-red-500/20">
          <p className="text-[10px] text-red-400 font-black uppercase mb-1">Custo Operacional (API)</p>
          <p className="text-3xl font-black text-white">R$ {metrics.expenses.toFixed(2)}</p>
          <div className="mt-2 flex items-center gap-1 text-red-400 text-xs font-bold"><TrendingDown size={14}/> Tokens OpenAI</div>
        </div>
        <div className="glass-card p-6 rounded-2xl bg-indigo-600/10">
          <p className="text-[10px] text-white/50 font-black uppercase mb-1">Margem</p>
          <p className="text-3xl font-black text-white">{metrics.revenue > 0 ? ((metrics.profit/metrics.revenue)*100).toFixed(1) : 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2"><BarChart3/> Vendas por Produto</h3>
          <div className="space-y-6">
            {[
              { label: 'Advanced', val: metrics.salesByOffer.advanced, color: 'bg-indigo-500' },
              { label: 'Basic', val: metrics.salesByOffer.basic, color: 'bg-slate-500' },
              { label: 'Redações', val: metrics.salesByOffer.essay, color: 'bg-emerald-500' },
              { label: 'Recargas IA', val: metrics.salesByOffer.ai, color: 'bg-purple-500' },
            ].map(o => (
              <div key={o.label}>
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-300">{o.label}</span><span className="text-white font-bold">R$ {o.val.toFixed(2)}</span></div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${o.color}`} style={{ width: `${metrics.revenue > 0 ? (o.val/metrics.revenue)*100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl overflow-y-auto max-h-[400px]">
          <h3 className="font-bold text-white mb-4">Vendas Recentes</h3>
          <div className="space-y-3">
            {metrics.filtered.filter(t => t.type === 'credit').map(t => (
              <div key={t.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-white">{t.userName}</span>
                  <span className="text-emerald-400 font-bold text-xs">R$ {t.amount.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceiroPanel;
