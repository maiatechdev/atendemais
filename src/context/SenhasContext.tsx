import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export type StatusSenha = 'aguardando' | 'chamada' | 'atendendo' | 'concluida' | 'cancelada';
export type TipoAtendimento = 'Cadastro Novo' | 'Atualização' | 'Transferência' | 'Solicitação de Visita' | 'Inclusão' | 'Exclusão' | 'Desmembramento' | 'Atendimento Especial';
export type Prioridade = 'normal' | 'prioritaria' | 'prioritaria+';

export interface Senha {
  id: string;
  numero: string;
  nome: string;
  tipo: TipoAtendimento;
  prioridade: Prioridade;
  status: StatusSenha;
  guiche?: number;
  tipoGuiche?: string;
  atendente?: string;
  horaGeracao: Date;
  horaChamada?: Date;
  horaFinalizacao?: Date;
  cpf?: string;
  telefone?: string;
  bairro?: string;
}

export interface Servico {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  funcao: 'Atendente' | 'Gerador' | 'Administrador';
  isAdmin?: boolean;
  isAdmin?: boolean;
  guiche?: number;
  tipoGuiche?: string; // New field
  tiposAtendimento?: string[]; // Defined services for this user
  online?: boolean; // Real-time status
}

interface ChamarSenhaOptions {
  guiche: number;
  tipoGuiche?: string; // New field
  atendente: string;
  tiposPermitidos?: TipoAtendimento[];
}

interface SenhasContextType {
  senhas: Senha[];
  usuarios: Usuario[];
  senhaAtual: Senha | null;
  ultimasSenhas: Senha[];
  gerarSenha: (nome: string, tipo: TipoAtendimento, prioridade: Prioridade, cpf?: string, telefone?: string, bairro?: string) => Promise<Senha>;
  chamarSenha: (options: ChamarSenhaOptions) => void;
  iniciarAtendimento: (senhaId: string) => void;
  finalizarAtendimento: (senhaId: string) => void;
  cancelarSenha: (senhaId: string) => void;
  naoApareceu: (senhaId: string) => void;
  repetirSenha: () => void;
  // Admin Methods
  adicionarUsuario: (usuario: Omit<Usuario, 'id'>) => void;
  editarUsuario: (id: string, usuario: Partial<Usuario> & { senha?: string }) => void;
  excluirUsuario: (id: string) => void;
  resetarFila: () => void;
  // Services Methods
  servicos: Servico[];
  criarServico: (nome: string) => void;
  excluirServico: (id: string) => void;
  toggleServico: (id: string) => void;

  login: (email: string, senha: string) => Promise<{ success: boolean; user?: any; error?: string }>;
  logout: () => void;
  atualizarSessaoAtendente: (userId: string, guiche: number, tipoGuiche: string, tiposAtendimento: string[]) => void;
}

const SenhasContext = createContext<SenhasContextType | undefined>(undefined);

export const useSenhas = () => {
  const context = useContext(SenhasContext);
  if (!context) {
    throw new Error('useSenhas deve ser usado dentro de um SenhasProvider');
  }
  return context;
};

interface SyncMessage {
  type: 'SYNC_STATE';
  payload: {
    senhas: Senha[];
    senhaAtual: Senha | null;
    ultimasSenhas: Senha[];
    contadorNormal: number;
    contadorPrioritaria: number;
  };
}

