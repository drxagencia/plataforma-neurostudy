
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { PixService } from '../services/pixService';
import { DatabaseService } from '../services/databaseService';
import { X, Check, Copy, QrCode, ArrowUpCircle, Shield, Crown, Zap } from 'lucide-react';

interface UpgradeModalProps {
    user: UserProfile;
    onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ user, onClose }) => {
    const [step, setStep] = useState<'offer' | 'pix' | 'success'>('offer');
    const [pixPayload, setPixPayload] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    // Lógica de Preço baseada no Ciclo Atual
    const isYearly = user.billingCycle === 'yearly';
    const upgradeCost = isYearly ? 99.00 : 10.00;
    const planName = isYearly ? 'Anual' : 'Mensal';

    const handleGeneratePix = () => {
        try {
            const payload = PixService.generatePayload(upgradeCost);
            setPixPayload(payload);
            setStep('pix');
        } catch (e) {
            alert("Erro ao gerar PIX.");
        }
    };

    const handleConfirmPayment = async () => {
        setLoading(true);
        try {
            await DatabaseService.createRechargeRequest(
                user.uid,
                user.displayName,
                upgradeCost,
                'BRL',
                undefined,
                `UPGRADE: Basic -> Advanced (${planName})`
            );
            setStep('success');
            setTimeout(() => {
                onClose();
                window.location.reload(); // Recarrega para tentar atualizar status se aprovado rápido ou limpar cache
            }, 3000);
        } catch (e) {
            alert("Erro ao confirmar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                
                {/* Background FX */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none" />

                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors z-10">
                    <X size={20} />
                </button>

                {step === 'offer' && (
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-3">
                            <Crown size={40} className="text-white" />
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-wider">
                            Upgrade <span className="text-indigo-400">Pro</span>
                        </h2>
                        <p className="text-slate-400 mb-8">
                            Você já possui o plano Básico {planName}.<br/>
                            <span className="text-white font-bold">Pague apenas a diferença</span> para evoluir.
                        </p>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase">Valor do Upgrade</span>
                                <span className="text-xs font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-1 rounded">Desconto Aplicado</span>
                            </div>
                            <div className="flex items-end justify-center gap-1">
                                <span className="text-sm text-slate-500 mb-2 font-bold">R$</span>
                                <span className="text-5xl font-black text-white tracking-tighter">{upgradeCost.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Pagamento único referente à diferença do ciclo.</p>
                        </div>

                        <div className="space-y-3 mb-8 text-left max-w-xs mx-auto">
                            <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={16} className="text-emerald-500"/> <span>Acesso ao <strong>NeuroTutor IA</strong></span></li>
                            <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={16} className="text-emerald-500"/> <span>Correção de <strong>Redação</strong></span></li>
                            <li className="flex items-center gap-3 text-slate-300 text-sm"><Check size={16} className="text-emerald-500"/> <span>Ranking <strong>Competitivo</strong></span></li>
                        </div>

                        <button 
                            onClick={handleGeneratePix}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-transform hover:scale-105"
                        >
                            <Zap size={20} className="fill-white" /> LIBERAR AGORA
                        </button>
                    </div>
                )}

                {step === 'pix' && (
                    <div className="p-8 text-center">
                        <h3 className="text-2xl font-bold text-white mb-2">Pagamento Seguro</h3>
                        <p className="text-slate-400 text-sm mb-6">Escaneie o QR Code para liberar seu acesso instantaneamente.</p>

                        <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`} className="w-48 h-48 mix-blend-multiply" />
                        </div>

                        <div className="flex gap-2 mb-6">
                            <input readOnly value={pixPayload} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 text-xs text-slate-400 truncate" />
                            <button onClick={() => {navigator.clipboard.writeText(pixPayload); setCopied(true);}} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors">
                                {copied ? <Check size={18} className="text-emerald-400"/> : <Copy size={18}/>}
                            </button>
                        </div>

                        <div className="bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-xl mb-6">
                            <p className="text-emerald-400 font-bold text-lg">R$ {upgradeCost.toFixed(2).replace('.', ',')}</p>
                        </div>

                        <button 
                            onClick={handleConfirmPayment} 
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? "Verificando..." : "Já realizei o pagamento"}
                        </button>
                    </div>
                )}

                {step === 'success' && (
                    <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <Check size={40} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Solicitação Enviada!</h3>
                        <p className="text-slate-400">Seu upgrade será processado em instantes.</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default UpgradeModal;
