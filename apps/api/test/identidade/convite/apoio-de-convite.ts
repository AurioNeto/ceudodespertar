import { createHash } from 'node:crypto';
import { EnviadorDeConvite } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import type { ConviteParaEnviar } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { SemeadorDeGruposDeSistema } from '../../../src/modules/identidade/public-api.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { consultarNaInstituicao } from '../apoio.js';

const TABELAS_QUE_NAO_PODEM_TER_O_TOKEN = [
  'identidade.usuario',
  'identidade.usuario_grupo',
  'identidade.convite',
  'identidade.registro_de_auditoria',
  'shared.outbox',
  'shared.chave_de_idempotencia',
] as const;

export class EnviadorQueGuardaEnvios extends EnviadorDeConvite {
  readonly enviados: ConviteParaEnviar[] = [];
  readonly instantaneosDoBanco: Array<Promise<number>> = [];
  falharCom: Error | undefined;

  constructor(private readonly usuariosVisiveisNoBanco: (convite: ConviteParaEnviar) => Promise<number>) {
    super();
  }

  enviar(convite: ConviteParaEnviar): Promise<void> {
    this.enviados.push(convite);
    this.instantaneosDoBanco.push(this.usuariosVisiveisNoBanco(convite));
    return this.falharCom === undefined ? Promise.resolve() : Promise.reject(this.falharCom);
  }
}

export function enviadorQueSondaOBanco(banco: BancoDeTeste, instituicaoId: string): EnviadorQueGuardaEnvios {
  return new EnviadorQueGuardaEnvios(async (convite) => {
    await banco.app.query('begin');
    try {
      await banco.app.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
      const { rows } = await banco.app.query('select count(*)::int as total from identidade.usuario where id = $1', [
        convite.usuarioId,
      ]);
      return (rows[0] as { total: number }).total;
    } finally {
      await banco.app.query('rollback');
    }
  });
}

export function sha256Hex(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}

export async function semearGruposDeSistema(aplicacao: AplicacaoDeAcesso, instituicaoId: string): Promise<void> {
  await aplicacao.app.get(SemeadorDeGruposDeSistema).semear(instituicaoId);
}

export async function gruposDeSistemaPorCodigo(
  banco: BancoDeTeste,
  instituicaoId: string,
): Promise<Map<string, { id: string; nome: string }>> {
  const linhas = await consultarNaInstituicao<{ id: string; nome: string; codigo_sistema: string }>(
    banco,
    instituicaoId,
    'select id, nome, codigo_sistema from identidade.grupo where codigo_sistema is not null',
  );
  return new Map(linhas.map(({ id, nome, codigo_sistema }) => [codigo_sistema, { id, nome }]));
}

export async function tudoQueFoiGravadoEmTexto(banco: BancoDeTeste, instituicaoId: string): Promise<string> {
  const partes: string[] = [];
  for (const tabela of TABELAS_QUE_NAO_PODEM_TER_O_TOKEN) {
    // eslint-disable-next-line no-await-in-loop -- poucas tabelas, na ordem
    const linhas = await consultarNaInstituicao<{ linha: string }>(
      banco,
      instituicaoId,
      `select row_to_json(t)::text as linha from ${tabela} t`,
    );
    partes.push(...linhas.map(({ linha }) => linha));
  }
  return partes.join('\n');
}

export interface ConviteGravado {
  readonly hash: string;
  readonly revogado: boolean;
  readonly expiraEm: Date;
}

export async function convitesDoUsuario(
  banco: BancoDeTeste,
  instituicaoId: string,
  usuarioId: string,
): Promise<ConviteGravado[]> {
  const linhas = await consultarNaInstituicao<{ hash: string; revogado: boolean; expira_em: Date }>(
    banco,
    instituicaoId,
    `select encode(token_sha256, 'hex') as hash, revogado_em is not null as revogado, expira_em
       from identidade.convite where usuario_id = $1 order by criado_em, id`,
    [usuarioId],
  );
  return linhas.map(({ hash, revogado, expira_em }) => ({ hash, revogado, expiraEm: expira_em }));
}

export async function desativarGrupo(banco: BancoDeTeste, instituicaoId: string, grupoId: string): Promise<void> {
  await banco.owner.query('begin');
  try {
    await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
    await banco.owner.query('update identidade.grupo set ativo = false where id = $1', [grupoId]);
    await banco.owner.query('commit');
  } catch (erro) {
    await banco.owner.query('rollback');
    throw erro;
  }
}
