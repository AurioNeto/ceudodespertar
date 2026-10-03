import type { CodigoDeErro, InstituicaoId, Permissao, UsuarioId } from '@cdd/contracts';
import type { IdentidadeAutenticada } from './identidade-autenticada.js';

export type CodigoDeRecusa = Extract<
  CodigoDeErro,
  'USUARIO_DESCONHECIDO' | 'USUARIO_CONVITE_PENDENTE' | 'USUARIO_SUSPENSO' | 'USUARIO_REVOGADO'
>;

export interface ContextoDeAcesso {
  readonly recusada: false;
  readonly usuarioId: UsuarioId;
  readonly instituicaoId: InstituicaoId;
  readonly permissoes: ReadonlySet<Permissao>;
}

export interface RecusaDeAcesso {
  readonly recusada: true;
  readonly codigo: CodigoDeRecusa;
}

export function recusarAcesso(codigo: CodigoDeRecusa): RecusaDeAcesso {
  return { recusada: true, codigo };
}

export function criarContextoDeAcesso(dados: Omit<ContextoDeAcesso, 'recusada'>): ContextoDeAcesso {
  return { recusada: false, ...dados };
}

export abstract class ResolvedorDeContextoDeAcesso {
  abstract resolver(identidade: IdentidadeAutenticada): Promise<ContextoDeAcesso | RecusaDeAcesso>;
}
