import { createHash, randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ResolvedorDeConvite } from '../../../src/modules/identidade/application/convite/resolvedor-de-convite.js';
import { ResolvedorDeConviteKysely } from '../../../src/modules/identidade/infrastructure/convite/resolvedor-de-convite.kysely.js';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import {
  encerrarContextoDeEventos,
  INSTITUICAO_A,
  INSTITUICAO_B,
  semearInstituicoes,
  subirContextoDeEventos,
} from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';

const USUARIO_DE_A = '11111111-1111-4111-8111-111111111111';
const USUARIO_COM_CONVITE_EXPIRADO = '33333333-3333-4333-8333-333333333333';
const USUARIO_DE_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_VIGENTE = 'token-vigente-de-a';
const TOKEN_EXPIRADO = 'token-expirado-de-a';
const TOKEN_USADO = 'token-usado-de-a';
const TOKEN_REVOGADO = 'token-revogado-de-a';
const TOKEN_DE_B = 'token-de-b';

const sha256Hex = (texto: string): string => createHash('sha256').update(texto).digest('hex');

async function naInstituicao<T>(banco: BancoDeTeste, instituicaoId: string, tarefa: () => Promise<T>): Promise<T> {
  await banco.owner.query('begin');
  try {
    await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
    const resultado = await tarefa();
    await banco.owner.query('commit');
    return resultado;
  } catch (erro) {
    await banco.owner.query('rollback');
    throw erro;
  }
}

async function semearUsuarioComConvite(
  banco: BancoDeTeste,
  instituicaoId: string,
  usuarioId: string,
  convites: ReadonlyArray<{ token: string; expiraEm: string; usadoEm?: string; revogadoEm?: string }>,
): Promise<void> {
  await naInstituicao(banco, instituicaoId, async () => {
    await banco.owner.query(
      `insert into identidade.usuario (id, instituicao_id, nome, email, situacao)
       values ($1, $2, 'Pessoa', $3, 'CONVITE_PENDENTE')`,
      [usuarioId, instituicaoId, `${randomUUID()}@casa.org`],
    );
    for (const convite of convites) {
      // eslint-disable-next-line no-await-in-loop -- poucas linhas, na ordem
      await banco.owner.query(
        `insert into identidade.convite (usuario_id, instituicao_id, token_sha256, expira_em, usado_em, revogado_em, criado_por)
         values ($1, $2, decode($3, 'hex'), $4, $5, $6, $1)`,
        [
          usuarioId,
          instituicaoId,
          sha256Hex(convite.token),
          convite.expiraEm,
          convite.usadoEm ?? null,
          convite.revogadoEm ?? null,
        ],
      );
    }
  });
}

describe('resolução do convite pelo hash do token, sem instituição no contexto', () => {
  let banco: BancoDeTeste;
  let app: INestApplicationContext;
  let resolvedor: ResolvedorDeConvite;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    await semearUsuarioComConvite(banco, INSTITUICAO_A, USUARIO_DE_A, [
      { token: TOKEN_USADO, expiraEm: '2099-01-01T00:00:00Z', usadoEm: '2026-01-01T00:00:00Z' },
      { token: TOKEN_REVOGADO, expiraEm: '2099-01-01T00:00:00Z', revogadoEm: '2026-01-01T00:00:00Z' },
      { token: TOKEN_VIGENTE, expiraEm: '2099-01-01T00:00:00Z' },
    ]);
    await semearUsuarioComConvite(banco, INSTITUICAO_A, USUARIO_COM_CONVITE_EXPIRADO, [
      { token: TOKEN_EXPIRADO, expiraEm: '2020-01-01T00:00:00Z' },
    ]);
    await semearUsuarioComConvite(banco, INSTITUICAO_B, USUARIO_DE_B, [
      { token: TOKEN_DE_B, expiraEm: '2099-01-01T00:00:00Z' },
    ]);
    app = await subirContextoDeEventos(banco, [{ provide: ResolvedorDeConvite, useClass: ResolvedorDeConviteKysely }]);
    resolvedor = app.get(ResolvedorDeConvite);
  });

  afterEach(async () => {
    await encerrarContextoDeEventos(app);
    await derrubarBancoDeTeste(banco);
  });

  it('resolve o convite vigente para a instituição e o usuário donos do token', async () => {
    expect(await resolvedor.resolver(sha256Hex(TOKEN_VIGENTE))).toEqual({
      instituicaoId: INSTITUICAO_A,
      usuarioId: USUARIO_DE_A,
    });
  });

  it('resolve o convite da outra instituição para a casa dela, sem depender de contexto', async () => {
    expect(await resolvedor.resolver(sha256Hex(TOKEN_DE_B))).toEqual({
      instituicaoId: INSTITUICAO_B,
      usuarioId: USUARIO_DE_B,
    });
  });

  it('hash inexistente não resolve', async () => {
    expect(await resolvedor.resolver(sha256Hex('token-que-nunca-foi-emitido'))).toBeUndefined();
  });

  it.each([
    ['vazio', ''],
    ['curto', 'ab'],
    ['maiúsculo', sha256Hex(TOKEN_VIGENTE).toUpperCase()],
    ['com sufixo hexadecimal', `${sha256Hex(TOKEN_VIGENTE)}00`],
    ['com sufixo não hexadecimal', `${sha256Hex(TOKEN_VIGENTE)}zz`],
    ['com prefixo do hash real', sha256Hex(TOKEN_VIGENTE).slice(0, 32)],
    ['não hexadecimal', 'z'.repeat(64)],
  ])('hash %s não resolve', async (_descricao, hash) => {
    expect(await resolvedor.resolver(hash)).toBeUndefined();
  });

  it.each([
    ['expirado', TOKEN_EXPIRADO, USUARIO_COM_CONVITE_EXPIRADO],
    ['usado', TOKEN_USADO, USUARIO_DE_A],
    ['revogado', TOKEN_REVOGADO, USUARIO_DE_A],
  ])('convite %s ainda devolve só o dono, a validade fica para o domínio', async (_situacao, token, usuarioId) => {
    expect(await resolvedor.resolver(sha256Hex(token))).toEqual({
      instituicaoId: INSTITUICAO_A,
      usuarioId,
    });
  });

  it('o papel da aplicação não lê identidade.convite diretamente sem contexto', async () => {
    const { rows } = await banco.app.query('select count(*)::int as total from identidade.convite');

    expect(rows).toEqual([{ total: 0 }]);
  });

  it('o papel da aplicação, com uma casa no contexto, não enxerga o convite de outra casa', async () => {
    await banco.app.query('begin');
    try {
      await banco.app.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, INSTITUICAO_B]);
      const { rows } = await banco.app.query('select encode(token_sha256, $1) as hash from identidade.convite', ['hex']);

      expect(rows).toEqual([{ hash: sha256Hex(TOKEN_DE_B) }]);
    } finally {
      await banco.app.query('rollback');
    }
  });

  it('o papel da aplicação não assume o papel resolvedor para ler a tabela', async () => {
    await expect(banco.app.query('set role cdd_resolvedor_identidade')).rejects.toThrow(/permission denied/);
  });
});
