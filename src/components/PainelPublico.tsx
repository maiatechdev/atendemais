import React, { useEffect, useState } from 'react';
import { Volume2, Home, Clock, AlertCircle } from 'lucide-react';
import { useSenhas } from '../context/SenhasContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';

export default function PainelPublico() {
  const { senhaAtual, ultimasSenhas } = useSenhas();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatarHora = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarData = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const announceTicket = (ticket: typeof senhaAtual) => {
    if (!ticket) return;

    if ('speechSynthesis' in window) {
      const text = `Senha ${ticket.numero}, ${ticket.nome}, ${ticket.tipoGuiche || 'Guichê'} ${ticket.guiche}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(voice => voice.lang.includes('pt-BR'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (senhaAtual && ['chamada', 'atendendo'].includes(senhaAtual.status)) {
      announceTicket(senhaAtual);
    }
  }, [senhaAtual]);

  return (
    <div className="min-h-screen bg-secondary-900 text-white p-8 lg:p-12 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="flex items-start justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 p-4">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Painel de Chamadas</h1>
            <p className="text-secondary-400 text-lg mt-1">Atendimento ao Cidadão</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-6xl font-bold font-mono tracking-wider tabular-nums text-white">
            {formatarHora(currentTime)}
          </div>
          <div className="text-secondary-400 text-xl font-medium mt-1 capitalize">
            {formatarData(currentTime)}
          </div>
        </div>
      </header>

      {/* Back Button (Hidden in production usually, but kept for nav) */}
      <button
        onClick={() => navigate('/')}
        className="fixed bottom-4 left-4 opacity-0 hover:opacity-50 text-white/50 hover:bg-white/10 p-2 rounded-lg transition-all"
      >
        <Home className="w-6 h-6" />
      </button>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Display - Current Ticket */}
        <div className="lg:col-span-2">
          <div className="h-full bg-secondary-800 rounded-[2.5rem] shadow-2xl border border-secondary-700 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">

            {/* Decorative Glow */}
            {senhaAtual && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[100px] animate-pulse"></div>
            )}

            {senhaAtual && ['chamada', 'atendendo'].includes(senhaAtual.status) ? (
              <div className="relative z-10 w-full animate-in zoom-in-90 duration-300">
                <div className={`inline-flex items-center gap-3 ${senhaAtual.status === 'chamada' ? 'bg-secondary-900/50 border-secondary-600' : 'bg-green-900/50 border-green-600'} backdrop-blur-md px-6 py-2 rounded-full border mb-12 transition-colors duration-500`}>
                  <span className={`w-3 h-3 rounded-full animate-pulse ${senhaAtual.status === 'chamada' ? 'bg-green-500' : 'bg-green-400'}`}></span>
                  <span className={`font-bold tracking-wider uppercase ${senhaAtual.status === 'chamada' ? 'text-green-400' : 'text-green-300'}`}>
                    {senhaAtual.status === 'chamada' ? 'Chamando Agora' : 'Em Atendimento'}
                  </span>
                </div>

                <div className="mb-10">
                  <h2 className="text-secondary-400 text-3xl font-medium uppercase tracking-widest mb-4">Senha</h2>
                  <div className="text-[14rem] leading-none font-bold text-white tracking-tighter tabular-nums drop-shadow-2xl">
                    {senhaAtual.numero}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div className="bg-secondary-900/80 rounded-3xl p-8 border border-secondary-700">
                    <h3 className="text-secondary-400 text-xl font-medium mb-2">Cidadão</h3>
                    <p className="text-4xl text-white font-semibold truncate px-4">{senhaAtual.nome}</p>
                  </div>
                  <div className="bg-primary-600 rounded-3xl p-8 shadow-lg shadow-primary-900/50">
                    <h3 className="text-primary-200 text-xl font-medium mb-2">{senhaAtual.tipoGuiche || 'Guichê'}</h3>
                    <p className="text-6xl text-white font-bold">{senhaAtual.guiche}</p>
                  </div>
                </div>

                {senhaAtual.prioridade === 'prioritaria' && (
                  <div className="mt-12 inline-flex items-center gap-4 bg-red-500/20 text-red-400 px-8 py-4 rounded-2xl border border-red-500/30 animate-pulse">
                    <AlertCircle className="w-8 h-8" />
                    <span className="text-2xl font-bold uppercase tracking-wide">Atendimento Prioritário</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center relative z-10">
                <div className="w-32 h-32 bg-secondary-700/50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Volume2 className="w-16 h-16 text-secondary-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">Aguardando Chamada</h2>
                <p className="text-xl text-secondary-400">Por favor, aguarde sua senha ser chamada.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - History */}
        <div className="bg-secondary-800 rounded-[2.5rem] shadow-2xl border border-secondary-700 p-8 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary-400" />
            Últimas Chamadas
          </h2>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {ultimasSenhas.slice(0, 5).map((senha, index) => (
              <div
                key={senha.id}
                className={`p-6 rounded-2xl border flex items-center justify-between transition-all ${index === 0
                  ? 'bg-secondary-700/50 border-primary-500/30 shadow-lg'
                  : 'bg-secondary-900/30 border-secondary-700/50 opacity-60'
                  }`}
              >
                <div>
                  <div className="text-3xl font-bold text-white mb-1">{senha.numero}</div>
                  <div className="text-secondary-400 text-sm font-medium">{senha.tipoGuiche || 'Guichê'} {senha.guiche}</div>
                </div>
                <div className="text-right">
                  {senha.prioridade === 'prioritaria' && (
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">Prioritária</span>
                  )}
                  <span className="text-2xl text-primary-400 font-bold">
                    {new Date(senha.horaChamada || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {ultimasSenhas.length === 0 && (
              <div className="h-40 flex items-center justify-center text-secondary-600 italic">
                Histórico vazio
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}