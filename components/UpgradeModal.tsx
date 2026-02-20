import React, { useState } from 'react';
import { UserProfile } from '../types';
import { PixService } from '../services/pixService';
import { DatabaseService } from '../services/databaseService';
import { KIRVANO_LINKS } from '../constants';
import { X, Check, Copy, QrCode, Crown, Zap, ShieldCheck, ArrowRight, CreditCard, Repeat, AlertCircle, Sparkles, Rocket, BrainCircuit, Bot, Clock, User } from 'lucide-react';

interface UpgradeModalProps {
    user: UserProfile;
    onClose: () => void;
    mode?: 'plan' | 'ai'; // 'plan' = Basic->Advanced | 'ai' = AI Unlimited
}

type UpgradeStep = 'benefits' | 'method' | 'pix_cycle' | 'pix_pay' | 'card_warn' | 'success';

const UpgradeModal: React.FC<UpgradeModalProps> = ({ user, onClose, mode = 'plan' }) => {
    const [step, setStep] = useState<UpgradeStep>('benefits');
    const [selectedCycle, setSelectedCycle] = useState<'weekly' | 'monthly' | 'yearly'>(mode === 'ai' ? 'monthly' : 'yearly');
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
    const [pixPayload, setPixPayload] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [upgradeCost, setUpgradeCost] = useState(0);
    const [payerName, setPayerName] = useState('');

    // --- CONFIGURAÇÃO DE PREÇOS ---
    
    // Preços Planos (Upgrade Basic -> Advanced)
    const PLAN_PRICES = {
        basic: { monthly: 9.90, yearly: 94.00 },
        advanced: { monthly: 19.90, yearly: 197.00 }
    };

    // Preços IA Ilimitada (Flat Prices)
    const AI_PRICES = {
        weekly: 9.90,
        monthly: 19.90,
        yearly: 47.90
    };

    const isCurrentYearly = user.billingCycle === 'yearly';

    // --- CÁLCULO DE VALORES ---
    const calculateCost = (targetCycle: 'weekly' | 'monthly' | 'yearly') => {
        if (mode === 'ai') {
            // IA é preço fixo, não tem diferença de plano
            if (targetCycle === 'weekly') return AI_PRICES.weekly;
            if (targetCycle === 'monthly') return AI_PRICES.monthly;
            return AI_PRICES.yearly;
        } else {
            // Lógica Upgrade de Plano (apenas mensal/anual)
            if (targetCycle === 'weekly') return 0; // Invalid for plan
            const currentPaid = isCurrentYearly ? PLAN_PRICES.basic.yearly : PLAN_PRICES.basic.monthly;
            const targetPrice = targetCycle === 'yearly' ? PLAN_PRICES.advanced.yearly : PLAN_PRICES.advanced.monthly;
            return Math.max(0, targetPrice - currentPaid);
        }
    };

    // --- HANDLERS ---

    const handlePixCycleSelection = (cycle: 'weekly' | 'monthly' | 'yearly') => {
        // Prevent Weekly/Monthly PIX for AI
        if (mode === 'ai' && paymentMethod === 'pix' && cycle !== 'yearly') {
            alert("Este plano só está disponível via Cartão de Crédito.");
            return;
        }

        const cost = calculateCost(cycle);
        setUpgradeCost(cost);
        setSelectedCycle(cycle);
        
        try {
            const payload = PixService.generatePayload(cost);
            setPixPayload(payload);
            setStep('pix_pay');
        } catch (e) {
            alert("Erro ao gerar QR Code.");
        }
    };

    const handleCardRedirect = (cycle?: 'weekly' | 'monthly' | 'yearly') => {
        const finalCycle = cycle || selectedCycle;
        if (mode === 'ai') {
            let link = KIRVANO_LINKS.ai_monthly;
            if (finalCycle === 'weekly') link = KIRVANO_LINKS.ai_weekly;
            if (finalCycle === 'yearly') link = KIRVANO_LINKS.ai_yearly;
            window.open(link, '_blank');
        } else {
            const link = finalCycle === 'yearly' ? KIRVANO_LINKS.upgrade_yearly : KIRVANO_LINKS.upgrade_monthly;
            window.open(link, '_blank');
        }
        onClose();
    };

    const handlePixConfirm = async () => {
        if (!payerName.trim()) {
            alert("Por favor, informe o nome do pagador para conferência.");
            return;
        }

        if (!window.confirm(`CONFIRMAÇÃO:\n\nNome do Pagador: ${payerName}\nValor: R$ ${upgradeCost.toFixed(2)}\n\nVocê tem CERTEZA ABSOLUTA que o nome do pagador está 100% correto? Divergências podem atrasar a liberação.`)) {
            return;
        }

        setLoading(true);
        try {
            let planLabel = '';
            if (mode === 'ai') {
                const cycleMap = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };
                planLabel = `IA Ilimitada - ${cycleMap[selectedCycle]}`;
            } else {
                const cycleMap = { monthly: 'Mensal', yearly: 'Anual', weekly: '-' };
                planLabel = `UPGRADE: Basic -> Advanced (${cycleMap[selectedCycle]})`;
            }

            // Using payerName as the display name for the transaction request to aid admin verification
            await DatabaseService.createRechargeRequest(
                user.uid,
                payerName.toUpperCase(), // Store Payer Name here for Admin visibility
                upgradeCost,
                'BRL',
                0, 
                planLabel
            );
            setStep('success');
            setTimeout(() => {
                onClose();
                window.location.reload(); 
            }, 3000);
        } catch (e: any) {
            console.error("Upgrade Confirm Error:", e);
            alert("Erro ao confirmar: " + (e.message || "Tente novamente."));
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERERS ---

    const renderAiBenefits = () => (
        <div className="p-8 md:p-10 text-center flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-3 animate-pulse-slow">
                <BrainCircuit size={32} className="text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase italic tracking-wider">
                NeuroAI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Ilimitada</span>
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg">
                Remova os limites de tokens e tenha acesso total ao Mentor IA 24h.
            </p>

            <div className="grid grid-cols-1 gap-4 mb-8 text-left">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex gap-3 items-start hover:border-indigo-500/30 transition-colors">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Bot size={18}/></div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Chat Ilimitado</h4>
                        <p className="text-xs text-slate-400 mt-1">Sem consumo de saldo por mensagem ou dúvida.</p>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex gap-3 items-start hover:border-emerald-500/30 transition-colors">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Sparkles size={18}/></div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Explicações Profundas</h4>
                        <p className="text-xs text-slate-400 mt-1">Peça para a IA explicar erros de questões e resumos de aulas.</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => setStep('method')}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-lg rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
            >
                DESBLOQUEAR AGORA <ArrowRight size={20} />
            </button>
        </div>
    );

    const renderPlanBenefits = () => (
        <div className="p-8 md:p-10 text-center flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-3 animate-pulse-slow">
                <Crown size={32} className="text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase italic tracking-wider">
                Torne-se <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Lendário</span>
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg">
                Desbloqueie o poder total da plataforma NeuroStudy e acelere sua aprovação.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex gap-3 items-start hover:border-yellow-500/30 transition-colors">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Rocket size={18}/></div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Simulados Oficiais</h4>
                        <p className="text-xs text-slate-400 mt-1">Acesso a provas inéditas e ranking nacional.</p>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex gap-3 items-start hover:border-purple-500/30 transition-colors">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Repeat size={18}/></div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Créditos Recorrentes</h4>
                        <p className="text-xs text-slate-400 mt-1">Receba créditos de redação todo mês automaticamente.</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => setStep('method')}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
            >
                QUERO EVOLUIR AGORA <ArrowRight size={20} />
            </button>
        </div>
    );

    const renderAiCycles = () => {
        const isPix = paymentMethod === 'pix';

        return (
            <div className="space-y-4 mb-8">
                {/* WEEKLY */}
                <div 
                    onClick={() => !isPix && handleCardRedirect('weekly')} 
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex justify-between items-center group ${isPix ? 'bg-slate-900 border-white/5 opacity-40 cursor-not-allowed' : 'bg-slate-800 border-white/10 hover:border-indigo-500/50 hover:bg-slate-700'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-900 rounded-lg text-slate-300"><Clock size={20}/></div>
                        <div>
                            <h4 className="font-bold text-white">Semanal</h4>
                            <p className="text-xs text-slate-400">{isPix ? 'Apenas Cartão' : '7 dias de acesso total'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-white">R$ 9,90</p>
                    </div>
                </div>

                {/* MONTHLY */}
                <div 
                    onClick={() => !isPix && handleCardRedirect('monthly')} 
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex justify-between items-center group relative overflow-hidden ${isPix ? 'bg-slate-900 border-white/5 opacity-40 cursor-not-allowed' : 'bg-indigo-900/20 border-indigo-500/50 hover:bg-indigo-900/40'}`}
                >
                    {!isPix && <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">Popular</div>}
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><BrainCircuit size={20}/></div>
                        <div>
                            <h4 className="font-bold text-white">Mensal</h4>
                            <p className="text-xs text-indigo-300">{isPix ? 'Apenas Cartão' : 'Renova a cada 30 dias'}</p>
                        </div>
                    </div>
                    <div className="text-right relative z-10">
                        <p className="text-xl font-black text-white">R$ 19,90</p>
                    </div>
                </div>

                {/* YEARLY */}
                <div onClick={() => isPix ? handlePixCycleSelection('yearly') : handleCardRedirect('yearly')} className="cursor-pointer p-4 rounded-2xl bg-emerald-900/10 border border-emerald-500/30 hover:bg-emerald-900/20 transition-all flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Rocket size={20}/></div>
                        <div>
                            <h4 className="font-bold text-white">Anual</h4>
                            <p className="text-xs text-emerald-300/80">Melhor custo-benefício</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-white">R$ 47,90</p>
                        <p className="text-[10px] text-emerald-400 font-bold">Economize 80%</p>
                    </div>
                </div>
                
                {isPix && <p className="text-center text-xs text-yellow-500 mt-2 font-bold bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">Pagamento via PIX direto no nosso site apenas para o plano Anual.</p>}
            </div>
        );
    };

    const renderPlanCycles = () => (
        <div className="space-y-4 mb-8">
            {/* ANUAL OPTION (HERO) */}
            <div 
                onClick={() => handlePixCycleSelection('yearly')}
                className="relative p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-slate-900 border-2 border-indigo-500 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 transition-all group"
            >
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recomendado</div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-black text-xl text-white flex items-center gap-2"><Sparkles size={18} className="text-yellow-400 fill-yellow-400"/> Advanced Anual</h4>
                </div>
                <p className="text-slate-400 text-xs mb-4">Equivalente a <strong>R$ 16,41/mês</strong>. (2 meses grátis)</p>
                
                <div className="bg-slate-950/50 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Valor do Plano</span>
                    <span className="text-white font-bold">R$ 197,00</span>
                </div>
                <div className="bg-emerald-900/20 p-3 rounded-lg border border-emerald-500/20 flex justify-between items-center mt-2">
                    <span className="text-xs text-emerald-400">Seu Crédito (Já pago)</span>
                    <span className="text-emerald-400 font-bold">- R$ {(isCurrentYearly ? PLAN_PRICES.basic.yearly : PLAN_PRICES.basic.monthly).toFixed(2).replace('.',',')}</span>
                </div>
                <div className="mt-4 text-right">
                    <p className="text-[10px] text-slate-400 uppercase">Você paga apenas</p>
                    <p className="text-3xl font-black text-white">R$ {calculateCost('yearly').toFixed(2).replace('.',',')}</p>
                </div>
            </div>

            {/* MONTHLY OPTION */}
            <div 
                onClick={() => !isCurrentYearly && handlePixCycleSelection('monthly')}
                className={`p-5 rounded-2xl border flex flex-col ${isCurrentYearly ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-800 border-white/10 cursor-pointer hover:bg-slate-700 hover:border-white/20'}`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-white text-lg">Advanced Mensal</h4>
                        <p className="text-slate-400 text-xs mt-1">Flexibilidade total. Cancele quando quiser.</p>
                        {isCurrentYearly && <p className="text-red-400 text-[10px] mt-2 font-bold flex items-center gap-1"><AlertCircle size={10}/> Indisponível para plano Anual vigente</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-white">R$ {calculateCost('monthly').toFixed(2).replace('.',',')}</p>
                        <p className="text-[10px] text-slate-500">Diferença do mês</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 p-4">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                
                {/* Background FX */}
                <div className={`absolute top-0 right-0 w-64 h-64 ${mode === 'ai' ? 'bg-cyan-600/10' : 'bg-indigo-600/10'} rounded-full blur-[80px] pointer-events-none`} />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none" />

                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors z-20">
                    <X size={20} />
                </button>

                {/* --- STEP 1: BENEFITS --- */}
                {step === 'benefits' && (mode === 'ai' ? renderAiBenefits() : renderPlanBenefits())}

                {/* --- STEP 2: METHOD SELECTION --- */}
                {step === 'method' && (
                    <div className="p-8 text-center flex flex-col justify-center h-full">
                        <h3 className="text-2xl font-bold text-white mb-6">Como deseja pagar?</h3>
                        
                        <div className="grid grid-cols-1 gap-4 mb-6">
                            <button 
                                onClick={() => { setPaymentMethod('pix'); setStep('pix_cycle'); }}
                                className="group relative p-6 rounded-2xl bg-slate-800 border border-emerald-500/30 hover:bg-emerald-900/10 hover:border-emerald-500 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <QrCode size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">PIX (Instantâneo)</h4>
                                        <p className="text-slate-400 text-xs">Liberação imediata pelo sistema.</p>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                            </button>

                            <button 
                                onClick={() => { setPaymentMethod('card'); setStep('pix_cycle'); }}
                                className="group relative p-6 rounded-2xl bg-slate-800 border border-indigo-500/30 hover:bg-indigo-900/10 hover:border-indigo-500 transition-all text-left flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">Cartão de Crédito</h4>
                                        <p className="text-slate-400 text-xs">Checkout seguro via Kirvano.</p>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                            </button>
                        </div>
                        
                        <button onClick={() => setStep('benefits')} className="text-slate-500 text-sm hover:text-white transition-colors">Voltar</button>
                    </div>
                )}

                {/* --- STEP 3: CYCLE SELECTION --- */}
                {step === 'pix_cycle' && (
                    <div className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-white">Escolha o Plano</h3>
                            <p className="text-slate-400 text-sm">Selecione o período de acesso desejado.</p>
                        </div>

                        {mode === 'ai' ? renderAiCycles() : renderPlanCycles()}
                        
                        <button onClick={() => setStep('method')} className="text-slate-500 text-sm hover:text-white transition-colors text-center">Voltar</button>
                    </div>
                )}

                {/* --- STEP 4 (PIX): QR CODE --- */}
                {step === 'pix_pay' && (
                    <div className="p-8 text-center h-full flex flex-col justify-center">
                        <h3 className="text-2xl font-bold text-white mb-2">Finalizar Compra</h3>
                        <p className="text-slate-400 text-sm mb-6">Escaneie para liberar o acesso imediatamente.</p>

                        <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] mx-auto">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`} className="w-48 h-48 mix-blend-multiply" />
                        </div>

                        <div className="flex gap-2 mb-6">
                            <input readOnly value={pixPayload} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 text-xs text-slate-400 truncate" />
                            <button onClick={() => {navigator.clipboard.writeText(pixPayload); setCopied(true);}} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors">
                                {copied ? <Check size={18} className="text-emerald-400"/> : <Copy size={18}/>}
                            </button>
                        </div>

                        <div className="bg-slate-800 p-4 rounded-xl border border-white/5 mb-6 text-left">
                            <label className="text-[10px] text-slate-400 font-bold uppercase ml-1 flex items-center gap-1"><User size={12}/> Nome do Pagador (Obrigatório)</label>
                            <input 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm mt-1 focus:border-indigo-500 outline-none" 
                                placeholder="Nome completo do titular da conta" 
                                value={payerName}
                                onChange={e => setPayerName(e.target.value)}
                            />
                            <p className="text-[10px] text-yellow-500 mt-2">
                                * Essencial para conferência. Se o nome não bater, a liberação pode falhar.
                            </p>
                        </div>

                        <div className="bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-xl mb-6">
                            <p className="text-emerald-400 font-bold text-lg">Valor Final: R$ {upgradeCost.toFixed(2).replace('.', ',')}</p>
                        </div>

                        <button 
                            onClick={handlePixConfirm} 
                            disabled={loading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? "Processando..." : "Já realizei o pagamento"}
                        </button>
                        <button onClick={() => setStep('pix_cycle')} className="text-slate-500 text-xs mt-4 hover:text-white">Cancelar</button>
                    </div>
                )}

                {/* --- SUCCESS --- */}
                {step === 'success' && (
                    <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <Check size={40} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Solicitação Enviada!</h3>
                        <p className="text-slate-400">Seu acesso será liberado em instantes.</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default UpgradeModal;
