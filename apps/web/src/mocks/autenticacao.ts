import type {
  Convite,
  Credenciais,
  FalhaDeConvite,
  GrupoId,
  PessoaId,
  ResultadoDeEntrada,
  Usuario,
  UsuarioId,
} from '@cdd/contracts';
import { dataHora } from '@cdd/contracts';
import { id } from './ids';
import { usuarioAtual } from './sessao';

/**
 * Autenticação de mentira, com o formato da de verdade.
 *
 * Quem valida senha na v1 é o Keycloak (Doc 1 §4.4) — este módulo existe só
 * para a tela ter contra o que rodar enquanto o backend não existe. Trocar o
 * corpo destas funções por `fetch` é o passo seguinte; as assinaturas ficam.
 *
 * Nada aqui é segurança: as senhas estão em texto puro no bundle de propósito,
 * porque este é um protótipo navegável, e o dia em que este arquivo sair é o
 * mesmo em que a autenticação passa a ser real.
 */

interface ContaDeMentira {
  readonly senha: string;
  readonly usuario: Usuario;
}

const CONTAS: readonly ContaDeMentira[] = [
  { senha: 'despertar', usuario: usuarioAtual },
  {
    senha: 'despertar',
    usuario: {
      id: id<UsuarioId>('u-marilia'),
      pessoaId: id<PessoaId>('p-marilia'),
      nome: 'Marília Prado',
      email: 'marilia@ceudodespertar.org',
      grupoId: id<GrupoId>('g-acolhimento'),
      grupoNome: 'Acolhimento e Organização',
      situacao: 'ATIVO',
      ultimoAcesso: dataHora('2026-09-01T20:40:00-03:00'),
    },
  },
  {
    senha: 'despertar',
    usuario: {
      id: id<UsuarioId>('u-paty'),
      pessoaId: id<PessoaId>('p-paty'),
      nome: 'Patrícia Muniz',
      email: 'paty@ceudodespertar.org',
      grupoId: id<GrupoId>('g-secretaria'),
      grupoNome: 'Secretaria',
      situacao: 'CONVITE_PENDENTE',
      ultimoAcesso: null,
    },
  },
  {
    senha: 'despertar',
    usuario: {
      id: id<UsuarioId>('u-jorge'),
      pessoaId: id<PessoaId>('p-jorge'),
      nome: 'Jorge Almeida',
      email: 'jorge@ceudodespertar.org',
      grupoId: id<GrupoId>('g-registro'),
      grupoNome: 'Registro rápido',
      situacao: 'SUSPENSO',
      ultimoAcesso: dataHora('2026-07-19T11:02:00-03:00'),
    },
  },
  {
    senha: 'despertar',
    usuario: {
      id: id<UsuarioId>('u-antigo'),
      pessoaId: id<PessoaId>('p-antigo'),
      nome: 'Renato Dias',
      email: 'renato@ceudodespertar.org',
      grupoId: id<GrupoId>('g-leitura'),
      grupoNome: 'Leitura',
      situacao: 'REVOGADO',
      ultimoAcesso: dataHora('2026-03-04T09:30:00-03:00'),
    },
  },
];

/** Credenciais que abrem o protótipo — exibidas na própria tela. */
export const CONTA_DEMONSTRACAO = { email: usuarioAtual.email, senha: 'despertar' } as const;

const CONVITES: readonly Convite[] = [
  {
    token: 'convite-paty',
    nome: 'Patrícia Muniz',
    email: 'paty@ceudodespertar.org',
    grupoNome: 'Secretaria',
    convidadoPor: 'Aurio Neto',
    expiraEm: dataHora('2026-09-15T23:59:00-03:00'),
  },
  {
    token: 'convite-vencido',
    nome: 'Tomás Ribeiro',
    email: 'tomas@ceudodespertar.org',
    grupoNome: 'Guardião',
    convidadoPor: 'Marília Prado',
    expiraEm: dataHora('2026-08-01T23:59:00-03:00'),
  },
];

/** Convite que a tela usa quando se chega em /convite sem token. */
export const CONVITE_DEMONSTRACAO = 'convite-paty';

const HOJE = new Date('2026-09-08T12:00:00-03:00');

const espera = <T,>(valor: T, ms = 620): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(valor), ms));

const mesmoEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function entrar({ email, senha }: Credenciais): Promise<ResultadoDeEntrada> {
  const conta = CONTAS.find((c) => mesmoEmail(c.usuario.email, email));

  // E-mail desconhecido e senha errada dão a mesma resposta: dizer qual dos
  // dois falhou entregaria a lista de quem tem acesso à casa.
  if (!conta || conta.senha !== senha) {
    return espera({ ok: false, falha: { tipo: 'CREDENCIAL_INVALIDA' } });
  }

  switch (conta.usuario.situacao) {
    case 'CONVITE_PENDENTE':
      return espera({ ok: false, falha: { tipo: 'CONVITE_PENDENTE', email: conta.usuario.email } });
    case 'SUSPENSO':
      return espera({ ok: false, falha: { tipo: 'SUSPENSO' } });
    case 'REVOGADO':
      return espera({ ok: false, falha: { tipo: 'REVOGADO' } });
    default:
      return espera({ ok: true, usuario: { ...conta.usuario, ultimoAcesso: dataHora(HOJE.toISOString()) } });
  }
}

/**
 * Sempre responde igual, exista o e-mail ou não: a tela seguinte diz "se essa
 * conta existir, o link chegou". Confirmar a existência de um cadastro é
 * vazamento — e aqui o cadastro revela filiação religiosa (Doc 1 §5.6).
 */
export const pedirRedefinicao = (_email: string): Promise<void> => espera(undefined, 700);

export function buscarConvite(token: string): Promise<Convite | FalhaDeConvite> {
  const convite = CONVITES.find((c) => c.token === token);
  if (!convite) return espera<FalhaDeConvite>('INVALIDO', 420);
  if (new Date(convite.expiraEm) < HOJE) return espera<FalhaDeConvite>('EXPIRADO', 420);
  return espera(convite, 420);
}

/** Aceita o convite e devolve a sessão já aberta — quem define a senha entra. */
export function definirSenhaDoConvite(token: string, _senha: string): Promise<ResultadoDeEntrada> {
  const convite = CONVITES.find((c) => c.token === token);
  const conta = convite && CONTAS.find((c) => mesmoEmail(c.usuario.email, convite.email));
  if (!conta) return espera({ ok: false, falha: { tipo: 'INFRAESTRUTURA' } });

  return espera({
    ok: true,
    usuario: { ...conta.usuario, situacao: 'ATIVO', ultimoAcesso: dataHora(HOJE.toISOString()) },
  });
}

/** Redefinição a partir do link do e-mail. O token aqui é decorativo. */
export const redefinirSenha = (_token: string, _senha: string): Promise<void> => espera(undefined, 620);
