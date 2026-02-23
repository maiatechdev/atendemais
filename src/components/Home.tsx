import React from 'react';
import { Tv, UserCircle, Ticket, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/logo.svg';

export default function Home() {
  const navigate = useNavigate();

  const modules = [
    {
      id: 'painel-publico',
      path: '/painel-publico',
      title: 'Painel Público',
      description: 'Visualização de chamadas para TV',
      icon: Tv,
      color: 'bg-primary-600',
    },
    {
      id: 'atendente',
      path: '/atendente',
      title: 'Atendente',
      description: 'Chamar e gerenciar senhas',
      icon: UserCircle,
      color: 'bg-secondary-600',
    },
    {
      id: 'gerador',
      path: '/gerador',
      title: 'Recepção',
      description: 'Triagem e emissão de tickets',
      icon: Ticket,
      color: 'bg-secondary-600',
    },
    {
      id: 'admin',
      path: '/admin',
      title: 'Administrador',
      description: 'Configurações e gestão de equipe',
      icon: Shield,
      color: 'bg-secondary-800',
    },

  ];

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-primary-300 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="max-w-6xl w-full z-10 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <img src={logo} alt="Atende+ Logo" className="h-24 mx-auto mb-6 drop-shadow-lg" />
          <h1 className="text-5xl md:text-6xl font-bold text-secondary-900 tracking-tight mb-4">
            Atende<span className="text-primary-600">+</span>
          </h1>
          <p className="text-xl text-secondary-500 max-w-2xl mx-auto font-light">
            Sistema Inteligente de Gerenciamento de Filas
          </p>
          <div className="mt-2 inline-block px-4 py-1 rounded-full bg-secondary-100 text-secondary-500 text-xs font-semibold uppercase tracking-wider">
            Pref. Municipal de Lauro de Freitas
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => {
                if (module.id === 'painel-publico') {
                  window.open(module.path, 'PainelPublico', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
                } else {
                  navigate(module.path);
                }
              }}
              className="group bg-white p-8 rounded-2xl shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-secondary-100 flex flex-col items-start text-left relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <module.icon className="w-24 h-24 text-secondary-900" />
              </div>

              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-md text-white ${module.color} transition-transform group-hover:scale-110 duration-300`}>
                <module.icon className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-bold text-secondary-900 mb-2 group-hover:text-primary-700 transition-colors">{module.title}</h3>
              <p className="text-secondary-500 mb-8 leading-relaxed max-w-[80%]">{module.description}</p>

              <div className="mt-auto flex items-center text-sm font-semibold text-primary-600 group-hover:text-primary-800">
                Acessar Módulo <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-secondary-400 text-sm">
          <p>© 2026 Atende+. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
