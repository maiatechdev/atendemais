import React, { useState } from 'react';
import { useSenhas } from '../context/SenhasContext';
import { Phone, CheckCircle, Volume2, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Atendente() {
  const { senhas, usuarios, servicos, chamarSenha, iniciarAtendimento, finalizarAtendimento, cancelarSenha, repetirSenha, login, atualizarSessaoAtendente } = useSenhas();
  const navigate = useNavigate();

  // Auth States
  const [logado, setLogado] = useState(false);
  const [sessionConfigured, setSessionConfigured] = useState(false); // New: Session setup completed?
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // User Session State
  const [usuarioLogado, setUsuarioLogado] = useState<{ id: string, nome: string, guiche?: number, tiposAtendimento?: any } | null>(null);
  const [guiche, setGuiche] = useState(1); // Pode ser sobrescrito pelo usuario do banco

  // As senhas que este atendente pode ver/chamar
  const senhasAguardando = senhas.filter(s => {
    if (s.status !== 'aguardando') return false;
    if (usuarioLogado?.tiposAtendimento && usuarioLogado.tiposAtendimento.length > 0) {
      return usuarioLogado.tiposAtendimento.includes(s.tipo);
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
          setUsuarioLogado(fullUser);
          if (fullUser.guiche) setGuiche(fullUser.guiche);
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
  };

  const handleChamarSenha = () => {
    if (!usuarioLogado) return;

    chamarSenha({
      guiche,
      atendente: usuarioLogado.nome,
      tiposPermitidos: usuarioLogado.tiposAtendimento
    });
  };

  const calcularTempoEspera = (horaGeracao: Date) => {
    const diff = Date.now() - new Date(horaGeracao).getTime();
    const minutos = Math.floor(diff / 60000);
    return minutos;
  };

  // --- LOGIN SCREEN ---
  if (!logado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-gray-800 text-3xl font-bold mb-2">Portal do Atendente</h1>
            <p className="text-gray-500">Identifique-se para começar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email</label>
              <input
                type="text"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-green-500 focus:outline-none bg-white transition-colors"
                placeholder="seu@email.com"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Senha</label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-green-500 focus:outline-none bg-white transition-colors"
                placeholder="Sua senha"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? 'Entrando...' : 'Iniciar Atendimento'}
            </button>

            <button
              type="button"
              disabled={isLoggingIn}
              onClick={() => navigate('/')}
              className="w-full text-gray-500 hover:text-gray-800 font-medium py-2 transition-colors disabled:opacity-50"
            >
              Voltar ao Início
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD ATENDENTE (LOGADO) ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Guichê {guiche}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" /> {usuarioLogado?.nome}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Sair
        </button>
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

                <div className="mb-8">
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">{senhaAtual.nome}</h3>
                  <p className="text-gray-500 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Aguardou {senhaAtual.horaChamada && calcularTempoEspera(senhaAtual.horaChamada)} min
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {senhaAtual.status === 'chamada' ? (
                    <button
                      onClick={() => iniciarAtendimento(senhaAtual.id)}
                      className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <CheckCircle className="w-6 h-6" /> Iniciar Atendimento
                    </button>
                  ) : (
                    <button
                      onClick={() => finalizarAtendimento(senhaAtual.id)}
                      className="bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <CheckCircle className="w-6 h-6" /> Finalizar
                    </button>
                  )}

                  <button
                    onClick={repetirSenha}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Volume2 className="w-6 h-6" /> Chamar Novamente
                  </button>
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
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{senha.tipo}</span>
                    <span>{calcularTempoEspera(senha.horaGeracao)} min</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
