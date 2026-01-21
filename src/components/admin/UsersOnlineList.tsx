import React from 'react';
import { Users, Volume2 } from 'lucide-react';
import { useSenhas } from '../../context/SenhasContext';

export default function UsersOnlineList() {
    const { usuarios, senhas } = useSenhas();

    return (
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-200 flex flex-col h-96 lg:h-auto">
            <div className="p-4 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center">
                <h3 className="font-bold text-secondary-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-500" />
                    Online Agora
                </h3>
                <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {usuarios.filter(u => u.online).length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {usuarios.filter(u => u.online).length === 0 ? (
                    <div className="text-center py-12 text-secondary-400">
                        <div className="bg-secondary-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users className="w-6 h-6 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Ninguém online</p>
                    </div>
                ) : (
                    usuarios.filter(u => u.online).map(u => {
                        const atendendoAgora = senhas.find(s => s.atendente === u.nome && s.status === 'atendendo');

                        // Status Determination
                        let statusColor = 'bg-gray-50 border-gray-100';
                        let statusIndicator = 'bg-gray-400';

                        if (u.funcao === 'Atendente') {
                            if (atendendoAgora) {
                                statusColor = 'bg-white border-orange-200 shadow-sm';
                                statusIndicator = 'bg-orange-500';
                            } else {
                                statusColor = 'bg-white border-green-200 shadow-sm';
                                statusIndicator = 'bg-green-500';
                            }
                        } else {
                            statusColor = 'bg-white border-blue-200 shadow-sm';
                            statusIndicator = 'bg-blue-500';
                        }

                        return (
                            <div key={u.id} className={`p-3 rounded-xl border ${statusColor} transition-all`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${statusIndicator} ${atendendoAgora ? 'animate-pulse' : ''}`}></div>
                                        <span className="font-bold text-secondary-900 text-sm truncate max-w-[120px]" title={u.nome}>{u.nome}</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-400 bg-secondary-50 px-1.5 py-0.5 rounded border border-secondary-100">
                                        {u.funcao === 'Administrador' ? 'Admin' : 'Atend'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <div className="text-secondary-500 font-medium">
                                        {u.tipoGuiche || 'Local'} {u.guiche || '-'}
                                    </div>
                                    {atendendoAgora && (
                                        <div className="flex items-center gap-1 text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md">
                                            <Volume2 className="w-3 h-3" />
                                            {atendendoAgora.numero}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
