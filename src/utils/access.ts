import type { Usuario } from '../context/SenhasContext';

export type ModuleKey = 'atendente' | 'gerador' | 'admin';

export function canAccessModule(user: Usuario | null, moduleKey: ModuleKey): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;

  switch (moduleKey) {
    case 'atendente':
      return user.funcao === 'Atendente';
    case 'gerador':
      return user.funcao === 'Gerador';
    case 'admin':
      return user.funcao === 'Administrador';
    default:
      return false;
  }
}
