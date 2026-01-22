import React, { useState } from 'react';
import { Home, TicketPlus, CheckCircle, Printer, ArrowLeft, User, Phone, MapPin, AlertTriangle, Layers, CreditCard, Calendar, Lock } from 'lucide-react';
import { useSenhas, type TipoAtendimento, type Prioridade } from '../context/SenhasContext';
import { useNavigate } from 'react-router-dom';
import LoginLayout from './auth/LoginLayout';
import LoginForm from './auth/LoginForm';
import ChangePasswordModal from './auth/ChangePasswordModal';
import logo from '../assets/logo.svg';

export default function GeradorSenhas() {
  const { gerarSenha, senhas, login, usuarios, servicos } = useSenhas();
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
  const [tipo, setTipo] = useState<string>('');
  const [prioridade, setPrioridade] = useState<Prioridade>('normal');
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Inicializa o tipo com o primeiro serviço ativo se disponível
  React.useEffect(() => {
    const ativos = servicos.filter(s => s.ativo);
    if (!tipo && ativos.length > 0) {
      setTipo(ativos[0].nome);
    }
  }, [servicos, tipo]);

  const tiposAtivos = servicos.filter(s => s.ativo);

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
        const senha = await gerarSenha(nome, tipo as any, prioridade, cpf, telefone, bairro);
        setSenhaGerada(senha.numero);
        setMostrarSucesso(true);

        // Reset inputs immediately for next user, but keep success modal open for a bit
        setTimeout(() => {
          setNome('');
          setCpf('');
          setCpfError('');
          setTelefone('');
          setBairro('');
          setPrioridade('normal');
        }, 500);

        // Auto-close success modal after 5s or wait for manual close/print
        setTimeout(() => {
          setMostrarSucesso(false);
          setSenhaGerada(null);
        }, 5000);
      } catch (err) {
        alert('Erro ao gerar senha: ' + err);
      } finally {
        setIsSubmitting(false);
      }
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
                const fullUser = usuarios.find(u => u.id === response.user!.id);
                if (fullUser && (fullUser.funcao === 'Gerador' || fullUser.funcao === 'Administrador' || fullUser.isAdmin)) {
                  setIsAuthenticated(true);
                  setCurrentUser(fullUser);
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

            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Dados do Cidadão</h2>
                <p className="text-gray-500 text-sm">Preencha as informações para identificação.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Nome */}
              <div className="space-y-2">
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

              {/* Grid for details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">CPF</label>
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
                      maxLength={15}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1 uppercase text-[11px] tracking-wider">Bairro</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={bairro}
                      onChange={e => setBairro(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                      placeholder="Bairro de residência"
                    />
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
                  <TicketPlus className="w-6 h-6" />
                  Emitir Senha
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Queue Summary (5/12) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-400" />
              Fila de Espera
            </h3>

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

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Últimas Emitidas</div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {senhas
                  .filter(s => s.status === 'aguardando')
                  .slice(-8)
                  .reverse()
                  .map(senha => (
                    <div key={senha.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex justify-between items-center group hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all">
                      <div>
                        <div className="font-bold text-gray-800">{senha.numero}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{senha.nome}</div>
                      </div>
                      {senha.prioridade === 'prioritaria' && (
                        <div className="w-2 h-2 rounded-full bg-red-500" title="Prioridade"></div>
                      )}
                    </div>
                  ))}
                {senhasAguardando.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">Nenhuma senha na fila.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* SUCCESS MODAL OVERLAY */}
      {mostrarSucesso && senhaGerada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-0 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 relative">
            {/* Ticket Design */}
            <div className="bg-gray-900 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <img src={logo} alt="Logo" className="h-8 mx-auto mb-4 relative z-10" />
              <h2 className="text-white/80 text-sm uppercase tracking-widest font-medium relative z-10">Senha Gerada</h2>
            </div>

            <div className="p-8 text-center bg-white relative">
              {/* Cutout circles for ticket effect */}
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-gray-900 rounded-full"></div>
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-gray-900 rounded-full"></div>

              <div className="text-6xl font-mono font-bold text-gray-900 tracking-tighter mb-2">{senhaGerada}</div>

              <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase mb-6">
                {tipo}
              </div>

              <div className="border-t border-dashed border-gray-200 pt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Nome</span>
                  <span className="font-bold text-gray-800 truncate max-w-[150px]">{nome || 'Cidadão'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Data</span>
                  <span className="font-bold text-gray-800">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Hora</span>
                  <span className="font-bold text-gray-800">{new Date().toLocaleTimeString().slice(0, 5)}</span>
                </div>
              </div>

              <button
                onClick={() => { setMostrarSucesso(false); setSenhaGerada(null); }}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir Ticket
              </button>
              <p className="text-xs text-gray-400 mt-3">Fecha automaticamente em 5s</p>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isAuthenticated && (
        <ChangePasswordModal
          isOpen={changePassOpen}
          onClose={() => setChangePassOpen(false)}
          // Assuming the current user is found in 'usuarios' by matching context/token logic, 
          // but Gerador doesn't explicitly store loggedUser object in state like Atendente.
          // We can use a trick: pass a dummy ID if not found, but we should find it.
          // The context 'usuarios' might not have 'me'.
          // Let's use the first user matching email from login response if we had it, but we don't store it.
          // Users of type 'Gerador' are not necessarily bound to specific ID in the old code?
          // Wait, 'login' validates against database. We should store the user.
          // For now, I'll pass 'current-user' or fix state.
          // Actually, GeradorSenhas doesn't keep 'usuarioLogado' state except auth=true.
          // Let's fix that by adding usuarioLogado state or retrieving it.
          // We can't easily retrieve it without context knowing 'me'.
          // I will use context.usuarios.find... but I don't know the email.
          // Okay, I'll skip this specific fix for now and implement strictly what was asked, 
          // assuming I can get the ID. I'll rely on a context 'user' if it existed.
          // Since I can't get the specific user ID easily without refactoring GeradorSenhas state,
          // I will assume the context might have it or I'll just skip rendering if no ID?
          // I'll add 'usuarioLogado' state quickly in the next tool call if needed.
          // Actually, I can store the user on login!
          userId={currentUser?.id || ''}
        />
      )}
    </div>
  );
}
