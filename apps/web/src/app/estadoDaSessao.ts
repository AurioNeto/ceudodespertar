import type { Eu } from '@cdd/contracts';
import { ErroDaApi } from '../dados/erros';

export type CodigoDeRecusa =
  | 'USUARIO_CONVITE_PENDENTE'
  | 'USUARIO_SUSPENSO'
  | 'USUARIO_REVOGADO'
  | 'USUARIO_DESCONHECIDO';

export type EstadoDaSessao =
  | { readonly tipo: 'verificando' }
  | { readonly tipo: 'sem-sessao' }
  | { readonly tipo: 'ativa'; readonly eu: Eu }
  | { readonly tipo: 'recusada'; readonly codigo: CodigoDeRecusa }
  | { readonly tipo: 'indisponivel' }
  | { readonly tipo: 'falha' };

const CODIGOS_DE_RECUSA: ReadonlySet<string> = new Set<CodigoDeRecusa>([
  'USUARIO_CONVITE_PENDENTE',
  'USUARIO_SUSPENSO',
  'USUARIO_REVOGADO',
  'USUARIO_DESCONHECIDO',
]);

function ehCodigoDeRecusa(codigo: string): codigo is CodigoDeRecusa {
  return CODIGOS_DE_RECUSA.has(codigo);
}

export function estadoDoErroDoEu(erro: unknown): EstadoDaSessao {
  if (!(erro instanceof ErroDaApi)) return { tipo: 'falha' };
  if (erro.ehIndisponibilidadeTemporaria) return { tipo: 'indisponivel' };
  if (erro.ehFalhaDeAutenticacao) return { tipo: 'sem-sessao' };
  if (erro.status === 401 && ehCodigoDeRecusa(erro.codigo)) {
    return { tipo: 'recusada', codigo: erro.codigo };
  }
  return { tipo: 'falha' };
}

export interface UsuarioDaSessao {
  readonly id: Eu['usuario']['id'];
  readonly nome: string;
  readonly email: string;
  readonly grupoNome: string;
}

export function usuarioDaSessao(eu: Eu): UsuarioDaSessao {
  return {
    id: eu.usuario.id,
    nome: eu.usuario.nome,
    email: eu.usuario.email,
    grupoNome: eu.grupos.map((grupo) => grupo.nome).join(', '),
  };
}
