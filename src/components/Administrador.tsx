import React, { useState, useMemo } from 'react';
import { Home, Users, BarChart2, Settings, Edit2, Trash2, Plus, X, AlertTriangle, LogOut, ChevronRight, User, Calendar as CalendarIcon, Filter, Download, Clock, Shield, Activity, Layers, ToggleLeft, ToggleRight } from 'lucide-react';
import LiveDashboard from './admin/LiveDashboard';
import { useSenhas, type Usuario, type Senha } from '../context/SenhasContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Administrador() {
    const { senhas, usuarios, adicionarUsuario, excluirUsuario, resetarFila, login, senhaAtual, servicos, criarServico, excluirServico, toggleServico } = useSenhas();
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'servicos' | 'estatisticas' | 'configuracoes' | 'monitoramento'>('usuarios');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    // Dashboard Filters
    const [dateRange, setDateRange] = useState<'hoje' | 'semana' | 'mes' | 'ano' | 'custom'>('hoje');
    const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senha: '',
        isAdmin: false,
        funcao: 'Atendente' as 'Atendente' | 'Gerador' | 'Administrador',
        guiche: 1,
        tiposAtendimento: [] as string[]
    });

    const [newServiceInput, setNewServiceInput] = useState('');

    // Login Logic
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);

        try {
            const response = await login(emailInput || 'admin', passwordInput);

            if (response.success && (response.user?.isAdmin || response.user?.funcao === 'Administrador')) {
                setIsAuthenticated(true);
                setLoginError('');
            } else {
                setLoginError('Credenciais inválidas ou sem permissão de administrador.');
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPasswordInput('');
        setEmailInput('');
    };

    // User Management Logic
    const handleSubmitUsuario = (e: React.FormEvent) => {
        e.preventDefault();
        adicionarUsuario({
            nome: formData.nome,
            email: formData.email,
            funcao: formData.funcao,
            guiche: formData.funcao === 'Atendente' ? Number(formData.guiche) : undefined,
            tiposAtendimento: formData.tiposAtendimento,
            isAdmin: formData.funcao === 'Administrador',
            senha: formData.senha
        });
        setMostrarFormulario(false);
        setFormData({ nome: '', email: '', senha: '', isAdmin: false, funcao: 'Atendente', guiche: 1, tiposAtendimento: [] });
    };

    const handleExcluirUsuario = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            excluirUsuario(id);
        }
    };

    // Service Management Logic
    const handleCriarServico = (e: React.FormEvent) => {
        e.preventDefault();
        if (newServiceInput.trim()) {
            criarServico(newServiceInput.trim());
            setNewServiceInput('');
        }
    };

    const handleExcluirServico = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este serviço?')) {
            excluirServico(id);
        }
    };

    // --- REPORT LOGIC ---
    const dadosFiltrados = useMemo(() => {
        const agora = new Date();
        let inicio = startOfDay(agora);
        let fim = endOfDay(agora);

        if (dateRange === 'semana') {
            inicio = startOfWeek(agora, { weekStartsOn: 0 });
            fim = endOfWeek(agora, { weekStartsOn: 0 });
        } else if (dateRange === 'mes') {
            inicio = startOfMonth(agora);
            fim = endOfMonth(agora);
        } else if (dateRange === 'ano') {
            inicio = startOfYear(agora);
            fim = endOfYear(agora);
        } else if (dateRange === 'custom') {
            inicio = startOfDay(new Date(customStart));
            fim = endOfDay(new Date(customEnd));
        }

        return senhas.filter(s => {
            if (!s.horaGeracao) return false;
            const dataRef = new Date(s.horaGeracao);
            return isWithinInterval(dataRef, { start: inicio, end: fim });
        });
    }, [senhas, dateRange, customStart, customEnd]);

    // Stats KPIs
    const kpis = useMemo(() => {
        const total = dadosFiltrados.length;
        const concluidas = dadosFiltrados.filter(s => s.status === 'concluida').length;
        const canceladas = dadosFiltrados.filter(s => s.status === 'cancelada').length;

        const temposEspera = dadosFiltrados
            .filter(s => s.horaChamada && s.horaGeracao)
            .map(s => (s.horaChamada!.getTime() - s.horaGeracao.getTime()) / 60000);

        const mediaEspera = temposEspera.length > 0
            ? Math.round(temposEspera.reduce((a, b) => a + b, 0) / temposEspera.length)
            : 0;

        const temposAtendimento = dadosFiltrados
            .filter(s => s.horaFinalizacao && s.horaChamada)
            .map(s => (s.horaFinalizacao!.getTime() - s.horaChamada!.getTime()) / 60000);

        const mediaAtendimento = temposAtendimento.length > 0
            ? Math.round(temposAtendimento.reduce((a, b) => a + b, 0) / temposAtendimento.length)
            : 0;

        return { total, concluidas, canceladas, mediaEspera, mediaAtendimento };
    }, [dadosFiltrados]);

    // Charts Data
    const dadosPorTipo = useMemo(() => {
        const counts: Record<string, number> = {};
        dadosFiltrados.forEach(s => {
            counts[s.tipo] = (counts[s.tipo] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [dadosFiltrados]);

    const dadosPorAtendente = useMemo(() => {
        const counts: Record<string, number> = {};
        dadosFiltrados.forEach(s => {
            if (s.atendente) {
                counts[s.atendente] = (counts[s.atendente] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [dadosFiltrados]);

    const dadosPorDia = useMemo(() => {
        if (dateRange === 'hoje') return [];

        const counts: Record<string, number> = {};
        dadosFiltrados.forEach(s => {
            const dia = format(new Date(s.horaGeracao), 'dd/MM');
            counts[dia] = (counts[dia] || 0) + 1;
        });
        return Object.entries(counts).map(([name, atendimentos]) => ({ name, atendimentos }));
    }, [dadosFiltrados, dateRange]);


    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-secondary-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-glass overflow-hidden w-full max-w-md">
                    <div className="bg-primary-900 p-8 text-center">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Atende<span className="text-primary-400">+</span></h1>
                        <p className="text-primary-200 mt-2 text-sm font-medium uppercase tracking-wide">Área Administrativa</p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-secondary-600 text-sm font-semibold mb-2">Email / Usuário</label>
                                <input
                                    type="text"
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-secondary-900"
                                    placeholder="admin"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-secondary-600 text-sm font-semibold mb-2">Senha</label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-secondary-900"
                                    placeholder="••••••••"
                                />
                            </div>
                            {loginError && <div className="text-danger-500 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {loginError}</div>}

                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => navigate('/')} className="flex-1 py-3 text-secondary-600 hover:text-secondary-900 font-medium transition-colors text-sm">
                                    Voltar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoggingIn}
                                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold shadow-md shadow-primary-200 transition-all transform active:scale-95 disabled:opacity-50"
                                >
                                    {isLoggingIn ? 'Entrando...' : 'Acessar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-secondary-200 hidden lg:flex flex-col shadow-soft z-10">
                <div className="p-6 border-b border-secondary-100">
                    <h1 className="text-2xl font-bold text-primary-900 tracking-tight flex items-center gap-2">
                        Atende<span className="text-primary-600">+</span>
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full uppercase ml-1">Admin</span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setAbaAtiva('usuarios')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${abaAtiva === 'usuarios' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}
                    >
                        <Users className="w-5 h-5" /> Usuários
                    </button>
                    <button
                        onClick={() => setAbaAtiva('servicos')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${abaAtiva === 'servicos' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}
                    >
                        <Layers className="w-5 h-5" /> Serviços
                    </button>
                    <button
                        onClick={() => setAbaAtiva('estatisticas')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${abaAtiva === 'estatisticas' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}
                    >
                        <BarChart2 className="w-5 h-5" /> Relatórios
                    </button>
                    <button
                        onClick={() => setAbaAtiva('configuracoes')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${abaAtiva === 'configuracoes' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}
                    >
                        <Settings className="w-5 h-5" /> Configurações
                    </button>
                    <button
                        onClick={() => setAbaAtiva('monitoramento')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${abaAtiva === 'monitoramento' ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}
                    >
                        <Activity className="w-5 h-5" /> Monitoramento
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 text-danger-600 hover:bg-danger-50 px-4 py-3 rounded-lg transition-colors font-medium">
                        <LogOut className="w-5 h-5" /> Sair
                    </button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 p-8 overflow-y-auto h-screen bg-secondary-50">

                {/* HEADER MOBILE */}
                <div className="lg:hidden mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                    <h1 className="text-xl font-bold text-primary-900">Admin</h1>
                    <button onClick={handleLogout}><LogOut className="w-5 h-5 text-secondary-500" /></button>
                </div>

                {abaAtiva === 'usuarios' && (
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-secondary-900">Gerenciar Usuários</h2>
                                <p className="text-secondary-500">Cadastre e gerencie o acesso da sua equipe.</p>
                            </div>
                            <button
                                onClick={() => setMostrarFormulario(true)}
                                className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-md shadow-primary-200 font-medium"
                            >
                                <Plus className="w-5 h-5" /> Novo Usuário
                            </button>
                        </div>

                        {/* Lista de Usuários */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {usuarios.map(u => (
                                <div key={u.id} className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm hover:shadow-md transition-all group relative">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        {u.email !== 'lucas.andr97@gmail.com' && (
                                            <button
                                                onClick={() => handleExcluirUsuario(u.id)}
                                                className="p-2 text-danger-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${u.isAdmin ? 'bg-primary-600' : 'bg-secondary-400'}`}>
                                            {u.isAdmin ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="font-bold text-lg text-secondary-900 truncate">{u.nome}</h3>
                                            <p className="text-sm text-secondary-500 truncate">{u.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${u.funcao === 'Administrador' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                            u.funcao === 'Atendente' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                'bg-green-50 text-green-700 border-green-100'
                                            }`}>
                                            {u.funcao}
                                        </span>
                                        {u.guiche && (
                                            <span className="bg-secondary-100 text-secondary-600 border border-secondary-200 px-2.5 py-1 rounded-md text-xs font-bold">
                                                Guichê {u.guiche}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Formulario */}
                        {mostrarFormulario && (
                            <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                                    <div className="bg-secondary-50 px-8 py-6 border-b border-secondary-100 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-secondary-900">Novo Usuário</h3>
                                        <button onClick={() => setMostrarFormulario(false)} className="text-secondary-400 hover:text-secondary-600"><X className="w-5 h-5" /></button>
                                    </div>

                                    <form onSubmit={handleSubmitUsuario} className="p-8 space-y-5">
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Nome</label>
                                                <input
                                                    required
                                                    className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                    value={formData.nome}
                                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Email</label>
                                                <input
                                                    required
                                                    className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Senha Inicial</label>
                                            <input
                                                placeholder="••••••••"
                                                required
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                value={formData.senha}
                                                onChange={e => setFormData({ ...formData, senha: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Função</label>
                                                <select
                                                    className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                    value={formData.funcao}
                                                    onChange={e => setFormData({ ...formData, funcao: e.target.value as any })}
                                                >
                                                    <option value="Atendente">Atendente</option>
                                                    <option value="Gerador">Recepção</option>
                                                    <option value="Administrador">Admin</option>
                                                </select>
                                            </div>

                                            {formData.funcao === 'Atendente' && (
                                                <div className="col-span-2 space-y-3 pt-2 border-t border-secondary-100">
                                                    <label className="block text-sm font-semibold text-secondary-700">Serviços Atendidos</label>
                                                    <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                                        {servicos.filter(s => s.ativo).map(s => (
                                                            <div key={s.id} className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`svc-${s.id}`}
                                                                    checked={formData.tiposAtendimento.includes(s.nome)}
                                                                    onChange={e => {
                                                                        const nome = s.nome;
                                                                        if (e.target.checked) {
                                                                            setFormData({ ...formData, tiposAtendimento: [...formData.tiposAtendimento, nome] });
                                                                        } else {
                                                                            setFormData({ ...formData, tiposAtendimento: formData.tiposAtendimento.filter(t => t !== nome) });
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                                                />
                                                                <label htmlFor={`svc-${s.id}`} className="text-sm text-secondary-600 cursor-pointer select-none truncate" title={s.nome}>
                                                                    {s.nome}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {formData.funcao === 'Atendente' && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-secondary-700 mb-1.5">Guichê</label>
                                                    <input
                                                        type="number"
                                                        className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                        value={formData.guiche}
                                                        onChange={e => setFormData({ ...formData, guiche: Number(e.target.value) })}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2">
                                            <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 shadow-md shadow-primary-200 transition-all active:scale-95">
                                                Salvar Usuário
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {abaAtiva === 'servicos' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <h2 className="text-2xl font-bold text-secondary-900">Gerenciar Serviços</h2>
                            <p className="text-secondary-500">Adicione ou remova os tipos de atendimento disponíveis.</p>
                        </div>

                        {/* Add Service Form */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                            <form onSubmit={handleCriarServico} className="flex gap-4">
                                <input
                                    type="text"
                                    value={newServiceInput}
                                    onChange={(e) => setNewServiceInput(e.target.value)}
                                    placeholder="Nome do novo serviço (ex: Retirada de Exames)"
                                    className="flex-1 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!newServiceInput.trim()}
                                    className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold shadow-md shadow-primary-200 transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" /> Adicionar
                                </button>
                            </form>
                        </div>

                        {/* Services List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-secondary-700">Nome do Serviço</th>
                                        <th className="px-6 py-4 font-semibold text-secondary-700 text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold text-secondary-700 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {servicos.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-secondary-500">Nenhum serviço cadastrado.</td>
                                        </tr>
                                    ) : (
                                        servicos.map((servico) => (
                                            <tr key={servico.id} className="hover:bg-secondary-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-secondary-900">{servico.nome}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleServico(servico.id)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${servico.ativo ? 'bg-success-100 text-success-700 hover:bg-success-200' : 'bg-secondary-200 text-secondary-500 hover:bg-secondary-300'}`}
                                                    >
                                                        {servico.ativo ? 'Ativo' : 'Inativo'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleExcluirServico(servico.id)}
                                                        className="p-2 text-danger-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {abaAtiva === 'estatisticas' && (
                    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-secondary-900">Dashboard & Relatórios</h2>
                                <p className="text-secondary-500">Visão geral do desempenho do atendimento.</p>
                            </div>

                            <div className="bg-white p-1.5 rounded-xl border border-secondary-200 shadow-sm flex flex-wrap gap-1">
                                <button onClick={() => setDateRange('hoje')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'hoje' ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}>Hoje</button>
                                <button onClick={() => setDateRange('semana')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'semana' ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}>Semana</button>
                                <button onClick={() => setDateRange('mes')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'mes' ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}>Mês</button>
                                <button onClick={() => setDateRange('ano')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'ano' ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}>Ano</button>
                                <button onClick={() => setDateRange('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'custom' ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-secondary-600 hover:bg-secondary-50'}`}>Personalizado</button>
                            </div>
                        </div>

                        {/* Custom Date Range Inputs */}
                        {dateRange === 'custom' && (
                            <div className="bg-white p-4 rounded-xl shadow-soft border border-secondary-200 flex items-center gap-4 animate-in slide-in-from-top-2">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-secondary-500 uppercase mb-1">Data Início</label>
                                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-secondary-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                                <div className="text-secondary-400"><ChevronRight className="w-5 h-5" /></div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-secondary-500 uppercase mb-1">Data Fim</label>
                                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-secondary-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>
                        )}

                        {/* KPIs Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-soft border border-secondary-100 relative overflow-hidden group hover:shadow-lg transition-all">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-primary-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                                <div className="flex items-center gap-3 mb-3 text-primary-600 relative z-10">
                                    <Users className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase tracking-wide opacity-80">Total</span>
                                </div>
                                <p className="text-4xl font-bold text-secondary-900 mb-1 relative z-10">{kpis.total}</p>
                                <p className="text-xs text-secondary-500 relative z-10">{kpis.concluidas} atendidos • {kpis.canceladas} cancelados</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-soft border border-secondary-100 relative overflow-hidden group hover:shadow-lg transition-all">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-success-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                                <div className="flex items-center gap-3 mb-3 text-success-600 relative z-10">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase tracking-wide opacity-80">Espera Média</span>
                                </div>
                                <p className="text-4xl font-bold text-secondary-900 relative z-10">{kpis.mediaEspera} <span className="text-lg text-secondary-400 font-medium">min</span></p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-soft border border-secondary-100 relative overflow-hidden group hover:shadow-lg transition-all">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-warning-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                                <div className="flex items-center gap-3 mb-3 text-warning-600 relative z-10">
                                    <Edit2 className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase tracking-wide opacity-80">Atendimento Médio</span>
                                </div>
                                <p className="text-4xl font-bold text-secondary-900 relative z-10">{kpis.mediaAtendimento} <span className="text-lg text-secondary-400 font-medium">min</span></p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-soft border border-secondary-100 relative overflow-hidden group hover:shadow-lg transition-all">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                                <div className="flex items-center gap-3 mb-3 text-purple-600 relative z-10">
                                    <BarChart2 className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase tracking-wide opacity-80">Eficiência</span>
                                </div>
                                <p className="text-4xl font-bold text-secondary-900 relative z-10">
                                    {kpis.total > 0 ? Math.round((kpis.concluidas / kpis.total) * 100) : 0}%
                                </p>
                            </div>
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Tipos Chart */}
                            <div className="bg-white p-8 rounded-2xl shadow-soft border border-secondary-100 h-96">
                                <h3 className="font-bold text-secondary-700 mb-6 flex items-center gap-2 text-lg"><Filter className="w-5 h-5 text-primary-500" /> Atendimentos por Tipo</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <BarChart data={dadosPorTipo}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Atendentes Chart */}
                            <div className="bg-white p-8 rounded-2xl shadow-soft border border-secondary-100 h-96">
                                <h3 className="font-bold text-secondary-700 mb-6 flex items-center gap-2 text-lg"><User className="w-5 h-5 text-success-500" /> Performance por Atendente</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <BarChart data={dadosPorAtendente} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                        <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Timeline Chart (Only if not 'hoje') */}
                        {dateRange !== 'hoje' && (
                            <div className="bg-white p-8 rounded-2xl shadow-soft border border-secondary-100 h-96">
                                <h3 className="font-bold text-secondary-700 mb-6 flex items-center gap-2 text-lg"><CalendarIcon className="w-5 h-5 text-purple-500" /> Evolução no Período</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <LineChart data={dadosPorDia}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Line type="monotone" dataKey="atendimentos" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                    </div>
                )}

                {abaAtiva === 'configuracoes' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-secondary-900">Configurações do Sistema</h2>
                            <p className="text-secondary-500">Opções avançadas de gerenciamento.</p>
                        </div>

                        <div className="p-8 bg-danger-50 rounded-2xl border border-danger-100">
                            <h3 className="text-danger-800 font-bold mb-2 flex items-center gap-2 text-lg">
                                <AlertTriangle className="w-5 h-5" /> Zona de Perigo
                            </h3>
                            <p className="text-danger-700 text-sm mb-6 max-w-xl">Estas ações são irreversíveis e podem causar perda de dados. Tenha certeza absoluta antes de prosseguir.</p>
                            <button
                                onClick={() => {
                                    if (confirm("ATENÇÃO: ISSO APAGARÁ TODAS AS SENHAS E REINICIARÁ OS CONTADORES. TEM CERTEZA?")) {
                                        resetarFila();
                                    }
                                }}
                                className="bg-danger-600 hover:bg-danger-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-danger-200 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Zerar Fila e Contadores
                            </button>
                        </div>
                    </div>
                )}

                {abaAtiva === 'monitoramento' && (
                    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <h2 className="text-2xl font-bold text-secondary-900">Monitoramento em Tempo Real</h2>
                            <p className="text-secondary-500">Acompanhe o status de cada guichê e atendente.</p>
                        </div>

                        {/* Live Dashboard Component (Charts) */}
                        <LiveDashboard />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {usuarios.filter(u => u.funcao === 'Atendente').map(u => {
                                const isOnline = u.online;
                                const atendendoAgora = senhas.find(s => s.atendente === u.nome && s.status === 'atendendo');
                                const status = !isOnline ? 'offline' : atendendoAgora ? 'busy' : 'available';

                                return (
                                    <div key={u.id} className={`bg-white rounded-2xl shadow-soft border-l-4 p-6 relative overflow-hidden transition-all ${status === 'offline' ? 'border-secondary-300 opacity-70' :
                                        status === 'busy' ? 'border-warning-500 shadow-md' :
                                            'border-success-500 shadow-md'
                                        }`}>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold uppercase tracking-wide text-secondary-500 mb-1">Guichê</span>
                                                <span className="text-3xl font-bold text-secondary-900">{u.guiche || '-'}</span>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${status === 'offline' ? 'bg-secondary-100 text-secondary-600' :
                                                status === 'busy' ? 'bg-warning-100 text-warning-700' :
                                                    'bg-success-100 text-success-700'
                                                }`}>
                                                <span className={`w-2 h-2 rounded-full ${status === 'offline' ? 'bg-secondary-400' : status === 'busy' ? 'bg-warning-500' : 'bg-success-500'}`}></span>
                                                {status === 'offline' ? 'Offline' : status === 'busy' ? 'Ocupado' : 'Disponível'}
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-4 h-4 text-secondary-400" />
                                                <span className="font-medium text-secondary-900">{u.nome}</span>
                                            </div>
                                            <div className="text-xs text-secondary-500 truncate" title={u.tiposAtendimento?.join(', ')}>
                                                {u.tiposAtendimento?.length ? u.tiposAtendimento.join(', ') : 'Sem serviços'}
                                            </div>
                                        </div>

                                        {atendendoAgora ? (
                                            <div className="bg-warning-50 border border-warning-100 rounded-xl p-3 animate-pulse">
                                                <p className="text-xs font-bold text-warning-700 uppercase mb-1">Em Atendimento</p>
                                                <p className="text-lg font-bold text-warning-900">{atendendoAgora.numero}</p>
                                                <p className="text-xs text-warning-600 truncate">{atendendoAgora.tipo}</p>
                                                <p className="text-xs text-warning-600 mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {atendendoAgora.horaInicio ?
                                                        Math.floor((new Date().getTime() - new Date(atendendoAgora.horaInicio).getTime()) / 60000) + ' min'
                                                        : '0 min'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-secondary-50 border border-secondary-100 rounded-xl p-3 flex items-center justify-center h-24">
                                                <p className="text-sm font-medium text-secondary-400">Aguardando atendimento...</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
