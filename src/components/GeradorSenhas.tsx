import React, { useState, useEffect } from 'react';
import { Home, Ticket, CheckCircle, Printer, ArrowLeft, User, Phone, MapPin, AlertTriangle, Layers, CreditCard, Calendar, Lock, Clock, XCircle, Search, CheckSquare, History } from 'lucide-react';
import { useSenhas, type TipoAtendimento, type Prioridade } from '../context/SenhasContext';
import { useNavigate } from 'react-router-dom';
import LoginLayout from './auth/LoginLayout';
import LoginForm from './auth/LoginForm';
import ChangePasswordModal from './auth/ChangePasswordModal';
// import BeneficiaryHistoryModal from './ui/BeneficiaryHistoryModal';
import logo from '../assets/logo.svg';

// Helper for wait time
const calcularTempoEspera = (horaGeracao: Date) => {
  const diff = new Date().getTime() - new Date(horaGeracao).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const LISTA_BAIRROS = [
  "Areia Branca", "Aracuí", "Barro Duro", "Buraquinho", "Caixa d'Água",
  "Caji", "Capelão", "Centro", "Ipitanga", "Itinga", "Jambeiro",
  "Parque São Paulo", "Pitangueiras", "Portão", "Quingoma",
  "Recreio Ipitanga", "Vida Nova", "Vila Praiana", "Vilas do Atlântico",
  "Outros"
];

export default function GeradorSenhas() {
  const { gerarSenha, senhas, login, usuarios, servicos, agendar, listarAgendamentos, agendamentos, confirmarAgendamento, cancelarAgendamento } = useSenhas();
  const navigate = useNavigate();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bairro, setBairro] = useState('');
  const [selectedBairro, setSelectedBairro] = useState('');
  const [tipo, setTipo] = useState<string>('');
  const [prioridade, setPrioridade] = useState<Prioridade>('normal');
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState<any>(null);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [changePassOpen, setChangePassOpen] = useState(false);

  // Scheduling State
  const [modo, setModo] = useState<'imediato' | 'agendamento'>('imediato');
  const [dataAgendada, setDataAgendada] = useState(new Date().toISOString().split('T')[0]);
  const [horaAgendada, setHoraAgendada] = useState('');
  const [viewTab, setViewTab] = useState<'fila' | 'agenda'>('fila');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Inicializa o tipo com o primeiro serviço ativo se disponível

  useEffect(() => {
    const ativos = (servicos || []).filter(s => s.ativo);
    if (!tipo && ativos.length > 0) {
      setTipo(ativos[0].nome);
    }
  }, [servicos, tipo]);

  // Fetch appointments for "today" initially and when date changes (if we had a date picker for the list, but list is usually today)
  useEffect(() => {
    if (showAllHistory) {
      listarAgendamentos('todos');
    } else {
      listarAgendamentos(filterDate);
    }
  }, [filterDate, showAllHistory]);

  const tiposAtivos = (servicos || []).filter(s => s.ativo);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmailInput('');
    setPasswordInput('');
  };

  const validarCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf === '') return true;
    if (cpf.length !== 11 ||
      cpf === "00000000000" ||
      cpf === "11111111111" ||
      cpf === "22222222222" ||
      cpf === "33333333333" ||
      cpf === "44444444444" ||
      cpf === "55555555555" ||
      cpf === "66666666666" ||
      cpf === "77777777777" ||
      cpf === "88888888888" ||
      cpf === "99999999999")
      return false;
    let add = 0;
    for (let i = 0; i < 9; i++)
      add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11)
      rev = 0;
    if (rev !== parseInt(cpf.charAt(9)))
      return false;
    add = 0;
    for (let i = 0; i < 10; i++)
      add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11)
      rev = 0;
    if (rev !== parseInt(cpf.charAt(10)))
      return false;
    return true;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);

    // Limpa erro enquanto digita
    if (cpfError) {
      setCpfError('');
    }
  };

  const handleCpfBlur = () => {
    // Valida apenas quando o usuário sai do campo ou termina
    if (cpf.length > 0 && !validarCPF(cpf)) {
      setCpfError('CPF inválido');
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cpf && !validarCPF(cpf)) {
      setCpfError('Corrija o CPF antes de continuar');
      return;
    }

    if (nome.trim()) {
      setIsSubmitting(true);
      try {
        if (modo === 'imediato') {
          // --- IMMEDIATE TICKET ---
          const senha = await gerarSenha(nome, tipo as any, prioridade, cpf, telefone, bairro);
          setSenhaGerada(senha.numero);
          setMostrarSucesso(true);
        } else {
          // --- SCHEDULE APPOINTMENT ---
          const novoAgendamento = await agendar({
            nome,
            tipo: tipo as any,
            prioridade,
            cpf,
            telefone,
            bairro,
            dataAgendada,
            horaAgendada, // Send time
            observacoes: ''
          });
          setAgendamentoConfirmado(novoAgendamento || { nome, tipo, dataAgendada, horaAgendada });
          setMostrarSucesso(true);
          // Refresh list if scheduled for today
          const today = new Date().toISOString().split('T')[0];
          if (dataAgendada === today) listarAgendamentos(today);
        }

        // Reset inputs
        setTimeout(() => {
          setNome('');
          setCpf('');
          setCpfError('');
          setTelefone('');
          setBairro(LISTA_BAIRROS[0]); // Reset to first or keep empty? Better empty/default.
          setTelefone('');
          setBairro(''); // Reset to default "Select" state
          setSelectedBairro('');
          setPrioridade('normal');
          setHoraAgendada('');
          // Don't reset mode or date, usually receptionists keep context
        }, 500);

        if (modo === 'imediato') {
          // Auto-close success modal after 5s
          setTimeout(() => {
            setMostrarSucesso(false);
            setSenhaGerada(null);
          }, 5000);
        }

      } catch (err) {
        alert('Erro: ' + err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleConfirmarAgendamento = async (id: string) => {
    if (!confirm("Confirmar presença e gerar senha?")) return;
    try {
      const ticket = await confirmarAgendamento(id);
      setSenhaGerada(ticket.numero);
      setTipo(ticket.tipo); // Update local state for modal display
      setNome(ticket.nome);
      setMostrarSucesso(true);
    } catch (e) {
      alert("Erro ao confirmar: " + e);
    }
  };

  const handleCancelarAgendamento = async (id: string) => {
    if (!confirm("Cancelar este agendamento?")) return;
    try {
      await cancelarAgendamento(id);
    } catch (e) {
      alert("Erro ao cancelar: " + e);
    }
  };

  const senhasAguardando = senhas.filter(s => s.status === 'aguardando');

  // Format CPF and Phone helpers (simple visual masking)
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <LoginLayout
        title="Recepção"
        subtitle="Triagem e Emissão de Senhas"
        colorScheme="primary"
      >
        <LoginForm
          onLogin={async (email, password) => {
            setLoginError('');
            try {
              const response = await login(email, password);
              if (response.success && response.user) {
                const user = response.user;
                if (user.funcao === 'Gerador' || user.funcao === 'Administrador' || user.isAdmin) {
                  setIsAuthenticated(true);
                  setCurrentUser(user);
                } else {
                  setLoginError('Acesso negado. Área restrita.');
                }
              } else {
                setLoginError(response.error || 'Credenciais inválidas.');
              }
            } catch (e) {
              setLoginError('Erro ao conectar.');
            }
          }}
          isLoading={false}
          error={loginError}
        />
      </LoginLayout>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Sair da Recepção"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          <img src={logo} alt="Logo" className="h-8" />
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">Painel de Recepção</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border border-blue-100">
            <Layers className="w-4 h-4" />
            {senhasAguardando.length} na fila
          </div>
          <button
            onClick={() => setChangePassOpen(true)}
            className="text-gray-500 hover:text-blue-600 font-medium text-sm transition-colors flex items-center gap-1"
            title="Trocar Senha"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
          >
            Encerrar Sessão
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Form (7/12) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  {modo === 'imediato' ? <User className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{modo === 'imediato' ? 'Dados do Cidadão' : 'Novo Agendamento'}</h2>
                  <p className="text-gray-500 text-sm">Preencha as informações do requerente.</p>
                </div>
              </div>

              {/* MODE TOGGLE */}
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModo('imediato')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${modo === 'imediato' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Ticket className="w-4 h-4" />
                  Atendimento Agora
                </button>
                <button
                  type="button"
                  onClick={() => setModo('agendamento')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${modo === 'agendamento' ? 'bg-white text-purple-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Calendar className="w-4 h-4" />
                  Agendar para Depois
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Nome */}
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">Nome Completo</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                      placeholder="Digite o nome do requerente"
                      required
                    />
                  </div>
                </div>

                {modo === 'agendamento' && (
                  <div className="space-y-2 w-48">
                    <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">Data</label>
                    <div className="relative group">
                      <input
                        type="date"
                        value={dataAgendada}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          const day = date.getUTCDay(); // 0 is Sunday, 6 is Saturday

                          if (day === 0 || day === 6) {
                            alert('Agendamentos não são permitidos aos fins de semana. Por favor, selecione um dia útil (Segunda a Sexta).');
                            e.target.value = ''; // Reset input visually (though state might need reset if controlled)
                            return;
                          }
                          setDataAgendada(e.target.value);
                        }}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                        required
                        min={new Date().toISOString().split('T')[0]} // Block past dates
                        onKeyDown={(e) => e.preventDefault()} // Prevent manual typing to force picker use
                      />
                    </div>
                  </div>
                )}

                {modo === 'agendamento' && (
                  <div className="space-y-2 w-40">
                    <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">Horário</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="time"
                        value={horaAgendada}
                        onChange={e => setHoraAgendada(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grid for details */}
              {/* Grid for details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">CPF</label>
                    {cpf.length > 10 && !cpfError && (
                      <button
                        type="button"
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                      >
                        <Clock className="w-3 h-3" /> Ver Histórico
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${cpfError ? 'text-red-400' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                    <input
                      type="text"
                      value={cpf}
                      onChange={handleCpfChange}
                      onBlur={handleCpfBlur}
                      maxLength={14}
                      className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-xl outline-none transition-all font-medium placeholder-gray-400 ${cpfError
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-red-900'
                        : 'border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-gray-900'
                        }`}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  {cpfError && (
                    <p className="text-red-500 text-xs mt-1 ml-1 font-medium animate-in slide-in-from-top-1">{cpfError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">Telefone</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={telefone}
                      onChange={e => setTelefone(formatPhone(e.target.value))}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">Bairro</label>
                  <div className="relative group space-y-2">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                      <select
                        value={selectedBairro}
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedBairro(val);
                          if (val !== 'Outros') setBairro(val);
                          else setBairro(''); // Clear for manual input
                        }}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Selecione o Bairro</option>
                        {LISTA_BAIRROS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      {/* Arrow Icon for Select */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </div>
                    </div>

                    {/* Manual Input if "Outros" selected */}
                    {selectedBairro === 'Outros' && (
                      <div className="relative animate-in slide-in-from-top-2 fade-in duration-200">
                        <input
                          type="text"
                          value={bairro}
                          onChange={e => setBairro(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-gray-900 placeholder-gray-400 text-sm"
                          placeholder="Digite o nome do bairro..."
                          autoFocus
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Serviço</h2>
                    <p className="text-gray-500 text-sm">Selecione o tipo de atendimento.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tiposAtivos.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(t.nome)}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${tipo === t.nome
                        ? 'border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500'
                        : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                    >
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <span className={`font-bold text-sm mb-2 ${tipo === t.nome ? 'text-blue-700' : 'text-gray-700'}`}>{t.nome}</span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${tipo === t.nome ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full bg-gray-50 p-1.5 rounded-xl flex gap-2 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setPrioridade('normal')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-sm ${prioridade === 'normal' ? 'bg-white text-gray-900 border border-gray-200' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridade('prioritaria')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${prioridade === 'prioritaria' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Prioridade
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!nome.trim() || isSubmitting || !!cpfError}
                  className="w-full md:w-auto px-12 py-4 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-xl shadow-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {modo === 'imediato' ? <Ticket className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                  {modo === 'imediato' ? 'Emitir Senha Agora' : 'Salvar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div >

        {/* Right Column: Queue Summary (5/12) */}
        < div className="lg:col-span-4 space-y-6" >
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {viewTab === 'fila' ? <Layers className="w-5 h-5 text-gray-400" /> : <CheckCircle className="w-5 h-5 text-gray-400" />}
                {viewTab === 'fila' ? 'Fila de Espera' : 'Check-in / Chegadas'}
              </h3>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button onClick={() => setViewTab('fila')} className={`p-1.5 rounded-md ${viewTab === 'fila' ? 'bg-white shadow' : 'text-gray-400'}`} title="Fila"><Layers className="w-4 h-4" /></button>
                <button onClick={() => setViewTab('agenda')} className={`p-1.5 rounded-md ${viewTab === 'agenda' ? 'bg-white shadow text-green-600' : 'text-gray-400'}`} title="Check-in"><CheckCircle className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100/50">
                <div className="text-3xl font-bold text-blue-700">{senhas.filter(s => s.status === 'aguardando' && s.prioridade === 'normal').length}</div>
                <div className="text-xs uppercase font-bold text-blue-400 mt-1">Normal</div>
              </div>
              <div className="bg-red-50 rounded-2xl p-4 border border-red-100/50">
                <div className="text-3xl font-bold text-red-700">{senhas.filter(s => s.status === 'aguardando' && s.prioridade === 'prioritaria').length}</div>
                <div className="text-xs uppercase font-bold text-red-400 mt-1">Prioridade</div>
              </div>
            </div>

            {viewTab === 'fila' ? (
              // --- QUEUE VIEW ---
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Últimas Emitidas</div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {/* Active & Recent Tickets */}
                  {senhas
                    .filter(s => ['aguardando', 'chamada', 'atendendo'].includes(s.status)) // Show active ones
                    .sort((a, b) => new Date(b.horaGeracao).getTime() - new Date(a.horaGeracao).getTime()) // Newest first
                    .map(senha => (
                      <div key={senha.id} className={`p-3 rounded-xl border flex justify-between items-center group transition-all ${senha.status === 'aguardando' ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${senha.status === 'aguardando' ? 'bg-gray-300' : 'bg-blue-500 animate-pulse'}`}></div>
                          <div>
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                              {senha.numero}
                              {senha.prioridade !== 'normal' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold uppercase tracking-wider">{senha.prioridade}</span>}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{senha.nome}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-xs font-bold uppercase ${senha.status === 'aguardando' ? 'text-gray-400' : 'text-blue-600'}`}>
                            {senha.status}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            {calcularTempoEspera(senha.horaGeracao)}
                          </div>
                        </div>
                      </div>
                    ))}
                  {senhas.filter(s => ['aguardando', 'chamada', 'atendendo'].includes(s.status)).length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center gap-2">
                      <History className="w-8 h-8 opacity-20" />
                      Nenhuma senha ativa no momento.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // --- APPOINTMENTS VIEW ---
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex flex-col gap-3 mb-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {showAllHistory ? 'Todos os Agendamentos' : 'Aguardando Chegada'}
                    </div>
                    <div className="text-xs font-bold text-blue-600">
                      {agendamentos.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase())).length} Encontrados
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nome..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none placeholder:text-gray-400"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAllHistory(false)}
                      className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all flex items-center justify-center gap-1 ${!showAllHistory ? 'bg-white border-blue-500 text-blue-600 ring-1 ring-blue-500' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}`}
                    >
                      <Calendar className="w-3 h-3" />
                      Por Data
                    </button>
                    <button
                      onClick={() => setShowAllHistory(true)}
                      className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all flex items-center justify-center gap-1 ${showAllHistory ? 'bg-white border-blue-500 text-blue-600 ring-1 ring-blue-500' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}`}
                    >
                      <Layers className="w-3 h-3" />
                      Ver Tudo
                    </button>
                  </div>

                  {!showAllHistory && (
                    <div>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full text-sm p-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {agendamentos.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">Nenhum agendamento encontrado.</div>
                  )}
                  {(agendamentos || [])
                    .filter(a => a && typeof a === 'object' && a.nome)
                    .filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(ag => (
                      <div key={ag.id} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${ag.status === 'pendente' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-gray-800">{ag.nome}</div>
                            <div className="text-xs text-gray-500">{ag.tipo} • {ag.prioridade === 'normal' ? 'Normal' : 'Prioridade'}</div>
                            {ag.observacoes && <div className="text-xs text-orange-500 mt-1">{ag.observacoes}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">
                              {ag.dataAgendada && typeof ag.dataAgendada === 'string' ? ag.dataAgendada.split('-').reverse().join('/') : 'Data Inválida'}
                            </div>
                            {ag.horaAgendada && (
                              <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {ag.horaAgendada}
                              </div>
                            )}
                          </div>
                        </div>

                        {ag.status === 'pendente' && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => handleConfirmarAgendamento(ag.id)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1"
                            >
                              <CheckSquare className="w-3 h-3" /> Confirmar
                            </button>
                            <button
                              onClick={() => handleCancelarAgendamento(ag.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded-lg"
                              title="Cancelar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {ag.status !== 'pendente' && (
                          <div className="mt-1 text-xs text-center font-bold uppercase text-gray-400">
                            {ag.status}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div >

      </main >

      {/* SUCCESS MODAL OVERLAY */}
      {
        mostrarSucesso && (senhaGerada || agendamentoConfirmado) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-0 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 relative">
              {/* Header Design */}
              <div className="bg-gray-900 p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <img src={logo} alt="Logo" className="h-8 mx-auto mb-4 relative z-10" />
                <h2 className="text-white/80 text-sm uppercase tracking-widest font-medium relative z-10">
                  {senhaGerada ? 'Senha Gerada' : 'Agendamento Confirmado'}
                </h2>
              </div>

              <div className="p-8 text-center bg-white relative">
                {/* Visual Cutouts only for Ticket (optional, or keep for consistency) */}
                <div className="absolute -top-3 -left-3 w-6 h-6 bg-gray-900 rounded-full"></div>
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-gray-900 rounded-full"></div>

                {senhaGerada ? (
                  <>
                    <div className="text-6xl font-mono font-bold text-gray-900 tracking-tighter mb-2">{senhaGerada}</div>
                    <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase mb-6">
                      {tipo}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="bg-green-100 p-4 rounded-full text-green-600">
                        <Calendar className="w-12 h-12" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Sucesso!</h3>
                  </>
                )}

                <div className="border-t border-dashed border-gray-200 pt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Nome</span>
                    <span className="font-bold text-gray-800 truncate max-w-[150px]">{nome || agendamentoConfirmado?.nome || 'Cidadão'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Data</span>
                    <span className="font-bold text-gray-800">
                      {senhaGerada
                        ? new Date().toLocaleDateString()
                        : new Date(agendamentoConfirmado?.dataAgendada || new Date()).toLocaleDateString()
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Hora</span>
                    <span className="font-bold text-gray-800">
                      {senhaGerada
                        ? new Date().toLocaleTimeString().slice(0, 5)
                        : agendamentoConfirmado?.horaAgendada || '--:--'
                      }
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMostrarSucesso(false);
                    setSenhaGerada(null);
                    setAgendamentoConfirmado(null);
                  }}
                  className={`mt-8 w-full font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${senhaGerada
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  {senhaGerada ? <Printer className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {senhaGerada ? 'Imprimir Ticket' : 'Concluir'}
                </button>
                <p className="text-xs text-gray-400 mt-3">Fecha automaticamente em 5s</p>
              </div>
            </div>
          </div>
        )
      }

      {
        isAuthenticated && (
          <ChangePasswordModal
            isOpen={changePassOpen}
            onClose={() => setChangePassOpen(false)}
            userId={currentUser?.id || ''}
          />
        )
      }

      {/* 
      <BeneficiaryHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        cpf={cpf}
        nome={nome}
      /> 
      */}
    </div>
  );
}
