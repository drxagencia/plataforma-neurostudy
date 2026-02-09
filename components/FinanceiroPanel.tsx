
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, RechargeRequest } from '../types';
import { DatabaseService } from '../services/databaseService';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2, 
  Download,
  BarChart3,
  CreditCard,
  Zap,
  PenTool
} from 'lucide-react';

const FinanceiroPanel: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [trans, reqs] = await Promise.all([
        DatabaseService.getAllGlobalTransactions(),
        DatabaseService.getRechargeRequests()
      ]);
      setAllTransactions(trans);
      // Fix: Cast reqs to RechargeRequest[] to resolve 'status' property does not exist on type 'unknown' error
      setRechargeRequests((reqs as RechargeRequest[]).filter(r => r.status === 'approved'));
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- BUSINESS LOGIC: FILTERS & CALCULATIONS ---
  const filteredData = useMemo(() => {
    return allTransactions.filter(t => {
      const date = new Date(t.timestamp);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [allTransactions, selectedMonth, selectedYear]);

  const metrics = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    
    // Categorias
    const salesByOffer = {
      basic: 0,
      advanced: 0,
      essay: 0,
      ai_unlimited: 0,
      ai_recharge: 0,
      other: 0
    };

    filteredData.forEach(t => {
      if (t.type === 'credit') {
        revenue += t.amount;
        
        // Logic to classify offer by description
        const desc = t.description.toLowerCase();
        if (desc.includes('basic')) salesByOffer.basic += t.amount;
        else if (desc.includes('adv')) salesByOffer.advanced += t.amount;
        else if (desc.includes('redação') || desc.includes('essay')) salesByOffer.essay += t.amount;
        else if (desc.includes('infinito') || desc.includes('ilimitada')) salesByOffer.ai_unlimited += t.amount;
        else if (desc.includes('ia') || desc.includes('mentor')) salesByOffer.ai_recharge += t.amount;
        else salesByOffer.other += t.amount;

      } else {
        // Debits are considered operational costs (AI Tokens)
        expenses += t.amount;
      }
    });

    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, expenses, profit, margin, salesByOffer };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-in fade-in">
      {/* Header & Month Filter */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-white mb-2 tracking-tight font-display">BI Financeiro</h2>
          <p className="text-slate-400">Análise de rentabilidade e performance de vendas.</p>
        </div>
        
        <div className="flex gap-2 bg-slate-900/80 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 px-3 border-r border-white/5">
            <Calendar size={18} className="text-indigo-400" />
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="bg-transparent text-white font-bold outline-none cursor-pointer px-3"
          >
            {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Main Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-emerald-500/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Faturamento Bruto</p>
          <div className="flex items-baseline gap-1 text-3xl font-black text-white">
            <span className="text-emerald-500 text-sm font-bold">R$</span>
            {metrics.revenue.toFixed(2)}
          </div>
          <div className="mt-4 flex items-center gap-1 text-emerald-400 text-xs font-bold">
            <ArrowUpRight size={14} /> Total Entradas
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-indigo-500/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Margem Líquida</p>
          <div className="flex items-baseline gap-1 text-3xl font-black text-white">
            {metrics.margin.toFixed(1)}
            <span className="text-indigo-400 text-sm font-bold">%</span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-indigo-400 text-xs font-bold">
            <Zap size={14} /> Performance
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-purple-500/20 relative overflow-hidden group">
          <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">Custo IA (Tokens)</p>
          <div className="flex items-baseline gap-1 text-3xl font-black text-white">
            <span className="text-purple-500 text-sm font-bold">R$</span>
            {metrics.expenses.toFixed(2)}
          </div>
          <div className="mt-4 flex items-center gap-1 text-red-400 text-xs font-bold">
            <TrendingDown size={14} /> Operacional
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-emerald-950/20 to-slate-900/90 relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
          <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">Lucro Real</p>
          <div className="flex items-baseline gap-1 text-3xl font-black text-emerald-400">
            <span className="text-emerald-500 text-sm font-bold">R$</span>
            {metrics.profit.toFixed(2)}
          </div>
          <div className="mt-4 flex items-center gap-1 text-emerald-300 text-xs font-bold">
            <DollarSign size={14} /> Disponível
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales by Offer Breakdown */}
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl border border-white/5">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="text-indigo-400" /> Performance por Oferta
            </h3>
            <button className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Download size={18} />
            </button>
          </div>

          <div className="space-y-6">
            {[
              { id: 'adv', label: 'Advanced (Anual/Mensal)', val: metrics.salesByOffer.advanced, color: 'bg-indigo-500', icon: <DollarSign size={14}/> },
              { id: 'basic', label: 'Basic (Anual/Mensal)', val: metrics.salesByOffer.basic, color: 'bg-slate-500', icon: <DollarSign size={14}/> },
              { id: 'essay', label: 'Planos de Redação', val: metrics.salesByOffer.essay, color: 'bg-emerald-500', icon: <PenTool size={14}/> },
              { id: 'ai_un', label: 'IA Ilimitada', val: metrics.salesByOffer.ai_unlimited, color: 'bg-yellow-500', icon: <Zap size={14}/> },
              { id: 'ai_rec', label: 'Recargas de IA', val: metrics.salesByOffer.ai_recharge, color: 'bg-purple-500', icon: <Zap size={14}/> },
            ].sort((a,b) => b.val - a.val).map(offer => {
              const perc = metrics.revenue > 0 ? (offer.val / metrics.revenue) * 100 : 0;
              return (
                <div key={offer.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${offer.color}/20 text-white`}>{offer.icon}</div>
                      <span className="text-sm font-bold text-slate-200">{offer.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-black">R$ {offer.val.toFixed(2)}</span>
                      <span className="text-slate-500 text-[10px] block font-bold uppercase tracking-wider">{perc.toFixed(1)}% do share</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${offer.color} transition-all duration-1000 shadow-[0_0_10px_currentColor]`} 
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Global Sales Log */}
        <div className="glass-card rounded-3xl border border-white/5 flex flex-col overflow-hidden max-h-[600px]">
          <div className="p-6 bg-slate-900/50 border-b border-white/5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <History className="text-slate-400" size={18} /> Vendas Recentes
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {filteredData.filter(t => t.type === 'credit').map(t => (
              <div key={t.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">{t.userName || 'Estudante'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <span className="text-emerald-400 font-black text-sm">R$ {t.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-black uppercase tracking-wider">
                    {t.description.split(':')[0]}
                  </span>
                  <span className="text-[9px] text-slate-500 truncate">{t.description.split(':')[1] || t.description}</span>
                </div>
              </div>
            ))}
            {filteredData.filter(t => t.type === 'credit').length === 0 && (
              <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest text-xs">Sem vendas no período.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Use simple history icon
const History = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
);

export default FinanceiroPanel;
