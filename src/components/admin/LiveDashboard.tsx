import React from 'react';
import { Clock, Users, TrendingUp, Activity, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSenhas } from '../../context/SenhasContext';

// Helper Component for Dynamic Wait Time
const TempoEspera = ({ inicio }: { inicio: Date }) => {
  const [espera, setEspera] = React.useState('');
  const [isLate, setIsLate] = React.useState(false);

  React.useEffect(() => {
    const update = () => {
      const diff = Math.floor((new Date().getTime() - new Date(inicio).getTime()) / 60000);
      setEspera(diff + ' min');
      setIsLate(diff >= 15);
    };
    update();
    const interval = setInterval(update, 60000); // UI update every minute
    return () => clearInterval(interval);
  }, [inicio]);

  return (
    <div className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${isLate ? 'bg-red-100 text-red-700' : 'bg-secondary-100 text-secondary-600'}`}>
      <Clock className="w-3 h-3" />
      {espera}
    </div>
  );
};

export default function LiveDashboard() {
  const { senhas, usuarios } = useSenhas();

  const senhasAguardando = senhas.filter(s => s.status === 'aguardando');
  const senhasConcluidas = senhas.filter(s => s.status === 'concluida');
  const guichesAtivos = new Set(senhas.filter(s => s.status === 'atendendo').map(s => s.guiche)).size;

  const calcularTempoMedio = () => {
    const senhasComTempo = senhas.filter(s => s.status === 'concluida' && s.horaChamada && s.horaFinalizacao);
    if (senhasComTempo.length === 0) return 0;

    const total = senhasComTempo.reduce((acc, s) => {
      if (s.horaChamada && s.horaFinalizacao) {
        return acc + (s.horaFinalizacao.getTime() - s.horaChamada.getTime());
      }
      return acc;
    }, 0);

    return Math.round(total / senhasComTempo.length / 60000);
  };

  // Dados para gráfico de senhas por tipo
  const senhasPorTipo = senhas.reduce((acc, senha) => {
    const item = acc.find(i => i.name === senha.tipo);
    if (item) {
      item.value++;
    } else {
      acc.push({ name: senha.tipo, value: 1 });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  // Dados para gráfico de status
  const senhasPorStatus = [
    { name: 'Aguardando', value: senhas.filter(s => s.status === 'aguardando').length, color: '#f59e0b' },
    { name: 'Chamada', value: senhas.filter(s => s.status === 'chamada').length, color: '#3b82f6' },
    { name: 'Atendendo', value: senhas.filter(s => s.status === 'atendendo').length, color: '#06b6d4' },
    { name: 'Concluída', value: senhas.filter(s => s.status === 'concluida').length, color: '#10b981' },
    { name: 'Cancelada', value: senhas.filter(s => s.status === 'cancelada').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <div className="flex items-center gap-2 text-primary-600 bg-primary-50 px-4 py-2 rounded-full animate-pulse">
          <Activity className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Ao Vivo</span>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 flex flex-col justify-between hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-orange-500 text-sm font-bold uppercase tracking-wide">Em Espera</div>
          </div>
          <div>
            <div className="text-4xl text-secondary-900 font-bold mb-1">{senhasAguardando.length}</div>
            <div className="text-secondary-500 text-sm font-medium">Senhas aguardando</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 flex flex-col justify-between hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-green-500 text-sm font-bold uppercase tracking-wide">Hoje</div>
          </div>
          <div>
            <div className="text-4xl text-secondary-900 font-bold mb-1">{senhasConcluidas.length}</div>
            <div className="text-secondary-500 text-sm font-medium">Atendimentos concluídos</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 flex flex-col justify-between hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-blue-500 text-sm font-bold uppercase tracking-wide">Média</div>
          </div>
          <div>
            <div className="text-4xl text-secondary-900 font-bold mb-1">{calcularTempoMedio()}</div>
            <div className="text-secondary-500 text-sm font-medium">Minutos por atendimento</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 flex flex-col justify-between hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-purple-500 text-sm font-bold uppercase tracking-wide">Ativos</div>
          </div>
          <div>
            <div className="text-4xl text-secondary-900 font-bold mb-1">{guichesAtivos}</div>
            <div className="text-secondary-500 text-sm font-medium">Guichês atendendo</div>
          </div>
        </div>
      </div>

      {/* Row 2: Charts (Side by Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Demanda */}
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 h-96">
          <h2 className="text-secondary-800 text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" /> Demanda por Serviço
          </h2>
          <div className="h-full pb-8 w-full flex items-center justify-center">
            {senhasPorTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={senhasPorTipo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-secondary-400 text-center">
                <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Sem dados disponíveis</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Status */}
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 h-96">
          <h2 className="text-secondary-800 text-lg font-bold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-blue-500" /> Status Geral
          </h2>
          <div className="h-full pb-8 w-full flex items-center justify-center relative">
            {senhas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={senhasPorStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {senhasPorStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-secondary-400 text-center">
                <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma senha gerada</p>
              </div>
            )}

            {/* Absolute Legend for Pie Chart */}
            {senhas.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-3 text-[10px] text-secondary-500 font-medium">
                {senhasPorStatus.filter(s => s.value > 0).map(s => (
                  <div key={s.name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Lists (Side by Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* List 1: Fila de Espera */}
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 h-96 flex flex-col">
          <h2 className="text-secondary-800 text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" /> Fila de Espera
            <span className="bg-secondary-100 text-secondary-600 text-xs px-2 py-0.5 rounded-full ml-auto">{senhasAguardando.length}</span>
          </h2>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {senhasAguardando.length > 0 ? (
              senhasAguardando.map(senha => (
                <div
                  key={senha.id}
                  className={`p-4 rounded-xl border-l-[6px] shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${senha.prioridade === 'prioritaria'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-secondary-50 border-secondary-300'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg font-bold text-secondary-900">{senha.numero}</span>
                    <TempoEspera inicio={senha.horaGeracao} />
                  </div>
                  <div className="text-sm font-medium text-secondary-700 truncate">{senha.nome}</div>
                  <div className="text-xs text-secondary-500 mt-1 flex justify-between items-center">
                    <span>{senha.tipo}</span>
                    {senha.prioridade === 'prioritaria' && <span className="text-red-600 font-bold uppercase text-[10px]">Prioridade</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-secondary-400">
                <div className="bg-secondary-50 p-4 rounded-full mb-3">
                  <Clock className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-sm font-medium">Fila vazia</p>
              </div>
            )}
          </div>
        </div>

        {/* List 2: Últimos Atendimentos */}
        <div className="bg-white rounded-2xl shadow-soft border border-secondary-100 p-6 h-96 flex flex-col">
          <h2 className="text-secondary-800 text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" /> Últimos Atendimentos
          </h2>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {senhasConcluidas.length > 0 ? (
              <div className="divide-y divide-secondary-100">
                {senhasConcluidas.slice(-10).reverse().map(senha => (
                  <div key={senha.id} className="py-3 flex justify-between items-center hover:bg-secondary-50/50 px-2 rounded-lg transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-secondary-800 text-sm">{senha.numero}</span>
                        {senha.prioridade === 'prioritaria' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" title="Prioritária"></span>}
                      </div>
                      <div className="text-xs text-secondary-500 max-w-[150px] truncate">{senha.nome}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-secondary-700 bg-secondary-100 px-2 py-0.5 rounded">Guichê {senha.guiche}</div>
                      <div className="text-[10px] text-secondary-400 mt-0.5">{senha.atendente}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-secondary-400">
                <div className="bg-secondary-50 p-4 rounded-full mb-3">
                  <TrendingUp className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-sm font-medium">Nenhum atendimento hoje</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
