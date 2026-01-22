import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, User, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSenhas, type Senha } from '../../context/SenhasContext';
import { format } from 'date-fns';

export default function HistoryView() {
    const { senhas } = useSenhas();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter logic
    const filteredData = useMemo(() => {
        return senhas.filter(senha => {
            const searchLower = searchTerm.toLowerCase();
            return (
                senha.nome.toLowerCase().includes(searchLower) ||
                (senha.cpf && senha.cpf.includes(searchLower)) ||
                senha.numero.toLowerCase().includes(searchLower)
            );
        }).sort((a, b) => new Date(b.horaGeracao).getTime() - new Date(a.horaGeracao).getTime());
    }, [senhas, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-secondary-900">Histórico Completo</h2>
                <p className="text-secondary-500">Pesquise e visualize o histórico de todos os atendimentos.</p>
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
                    {filteredData.length} registros encontrados
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
                                paginatedData.map((senha) => (
                                    <tr key={senha.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            <div className="font-bold">{new Date(senha.horaGeracao).toLocaleDateString()}</div>
                                            <div className="text-xs">{new Date(senha.horaGeracao).toLocaleTimeString().slice(0, 5)}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-secondary-900">{senha.numero}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-secondary-900">{senha.nome}</div>
                                            {senha.cpf && <div className="text-xs text-secondary-500 flex items-center gap-1"><User className="w-3 h-3" /> {senha.cpf}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">{senha.tipo}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${senha.status === 'concluida' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    senha.status === 'cancelada' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {senha.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {senha.guiche ? `Guichê ${senha.guiche}` : '-'}
                                            {senha.atendente && <div className="text-xs text-secondary-400">{senha.atendente}</div>}
                                        </td>
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
        </div>
    );
}
