import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { NOME_DO_CABECALHO_DE_IDEMPOTENCIA } from '../../../src/shared/infrastructure/idempotencia/cabecalho-de-idempotencia.js';
import type { Grupo } from '../../../src/modules/identidade/domain/grupo/grupo.js';
import type { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoUsuarioAtivo, semear } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { consultarNaInstituicao } from '../apoio.js';

export const ROTA_USUARIOS = '/api/v1/identidade/usuarios';

export interface PedidoDeEscrita {
  readonly metodo?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly versao?: number | string;
  readonly corpo?: unknown;
  readonly chave?: string;
}

export interface RespostaDeEscrita {
  readonly status: number;
  readonly corpo: Record<string, unknown>;
}

export interface EstadoDoUsuario {
  readonly versao: number;
  readonly situacao: string;
  readonly grupos: readonly string[];
}

export interface RegistroDaTrilha {
  readonly operacao: string;
  readonly autor_usuario_id: string | null;
  readonly correlacao_id: string | null;
  readonly sensivel: boolean;
  readonly detalhes: string;
}

export async function escrever(
  aplicacao: AplicacaoDeAcesso,
  sujeito: string,
  caminho: string,
  { metodo = 'POST', versao, corpo = {}, chave }: PedidoDeEscrita = {},
): Promise<RespostaDeEscrita> {
  const cabecalhos: Record<string, string> = {};
  if (versao !== undefined) cabecalhos['if-match'] = String(versao);
  if (chave !== undefined) cabecalhos[NOME_DO_CABECALHO_DE_IDEMPOTENCIA] = chave;
  const resposta = await aplicacao.pedirComo(sujeito, caminho, { metodo, corpo, cabecalhos });
  return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
}

export async function semearUsuarios(
  aplicacao: AplicacaoDeAcesso,
  instituicaoId: string,
  grupos: readonly Grupo[],
  usuarios: readonly Usuario[],
): Promise<void> {
  const [primeiro, ...demais] = usuarios;
  await semear(aplicacao, instituicaoId, grupos, primeiro!);
  for (const usuario of demais) {
    // eslint-disable-next-line no-await-in-loop -- poucos usuários, na ordem
    await semear(aplicacao, instituicaoId, [], usuario);
  }
}

export function usuarioAtivoEm(sujeito: string, grupos: readonly Grupo[]): Usuario {
  return novoUsuarioAtivo(
    sujeito,
    `Nome de ${sujeito}`,
    grupos.map(({ id }) => id),
  );
}

export async function estadoDoUsuario(
  banco: BancoDeTeste,
  instituicaoId: string,
  usuarioId: UsuarioId,
): Promise<EstadoDoUsuario> {
  const [usuario] = await consultarNaInstituicao<{ versao: number; situacao: string }>(
    banco,
    instituicaoId,
    'select versao, situacao from identidade.usuario where id = $1',
    [usuarioId],
  );
  const grupos = await consultarNaInstituicao<{ grupo_id: GrupoId }>(
    banco,
    instituicaoId,
    'select grupo_id from identidade.usuario_grupo where usuario_id = $1 order by grupo_id',
    [usuarioId],
  );
  return { versao: usuario!.versao, situacao: usuario!.situacao, grupos: grupos.map(({ grupo_id }) => grupo_id) };
}

export function trilhaDoUsuario(
  banco: BancoDeTeste,
  instituicaoId: string,
  usuarioId: UsuarioId,
  operacao: string,
): Promise<RegistroDaTrilha[]> {
  return consultarNaInstituicao<RegistroDaTrilha>(
    banco,
    instituicaoId,
    `select operacao, autor_usuario_id, correlacao_id, sensivel, detalhes::text as detalhes
       from identidade.registro_de_auditoria where agregado_id = $1 and operacao = $2`,
    [usuarioId, operacao],
  );
}

export async function contarTrilha(banco: BancoDeTeste, instituicaoId: string): Promise<number> {
  const [linha] = await consultarNaInstituicao<{ total: number }>(
    banco,
    instituicaoId,
    'select count(*)::int as total from identidade.registro_de_auditoria',
  );
  return linha!.total;
}

export async function contarOutbox(banco: BancoDeTeste, instituicaoId: string): Promise<number> {
  const [linha] = await consultarNaInstituicao<{ total: number }>(
    banco,
    instituicaoId,
    'select count(*)::int as total from shared.outbox',
  );
  return linha!.total;
}

export async function efeitosGravados(
  banco: BancoDeTeste,
  instituicaoId: string,
): Promise<{ trilha: number; outbox: number }> {
  return { trilha: await contarTrilha(banco, instituicaoId), outbox: await contarOutbox(banco, instituicaoId) };
}
