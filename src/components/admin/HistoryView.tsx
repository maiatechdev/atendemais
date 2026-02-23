import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, User, Download, FileText, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { useSenhas, type Senha } from '../../context/SenhasContext';
import BeneficiaryHistoryModal from '../ui/BeneficiaryHistoryModal';
import { format } from 'date-fns';

export default function HistoryView() {
    const { senhas, agendamentos } = useSenhas();
    const [viewMode, setViewMode] = useState<'senhas' | 'agendamentos'>('agendamentos'); // Default to appointments as per request? Or keep 'senhas'? User asked for appointment history.
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [selectedCpf, setSelectedCpf] = useState<string>('');
    const [selectedName, setSelectedName] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openHistory = (cpf: string, nome: string) => {
        setSelectedCpf(cpf);
        setSelectedName(nome);
        setIsModalOpen(true);
    };

    // Ticket Filter Logic
    const filteredSenhas = useMemo(() => {
        return senhas.filter(senha => {
            const searchLower = searchTerm.toLowerCase();
            return (
                senha.nome.toLowerCase().includes(searchLower) ||
                (senha.cpf && senha.cpf.includes(searchLower)) ||
                senha.numero.toLowerCase().includes(searchLower)
            );
        }).sort((a, b) => new Date(b.horaGeracao).getTime() - new Date(a.horaGeracao).getTime());
    }, [senhas, searchTerm]);

    // Appointment Filter Logic
    const filteredAppointments = useMemo(() => {
        return agendamentos.filter(ag => {
            const searchLower = searchTerm.toLowerCase();
            return (
                ag.nome.toLowerCase().includes(searchLower) ||
                (ag.cpf && ag.cpf.includes(searchLower)) ||
                ag.dataAgendada.includes(searchLower)
            );
            // Sort by date descending
        }).sort((a, b) => new Date(b.dataAgendada).getTime() - new Date(a.dataAgendada).getTime());
    }, [agendamentos, searchTerm]);

    const displayData = viewMode === 'senhas' ? filteredSenhas : filteredAppointments;

    // Pagination
    const totalPages = Math.ceil(displayData.length / itemsPerPage);
    const paginatedData = displayData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-secondary-900">Histórico</h2>
                <p className="text-secondary-500">Visualize históricos de senhas e agendamentos.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-secondary-200">
                <button
                    onClick={() => { setViewMode('agendamentos'); setCurrentPage(1); }}
                    className={`pb-3 px-1 font-bold text-sm transition-colors relative ${viewMode === 'agendamentos' ? 'text-primary-600' : 'text-secondary-500 hover:text-secondary-700'}`}
                >
                    Agendamentos
                    {viewMode === 'agendamentos' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => { setViewMode('senhas'); setCurrentPage(1); }}
                    className={`pb-3 px-1 font-bold text-sm transition-colors relative ${viewMode === 'senhas' ? 'text-primary-600' : 'text-secondary-500 hover:text-secondary-700'}`}
                >
                    Senhas Emitidas
                    {viewMode === 'senhas' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-secondary-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por Nome, CPF ou Senha..."
                        className="w-full pl-12 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary-500 font-medium bg-secondary-50 px-4 py-2 rounded-lg border border-secondary-100">
                    <FileText className="w-4 h-4" />
                    <FileText className="w-4 h-4" />
                    {displayData.length} registros encontrados
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Data/Hora</th>
                                <th className="px-6 py-4 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Senha</th>
                                <th className="px-6 py-4 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Cidadão</th>
                                <th className="px-6 py-4 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Serviço</th>
                                <th className="px-6 py-4 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Guichê</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-secondary-500">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors">
                                        {viewMode === 'senhas' ? (
                                            // --- SENHAS COLUMNS ---
                                            <>
                                                <td className="px-6 py-4 text-sm text-secondary-600">
                                                    <div className="font-bold">{new Date(item.horaGeracao).toLocaleDateString()}</div>
                                                    <div className="text-xs">{new Date(item.horaGeracao).toLocaleTimeString().slice(0, 5)}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-secondary-900">{item.numero}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-secondary-900">{item.nome}</div>
                                                    <div className="font-bold text-secondary-900">{item.nome}</div>
                                                    {item.cpf && (
                                                        <button
                                                            onClick={() => openHistory(item.cpf, item.nome)}
                                                            className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline decoration-blue-300 underline-offset-2 transition-all"
                                                        >
                                                            <User className="w-3 h-3" /> {item.cpf}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary-600">{item.tipo}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${item.status === 'concluida' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        item.status === 'cancelada' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            'bg-blue-50 text-blue-700 border-blue-100'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary-600">
                                                    {item.guiche ? `Guichê ${item.guiche}` : '-'}
                                                    {item.atendente && <div className="text-xs text-secondary-400">{item.atendente}</div>}
                                                </td>
                                            </>
                                        ) : (
                                            // --- APPOINTMENTS COLUMNS ---
                                            <>
                                                <td className="px-6 py-4 text-sm text-secondary-600">
                                                    <div className="font-bold">{item.dataAgendada.split('-').reverse().join('/')}</div>
                                                    {item.horaAgendada ? (
                                                        <div className="text-xs font-bold text-primary-600">{item.horaAgendada}</div>
                                                    ) : (
                                                        <div className="text-xs text-secondary-400">-</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-secondary-400">-</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-secondary-900">{item.nome}</div>
                                                    {item.cpf && (
                                                        <button
                                                            onClick={() => openHistory(item.cpf, item.nome)}
                                                            className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline decoration-blue-300 underline-offset-2 transition-all"
                                                        >
                                                            <User className="w-3 h-3" /> {item.cpf}
                                                        </button>
                                                    )}
                                                    {item.bairro && <div className="text-xs text-secondary-400 mt-1">{item.bairro}</div>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary-600">
                                                    {item.tipo}
                                                    <div className="text-xs text-secondary-400">{item.prioridade}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${item.status === 'confirmado' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        item.status === 'cancelada' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary-600">
                                                    {item.observacoes || '-'}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-secondary-200 flex items-center justify-between">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="p-2 rounded-lg hover:bg-secondary-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="w-5 h-5 text-secondary-600" />
                        </button>
                        <span className="text-sm font-medium text-secondary-600">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="p-2 rounded-lg hover:bg-secondary-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="w-5 h-5 text-secondary-600" />
                        </button>
                    </div>
                )}

            </div>

            <BeneficiaryHistoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                cpf={selectedCpf}
                nome={selectedName}
            />
        </div>
    );
}
