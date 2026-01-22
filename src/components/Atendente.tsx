import React, { useState } from 'react';
import { useSenhas } from '../context/SenhasContext';
import { Phone, CheckCircle, Volume2, Clock, AlertCircle, Settings, X, Save, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoginLayout from './auth/LoginLayout';
import LoginForm from './auth/LoginForm';
import ChangePasswordModal from './auth/ChangePasswordModal';
import logo from '../assets/logo.svg';

export default function Atendente() {
  const { senhas, usuarios, servicos, chamarSenha, iniciarAtendimento, finalizarAtendimento, cancelarSenha, repetirSenha, login, logout, atualizarSessaoAtendente, naoApareceu } = useSenhas();
  const navigate = useNavigate();

  // Auth States
  const [logado, setLogado] = useState(false);
  const [sessionConfigured, setSessionConfigured] = useState(false); // New: Session setup completed?
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // User Session State
  const [usuarioLogado, setUsuarioLogado] = useState<{ id: string, nome: string, guiche?: number, tipoGuiche?: string, tiposAtendimento?: any } | null>(null);
  const [guiche, setGuiche] = useState(1);
  const [tipoGuiche, setTipoGuiche] = useState('Guichê'); // Novo state
  const [tiposAtendimentoLocal, setTiposAtendimentoLocal] = useState<string[]>([]);
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [tempGuiche, setTempGuiche] = useState(1);
  const [tempTipoGuiche, setTempTipoGuiche] = useState('Guichê');
  const [tempTipos, setTempTipos] = useState<string[]>([]);
  const [changePassOpen, setChangePassOpen] = useState(false);

  // Initial config load effect
  React.useEffect(() => {
    if (logado && (!tiposAtendimentoLocal.length)) {
      setModalConfigOpen(true);
      // Pre-fill if user has saved data (simulated with backend data or default)
      setModalConfigOpen(true);
      // Pre-fill if user has saved data (simulated with backend data or default)
      if (usuarioLogado?.guiche) setTempGuiche(usuarioLogado.guiche);
      if (usuarioLogado?.tipoGuiche) setTempTipoGuiche(usuarioLogado.tipoGuiche);
      if (usuarioLogado?.tiposAtendimento) {
        setTempTipos(usuarioLogado.tiposAtendimento);
      }
    }
  }, [logado]);

  const handleSalvarConfig = () => {
    let tiposParaSalvar = [...tempTipos];

    // If it's an Admin, we can auto-fill all services just to be explicit, 
    // but even if we don't, empty list = 'Show All' in filter logic.
    const isAdmin = usuarioLogado && (usuarioLogado.isAdmin || usuarioLogado.funcao === 'Administrador');
    if (isAdmin && tiposParaSalvar.length === 0) {
      tiposParaSalvar = servicos.filter(s => s.ativo).map(s => s.nome);
    }

    // VALIDATION REMOVED: Allow proceeding with 0 services (defaults to viewing all)

    setGuiche(tempGuiche);
    setTipoGuiche(tempTipoGuiche);
    setTiposAtendimentoLocal(tiposParaSalvar);
    setModalConfigOpen(false);

    // Update local user object
    if (usuarioLogado) {
      setUsuarioLogado({ ...usuarioLogado, guiche: tempGuiche, tipoGuiche: tempTipoGuiche, tiposAtendimento: tiposParaSalvar });

      // Persist to server
      atualizarSessaoAtendente(usuarioLogado.id, tempGuiche, tempTipoGuiche, tiposParaSalvar);
    }
  };

  // As senhas que este atendente pode ver/chamar
  const senhasAguardando = senhas.filter(s => {
    if (s.status !== 'aguardando') return false;
    // Use local config instead of user object property
    if (tiposAtendimentoLocal.length > 0) {
      return tiposAtendimentoLocal.includes(s.tipo);
    }
    return true;
  });

  const senhaAtual = senhas.find(s => (s.status === 'atendendo' || s.status === 'chamada') && s.guiche === guiche);

  // --- LOGIN HANDLER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await login(emailInput, passwordInput);

      if (response.success && response.user) {
        // Verificar permissão
        const u = usuarios.find(user => user.email === response.user.email);
        const fullUser = usuarios.find(u => u.id === response.user.id);

        if (fullUser && (fullUser.funcao === 'Atendente' || fullUser.isAdmin)) {
          setLogado(true);
          setLogado(true);
          setUsuarioLogado(fullUser);
          // Defaults
          setTempGuiche(fullUser.guiche || 1);
          setTempTipoGuiche(fullUser.tipoGuiche || 'Guichê');
          setLoginError('');
        } else {
          setLoginError('Acesso negado. Este usuário não é um Atendente.');
        }
      } else {
        setLoginError(response.error || 'Credenciais inválidas.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setLogado(false);
    setUsuarioLogado(null);
    setEmailInput('');
    setPasswordInput('');
    setTiposAtendimentoLocal([]);
    setModalConfigOpen(false);
    logout();
  };

  const handleChamarSenha = () => {
    if (!usuarioLogado) return;

    chamarSenha({
      guiche,
      tipoGuiche,
      atendente: usuarioLogado.nome,
      tiposPermitidos: tiposAtendimentoLocal
    });
  };

  const calcularTempoEspera = (horaGeracao: Date) => {
    const diff = Date.now() - new Date(horaGeracao).getTime();
    const minutos = Math.floor(diff / 60000);
    return minutos;
  };

  // --- LOGIN SCREEN ---
  // --- LOGIN SCREEN ---
  if (!logado) {
    return (
      <LoginLayout
        title="Portal do Atendente"
        subtitle="Identifique-se para começar"
        colorScheme="success"
      >
        <LoginForm
          onLogin={async (email, password) => {
            setIsLoggingIn(true);
            setLoginError('');
            try {
              const response = await login(email, password);
              if (response.success && response.user) {
                const fullUser = usuarios.find(u => u.id === response.user!.id);
                if (fullUser && (fullUser.funcao === 'Atendente' || fullUser.isAdmin)) {
                  setLogado(true);
                  setUsuarioLogado(fullUser);
                  setTempGuiche(fullUser.guiche || 1);
                  setTempTipoGuiche(fullUser.tipoGuiche || 'Guichê');
                } else {
                  setLoginError('Acesso negado. Apenas atendentes.');
                }
              } else {
                setLoginError(response.error || 'Credenciais inválidas.');
              }
            } finally {
              setIsLoggingIn(false);
            }
          }}
          isLoading={isLoggingIn}
          error={loginError}
        />
      </LoginLayout>
    );
  }

  // --- DASHBOARD ATENDENTE (LOGADO) ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">{tipoGuiche} {guiche}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" /> {usuarioLogado?.nome}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setChangePassOpen(true)}
            className="p-2 text-secondary-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Trocar Senha"
          >
            <Lock className="w-6 h-6" />
          </button>
          <button
            onClick={() => {
              setTempGuiche(guiche);
              setTempTipoGuiche(tipoGuiche);
              setTempTipos(tiposAtendimentoLocal);
              setModalConfigOpen(true);
            }}
            className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-secondary-50 rounded-lg transition-colors"
            title="Configurações de Atendimento"
          >
            <Settings className="w-6 h-6" />
          </button>
          <button
            onClick={handleLogout}
            className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Painel de Controle (Esquerda) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Status Atual */}
          {senhaAtual ? (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-green-100 relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <span className={`${senhaAtual.status === 'chamada' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'} px-4 py-1.5 rounded-full font-bold uppercase tracking-wider text-sm flex items-center gap-2`}>
                    <Volume2 className="w-4 h-4" /> {senhaAtual.status === 'chamada' ? 'Chamando...' : 'Em Atendimento'}
                  </span>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-gray-900 tabular-nums">{senhaAtual.numero}</div>
                    <div className="text-gray-500 mt-1">{senhaAtual.tipo}</div>
                  </div>
                </div>

                <div className="mb-6 border-b border-gray-100 pb-6">
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">{senhaAtual.nome}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-3">
                    {senhaAtual.cpf && (
                      <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                        <span className="font-semibold text-gray-700">CPF:</span> {senhaAtual.cpf}
                      </span>
                    )}
                    {senhaAtual.telefone && (
                      <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                        <Phone className="w-3 h-3" /> {senhaAtual.telefone}
                      </span>
                    )}
                    {senhaAtual.bairro && (
                      <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                        <span className="font-semibold text-gray-700">Bairro:</span> {senhaAtual.bairro}
                      </span>
                    )}
                    <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                      <Clock className="w-3 h-3" /> Aguardou {senhaAtual.horaChamada && calcularTempoEspera(senhaAtual.horaChamada)} min
                    </span>
                  </div>
                </div>

                {/* HISTÓRICO DO CIDADÃO */}
                {senhaAtual.cpf && (
                  <div className="mb-8 bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Histórico de Visitas
                    </h4>

                    {senhas.filter(s => s.cpf === senhaAtual.cpf && s.id !== senhaAtual.id).length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {senhas
                          .filter(s => s.cpf === senhaAtual.cpf && s.id !== senhaAtual.id)
                          .sort((a, b) => new Date(b.horaGeracao).getTime() - new Date(a.horaGeracao).getTime())
                          .map(h => (
                            <div key={h.id} className="bg-white p-3 rounded-lg border border-blue-100 text-sm flex justify-between items-center">
                              <div>
                                <span className="font-bold text-gray-700">{new Date(h.horaGeracao).toLocaleDateString()}</span>
                                <span className="text-gray-400 mx-2">•</span>
                                <span className="text-gray-600">{h.tipo}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded textxs font-bold ${h.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {h.status}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-center py-4 text-blue-400 text-sm bg-white/50 rounded-lg border border-blue-100 border-dashed">
                        Nenhuma visita anterior encontrada para este CPF.
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {senhaAtual.status === 'chamada' ? (
                    <>
                      <button
                        onClick={() => iniciarAtendimento(senhaAtual.id)}
                        className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <CheckCircle className="w-6 h-6" /> Iniciar Atendimento
                      </button>
                      <button
                        onClick={repetirSenha}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Volume2 className="w-5 h-5" /> Chamar Novamente
                      </button>
                      <button
                        onClick={() => naoApareceu(senhaAtual.id)}
                        className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-5 h-5" /> Não Apareceu
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => finalizarAtendimento(senhaAtual.id)}
                      className="col-span-2 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <CheckCircle className="w-6 h-6" /> Finalizar
                    </button>
                  )}

                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Aguardando Próximo</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8">O guichê está livre. Clique abaixo para chamar o próximo da fila.</p>
              <button
                onClick={handleChamarSenha}
                disabled={senhasAguardando.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-xl shadow-blue-200 transition-all transform hover:-translate-y-1 active:translate-y-0"
              >
                Chamar Próximo ({senhasAguardando.length})
              </button>
            </div>
          )}
        </div>

        {/* Fila de Espera (Direita) */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 h-[calc(100vh-8rem)] flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" /> Próximos da Fila
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {senhasAguardando.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Ninguém na fila</p>
              </div>
            ) : (
              senhasAguardando.map((senha, index) => (
                <div key={senha.id} className={`p-4 rounded-2xl border ${senha.prioridade.includes('prioritaria') ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} hover:border-blue-300 transition-colors`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-xl text-gray-800">{senha.numero}</span>
                    {senha.prioridade.includes('prioritaria') && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold uppercase">Prioridade</span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-700 mb-1">{senha.nome}</h4>
                  <div className="text-xs text-gray-500 mb-2 flex flex-col gap-0.5">
                    {senha.cpf && <span>CPF: {senha.cpf}</span>}
                    {senha.bairro && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {senha.bairro}</span>}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500 border-t border-gray-100 pt-2">
                    <span>{senha.tipo}</span>
                    <span>{calcularTempoEspera(senha.horaGeracao)} min</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {modalConfigOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 transform transition-all scale-100">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 flex justify-between items-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-50 pattern-grid-lg"></div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3 relative z-10">
                <Settings className="w-7 h-7" />
                Configuração
              </h3>
              {tiposAtendimentoLocal.length > 0 && (
                <button
                  onClick={() => setModalConfigOpen(false)}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors relative z-10"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="p-8 space-y-8">

              {/* Tipo de Unidade Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Onde você está?</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Guichê', 'Sala'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTempTipoGuiche(type)}
                      className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all duration-200 ${tempTipoGuiche === type
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-md transform scale-[1.02]'
                        : 'border-gray-200 hover:border-green-200 hover:bg-gray-50 text-gray-500'
                        }`}
                    >
                      <span className="text-lg font-bold">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number Selection 1-10 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Número da {tempTipoGuiche}</label>
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setTempGuiche(num)}
                      className={`h-12 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center ${tempGuiche === num
                        ? 'bg-green-600 text-white shadow-lg shadow-green-200 transform -translate-y-1'
                        : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-green-400 hover:text-green-600'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>



              {/* Action Button */}
              <button
                onClick={handleSalvarConfig}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-200 hover:shadow-green-300 transition-all transform active:scale-95"
              >
                <Save className="w-6 h-6" />
                Confirmar e Iniciar
              </button>
            </div>
          </div>
        </div>
      )}



      {
        usuarioLogado && (
          <ChangePasswordModal
            isOpen={changePassOpen}
            onClose={() => setChangePassOpen(false)}
            userId={usuarioLogado.id}
          />
        )
      }
    </div >
  );
}
