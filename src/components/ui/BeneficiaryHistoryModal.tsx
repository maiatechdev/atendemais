import React, { useEffect, useState, useMemo } from 'react';
import { X, Calendar, User, Clock, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { useSenhas, type Senha, type Agendamento } from '../../context/SenhasContext';

interface BeneficiaryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    cpf: string;
    nome?: string;
}

export default function BeneficiaryHistoryModal({ isOpen, onClose, cpf, nome }: BeneficiaryHistoryModalProps) {
    const { buscarHistoricoBeneficiario } = useSenhas();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState<{ senhas: Senha[], agendamentos: Agendamento[] } | null>(null);

    useEffect(() => {
        if (isOpen && cpf) {
            setLoading(true);
            setError('');
            buscarHistoricoBeneficiario(cpf)
                .then(data => setData(data))
                .catch(err => setError('Erro ao buscar histórico: ' + err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, cpf]);

    // Combined Stats Logic
    const stats = useMemo(() => {
        if (!data) return null;
        const all = [...data.senhas, ...data.agendamentos];
        const total = all.length;

        // Services Count
        const serviceCounts: Record<string, number> = {};
        all.forEach(item => {
            serviceCounts[item.tipo] = (serviceCounts[item.tipo] || 0) + 1;
        });

        const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

        // Status
        const completed = data.senhas.filter(s => s.status === 'concluida').length + data.agendamentos.filter(a => a.status === 'confirmado').length;
        const missed = data.senhas.filter(s => s.status === 'cancelada').length + data.agendamentos.filter(a => a.status === 'cancelado').length;
        // Assuming 'cancelada' for tickets implies missed/cancel, we might need a distinct "no-show" status if defined, but generic cancel works for prototype.

        return { total, topService, completed, missed };
    }, [data]);

    // Combined Timeline
    const timeline = useMemo(() => {
        if (!data) return [];

        const sItems = data.senhas.map(s => ({
            id: s.id,
            date: new Date(s.horaGeracao),
            type: 'Senha',
            service: s.tipo,
            status: s.status,
            detail: `Senha: ${s.numero}`
        }));

        const aItems = data.agendamentos.map(a => ({
            id: a.id,
            date: new Date(a.dataAgendada + (a.horaAgendada ? 'T' + a.horaAgendada : '')),
            type: 'Agendamento',
            service: a.tipo,
            status: a.status,
            detail: a.horaAgendada ? `Horário: ${a.horaAgendada}` : 'Data reservada'
        }));

        return [...sItems, ...aItems].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Histórico do Beneficiário
                        </h2>
                        <div className="mt-1 space-y-0.5">
                            <p className="text-sm font-medium text-gray-700">{nome || 'Nome não informado'}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> CPF: {cpf}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm font-medium">
                            {error}
                        </div>
                    ) : data && stats ? (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                                    <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wide">Visitas</div>
                                </div>
                                <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center">
                                    <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
                                    <div className="text-xs font-bold text-green-400 uppercase tracking-wide">Concluídos</div>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-center col-span-1">
                                    {/* Top Service */}
                                    <div className="text-sm font-bold text-purple-700 truncate px-1" title={stats.topService?.[0] || '-'}>
                                        {stats.topService?.[0] || '-'}
                                    </div>
                                    <div className="text-xs font-bold text-purple-400 uppercase tracking-wide">Mais Solicitado</div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Linha do Tempo
                                </h3>

                                <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                                    {timeline.length === 0 && (
                                        <p className="text-center text-gray-400 text-sm py-8">Nenhum histórico encontrado.</p>
                                    )}
                                    {timeline.map((item) => (
                                        <div key={item.id} className="relative pl-10">
                                            {/* Dot */}
                                            <div className={`absolute left-0 top-1.5 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center z-10 ${item.type === 'Senha' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                                }`}>
                                                {item.type === 'Senha' ? <FileText className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                                            </div>

                                            {/* Card */}
                                            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-gray-300 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mr-2 ${item.type === 'Senha' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                                            }`}>
                                                            {item.type}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-medium">
                                                            {item.date.toLocaleDateString()} • {item.date.toLocaleTimeString().slice(0, 5)}
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${['concluida', 'confirmado'].includes(item.status) ? 'text-green-600 bg-green-50' :
                                                        ['cancelada', 'cancelado'].includes(item.status) ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-gray-800">{item.service}</div>
                                                <div className="text-xs text-gray-500 mt-1">{item.detail}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