export const SenhasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [senhas, setSenhas] = useState<Senha[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [senhaAtual, setSenhaAtual] = useState<Senha | null>(null);
  const [ultimasSenhas, setUltimasSenhas] = useState<Senha[]>([]);
  const socketRef = React.useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Conectado ao servidor Socket.io');
      // Fetch initial users
      socket.emit('admin_get_users', (resp: any) => {
        if (resp.success) {
          // Parse tiposAtendimento if necessary
          const parsedUsers = resp.data.map((u: any) => ({
            ...u,
            tiposAtendimento: typeof u.tiposAtendimento === 'string' ? JSON.parse(u.tiposAtendimento) : u.tiposAtendimento
          }));
          setUsuarios(parsedUsers);
        }
      });

      // Fetch initial services
      socket.emit('admin_get_services', (resp: any) => {
        if (resp.success) setServicos(resp.data);
      });
    });

    socket.on('servicesUpdated', (updatedServices: Servico[]) => {
      setServicos(updatedServices);
    });

    socket.on('usersUpdated', (updatedUsers: any[]) => {
      const parsedUsers = updatedUsers.map((u: any) => ({
        ...u,
        tiposAtendimento: typeof u.tiposAtendimento === 'string' ? JSON.parse(u.tiposAtendimento) : u.tiposAtendimento
      }));
      setUsuarios(parsedUsers);
    });

    socket.on('stateUpdated', (payload: SyncMessage['payload']) => {
      const parseDates = (s: any) => ({
        ...s,
        horaGeracao: s.horaGeracao ? new Date(s.horaGeracao) : undefined,
        horaChamada: s.horaChamada ? new Date(s.horaChamada) : undefined,
        horaFinalizacao: s.horaFinalizacao ? new Date(s.horaFinalizacao) : undefined,
      });

      if (payload.senhas) setSenhas(payload.senhas.map(parseDates));
      if (payload.senhaAtual !== undefined) setSenhaAtual(payload.senhaAtual ? parseDates(payload.senhaAtual) : null);
      if (payload.ultimasSenhas) setUltimasSenhas(payload.ultimasSenhas.map(parseDates));
    });

    socket.on('usersUpdated', (users: any[]) => {
      const parsedUsers = users.map((u: any) => ({
        ...u,
        tiposAtendimento: typeof u.tiposAtendimento === 'string' ? JSON.parse(u.tiposAtendimento) : u.tiposAtendimento
      }));
      setUsuarios(parsedUsers);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const gerarSenha = (nome: string, tipo: TipoAtendimento, prioridade: Prioridade, cpf?: string, telefone?: string, bairro?: string): Promise<Senha> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        const temp: Senha = {
          id: 'offline',
          numero: 'OFF',
          nome,
          tipo,
          prioridade,
          cpf,
          telefone,
          bairro,
          status: 'aguardando',
          horaGeracao: new Date()
        };
        return resolve(temp);
      }

      socketRef.current.emit('request_ticket', { nome, tipo, prioridade, cpf, telefone, bairro }, (response: any) => {
        if (response.success && response.data) {
          resolve(response.data);
        } else {
          reject(response.error || 'Erro ao gerar senha');
        }
      });
    });
  };

  const chamarSenha = ({ guiche, atendente, tiposPermitidos, tipoGuiche }: ChamarSenhaOptions) => {
    if (socketRef.current) {
      socketRef.current.emit('call_ticket', { guiche, atendente, tiposPermitidos, tipoGuiche });
    }
  };

  const finalizarAtendimento = (senhaId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('update_ticket_status', { id: senhaId, status: 'concluida' });
    }
  };

  const iniciarAtendimento = (senhaId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('update_ticket_status', { id: senhaId, status: 'atendendo' });
    }
  };

  const cancelarSenha = (senhaId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('update_ticket_status', { id: senhaId, status: 'cancelada' });
    }
  };

  const naoApareceu = (senhaId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('no_show_ticket', { id: senhaId });
    }
  };

  const repetirSenha = () => {
    if (socketRef.current) {
      socketRef.current.emit('repeat_ticket');
    }
  };

  // --- ADMIN ACTIONS ---

  const resetarFila = () => {
    if (socketRef.current) {
      socketRef.current.emit('admin_reset_queue', (response: any) => {
        if (response.success) console.log("Fila resetada.");
        else console.error("Erro reset fila:", response.error);
      });
    }
  };

  const adicionarUsuario = (usuario: Omit<Usuario, 'id'>) => {
    if (socketRef.current) {
      socketRef.current.emit('admin_create_user', usuario, (response: any) => {
        if (response.success) {
          // Refresh users
          socketRef.current?.emit('admin_get_users', (resp: any) => {
            if (resp.success) {
              const parsedUsers = resp.data.map((u: any) => ({
                ...u,
                tiposAtendimento: typeof u.tiposAtendimento === 'string' ? JSON.parse(u.tiposAtendimento) : u.tiposAtendimento
              }));
              setUsuarios(parsedUsers);
            }
          });
        } else {
          console.error("Erro criar user:", response.error);
        }
      });
    }
  };

  const editarUsuario = (id: string, dados: Partial<Usuario> & { senha?: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('admin_update_user', { id, ...dados }, (response: any) => {
        if (response.success) {
          // Refresh users
          socketRef.current?.emit('admin_get_users', (resp: any) => {
            if (resp.success) {
              const parsedUsers = resp.data.map((u: any) => ({
                ...u,
                tiposAtendimento: typeof u.tiposAtendimento === 'string' ? JSON.parse(u.tiposAtendimento) : u.tiposAtendimento
              }));
              setUsuarios(parsedUsers);
            }
          });
        } else {
          console.error("Erro editar user:", response.error);
          alert("Erro ao editar: " + (response.error || 'Erro desconhecido'));
        }
      });
    }
  };

  const excluirUsuario = (id: string) => {
    if (socketRef.current) {
      socketRef.current.emit('admin_delete_user', id, (response: any) => {
        if (response.success) {
          setUsuarios(prev => prev.filter(u => u.id !== id));
        }
      });
    }
  };

  const criarServico = (nome: string) => {
    if (socketRef.current) socketRef.current.emit('admin_create_service', nome);
  };

  const excluirServico = (id: string) => {
    if (socketRef.current) socketRef.current.emit('admin_delete_service', id);
  };

  const toggleServico = (id: string) => {
    if (socketRef.current) socketRef.current.emit('admin_toggle_service', id);
  };

  const login = (email: string, senha: string): Promise<{ success: boolean; user?: any; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        return resolve({ success: false, error: 'Sem conexão com o servidor' });
      }

      // Timeout de segurança caso o servidor não responda (ex: versão antiga rodando)
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Servidor não respondeu. Tente reiniciar o servidor (npm run dev).' });
      }, 5000);

      socketRef.current.emit('login', { email, password: senha }, (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  };

  const logout = () => {
    if (socketRef.current) {
      socketRef.current.emit('logout');
    }
  };

  const atualizarSessaoAtendente = (userId: string, guiche: number, tipoGuiche: string, tiposAtendimento: string[]) => {
    if (socketRef.current) {
      socketRef.current.emit('attendant_update_session', { userId, guiche, tipoGuiche, tiposAtendimento });
    }
  };

  return (
    <SenhasContext.Provider
      value={{
        senhas,
        usuarios,
        senhaAtual,
        ultimasSenhas,
        gerarSenha,
        chamarSenha,
        iniciarAtendimento,
        finalizarAtendimento,
        cancelarSenha,
        naoApareceu,
        adicionarUsuario,
        editarUsuario,
        excluirUsuario,
        repetirSenha,
        resetarFila,
        servicos,
        criarServico,
        excluirServico,
        toggleServico,
        toggleServico,
        login,
        logout,
        atualizarSessaoAtendente
      }}
    >
      {children}
    </SenhasContext.Provider>
  );
};
