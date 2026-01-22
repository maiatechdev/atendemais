import React, { useState } from 'react';
import { Home, TicketPlus, CheckCircle, Printer, ArrowLeft } from 'lucide-react';
import { useSenhas, type TipoAtendimento, type Prioridade } from '../context/SenhasContext';
import { useNavigate } from 'react-router-dom';

export default function GeradorSenhas() {
  const { gerarSenha, senhas, ultimasSenhas, login, usuarios, servicos } = useSenhas();
  const navigate = useNavigate();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<string>(''); // Inicialmente vazio, será setado com o primeiro ativo
  const [prioridade, setPrioridade] = useState<Prioridade>('normal');
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa o tipo com o primeiro serviço ativo se disponível
  React.useEffect(() => {
    const ativos = servicos.filter(s => s.ativo);
    if (!tipo && ativos.length > 0) {
      setTipo(ativos[0].nome);
    }
  }, [servicos, tipo]);

  const tiposAtivos = servicos.filter(s => s.ativo);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const response = await login(emailInput, passwordInput);

    if (response.success && response.user) {
      // Verificar permissão (Gerador ou Admin)
      const fullUser = usuarios.find(u => u.id === response.user.id);

      if (fullUser && (fullUser.funcao === 'Gerador' || fullUser.funcao === 'Administrador' || fullUser.isAdmin)) {
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError('Acesso negado. Usuário não autorizado para Triagem.');
      }
    } else {
      setLoginError(response.error || 'Credenciais inválidas.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmailInput('');
    setPasswordInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim()) {
      setIsSubmitting(true);
      try {
        const senha = await gerarSenha(nome, tipo as any, prioridade);
        setSenhaGerada(senha.numero);
        setMostrarSucesso(true);

        // Reset após 5 segundos
        setTimeout(() => {
          setMostrarSucesso(false);
          setNome('');
          setPrioridade('normal');
          setSenhaGerada(null);
        }, 5000);
      } catch (err) {
        alert('Erro ao gerar senha: ' + err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleImprimir = () => {
    alert('Senha impressa! (simulação)');
  };

  const senhasAguardando = senhas.filter(s => s.status === 'aguardando');

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <TicketPlus className="w-12 h-12 text-primary-600 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-secondary-900">Recepção</h1>
            <p className="text-secondary-500">Login obrigatório</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
              <input
                type="text"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-secondary-300 focus:ring-2 focus:ring-primary-500 outline-none"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Senha</label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-secondary-300 focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
            </div>

            {loginError && (
              <div className="text-danger-500 text-sm">{loginError}</div>
            )}

            <button type="submit" className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors">
              Entrar
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-secondary-500 text-sm mt-2 hover:text-secondary-800"
            >
              Voltar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-secondary-50 p-6 flex items-center justify-center">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-secondary-600 hover:text-primary-600 px-4 py-2 rounded-lg hover:bg-secondary-50 transition-colors bg-secondary-100/50"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Voltar</span>
            </button>
            <button onClick={handleLogout} className="text-danger-500 text-sm font-medium hover:underline">Sair</button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-secondary-900">Recepção</h1>
            <p className="text-secondary-500 text-sm">Triagem e Atendimento</p>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-primary-600 leading-none">{senhasAguardando.length}</span>
            <span className="text-xs uppercase tracking-wide text-secondary-500 font-semibold">Na Fila</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário - Kiosk Style */}
          <div className="bg-white rounded-3xl shadow-xl border border-secondary-200 p-8 lg:p-10 relative overflow-hidden">
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-primary-700"></div>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center shadow-sm">
                <TicketPlus className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-secondary-900 text-2xl font-bold">Nova Senha</h2>
                <p className="text-secondary-500">Informe os dados para iniciar</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-secondary-700 text-sm font-semibold uppercase tracking-wide">Nome do Cidadão</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl border-2 border-secondary-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none text-lg bg-secondary-50 placeholder-secondary-400"
                  placeholder="Nome completo..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-secondary-700 text-sm font-semibold uppercase tracking-wide">Serviço Desejado</label>
                <div className="grid grid-cols-1 gap-3">
                  {tiposAtivos.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(t.nome)}
                      className={`px-5 py-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${tipo === t.nome
                        ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                        : 'border-transparent bg-secondary-100 text-secondary-600 hover:bg-secondary-200/70'
                        }`}
                    >
                      <span className="font-medium">{t.nome}</span>
                      {tipo === t.nome && <CheckCircle className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-secondary-100">
                <span className="block text-secondary-700 text-sm font-semibold uppercase tracking-wide">Prioridade</span>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPrioridade('normal')}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${prioridade === 'normal' ? 'border-secondary-900 bg-secondary-900 text-white' : 'border-secondary-200 text-secondary-400 hover:border-secondary-300'}`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridade('prioritaria')}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${prioridade === 'prioritaria' ? 'border-primary-600 bg-primary-600 text-white shadow-lg shadow-primary-200' : 'border-secondary-200 text-secondary-400 hover:border-secondary-300'}`}
                  >
                    Prioridade
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!nome.trim() || isSubmitting}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed text-white py-5 rounded-xl transition-all text-xl font-bold uppercase tracking-wide shadow-lg shadow-primary-200 flex items-center justify-center gap-3 active:scale-95 transform"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <TicketPlus className="w-6 h-6" />
                    Emitir Senha
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Senha Gerada / Resumo */}
          <div className="flex flex-col h-full">
            {mostrarSucesso && senhaGerada ? (
              <div className="bg-white rounded-3xl shadow-2xl p-8 text-center flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 border border-primary-100">
                <div className="w-24 h-24 bg-success-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-success-200 animate-bounce">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>

                <h3 className="text-secondary-800 text-3xl font-bold mb-8">Senha Gerada!</h3>

                <div className="bg-secondary-50 border-2 border-secondary-200 rounded-2xl p-8 w-full max-w-sm mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2">
                    <div className="w-16 h-16 bg-primary-200/20 rounded-full blur-xl absolute -right-4 -top-4"></div>
                  </div>
                  <div className="text-secondary-500 text-sm uppercase tracking-widest font-semibold mb-2">Sua Senha</div>
                  <div className="text-7xl font-mono font-bold text-secondary-900 tracking-tighter mb-4">{senhaGerada}</div>
                  <div className="text-xl font-medium text-secondary-700 border-t border-secondary-200 pt-4 mt-2">
                    {nome}
                  </div>
                  <div className="text-sm text-secondary-500 mt-1">{tipo}</div>

                  {prioridade === 'prioritaria' && (
                    <div className="bg-red-100 text-red-700 border border-red-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide inline-block mt-4">
                      Atendimento Prioritário
                    </div>
                  )}
                </div>

                <button
                  onClick={handleImprimir}
                  className="w-full max-w-sm bg-secondary-900 hover:bg-black text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Printer className="w-5 h-5" />
                  Imprimir Comprovante
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-soft p-8 h-full flex flex-col border border-secondary-200">
                <h3 className="text-secondary-800 text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
                  Resumo da Fila
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-secondary-50 border border-secondary-100 rounded-2xl p-5 text-center">
                    <div className="text-4xl font-bold text-secondary-900 mb-1">
                      {senhas.filter(s => s.status === 'aguardando' && s.prioridade === 'normal').length}
                    </div>
                    <div className="text-secondary-500 text-sm font-medium uppercase">Normal</div>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
                    <div className="text-4xl font-bold text-red-600 mb-1">
                      {senhas.filter(s => s.status === 'aguardando' && s.prioridade === 'prioritaria').length}
                    </div>
                    <div className="text-red-600/70 text-sm font-medium uppercase">Prioritária</div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <h4 className="text-secondary-500 text-sm font-semibold uppercase tracking-wide mb-3">Últimas Senhas</h4>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {senhas
                      .filter(s => s.status === 'aguardando')
                      .slice(-6)
                      .reverse()
                      .map(senha => (
                        <div
                          key={senha.id}
                          className={`p-4 rounded-xl border flex items-center justify-between ${senha.prioridade === 'prioritaria'
                            ? 'bg-red-50 border-red-100'
                            : 'bg-white border-secondary-100'
                            }`}
                        >
                          <div>
                            <div className="text-lg font-bold text-secondary-900">{senha.numero}</div>
                            <div className="text-secondary-500 text-xs font-medium truncate max-w-[120px]">{senha.nome}</div>
                          </div>
                          {senha.prioridade === 'prioritaria' && (
                            <div className="text-red-600">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      ))}
                    {senhas.filter(s => s.status === 'aguardando').length === 0 && (
                      <div className="h-full flex items-center justify-center text-secondary-400 text-sm italic border-2 border-dashed border-secondary-200 rounded-xl">
                        Nenhuma senha aguardando.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Helper icon for the list
  function AlertTriangle(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </svg>
    )
  }
}
