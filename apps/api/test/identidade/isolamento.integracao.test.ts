import { OptimisticLockError } from '@mikro-orm/core';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { gerarUuidV7 } from '../../src/shared/kernel/ids.js';
import { ErroDeInstituicaoAusenteNaPersistencia } from '../../src/modules/identidade/infrastructure/persistencia/instituicao-do-contexto.js';
import {
  abrirAmbienteDaIdentidade,
  AUTOR,
  consultarNaInstituicao,
  novoGrupo,
  novoUsuarioConvidado,
} from './apoio.js';
import type { AmbienteDaIdentidade } from './apoio.js';

const DEPOIS = new Date('2026-03-02T10:00:00.000Z');
const CODIGO_DE_VIOLACAO_DE_RLS = '42501';
const CODIGO_DE_VIOLACAO_DE_CHAVE_ESTRANGEIRA = '23503';
const CHAVE_ESTRANGEIRA_DO_GRUPO_DO_USUARIO = 'usuario_grupo_grupo_fk';

describe('isolamento por instituição da persistência da identidade', () => {
  let banco: BancoDeTeste;
  let ambiente: AmbienteDaIdentidade;
  let usuarioDeA: UsuarioId;
  let grupoDeA: GrupoId;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    ambiente = await abrirAmbienteDaIdentidade(banco);
    const grupo = novoGrupo();
    const usuario = novoUsuarioConvidado([grupo.id]);
    await comContexto(INSTITUICAO_A, () => ambiente.grupos.adicionar(grupo));
    await comContexto(INSTITUICAO_A, () => ambiente.usuarios.adicionar(usuario));
    usuarioDeA = usuario.id;
    grupoDeA = grupo.id;
  });

  afterEach(async () => {
    await ambiente.orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  async function usuarioNoBanco(): Promise<{ situacao: string; versao: number } | undefined> {
    const [linha] = await consultarNaInstituicao<{ situacao: string; versao: number }>(
      banco,
      INSTITUICAO_A,
      'select situacao, versao from identidade.usuario where id = $1',
      [usuarioDeA],
    );
    return linha;
  }

  it('o contexto da instituição dona lê o usuário e o grupo', async () => {
    expect(await comContexto(INSTITUICAO_A, () => ambiente.usuarios.porId(usuarioDeA))).toBeDefined();
    expect(await comContexto(INSTITUICAO_A, () => ambiente.grupos.porId(grupoDeA))).toBeDefined();
  });

  it('o contexto de outra instituição não lê usuário nem grupo', async () => {
    expect(await comContexto(INSTITUICAO_B, () => ambiente.usuarios.porId(usuarioDeA))).toBeUndefined();
    expect(await comContexto(INSTITUICAO_B, () => ambiente.grupos.porId(grupoDeA))).toBeUndefined();
  });

  it('sem contexto de instituição, nada é lido', async () => {
    expect(await ambiente.usuarios.porId(usuarioDeA)).toBeUndefined();
    expect(await ambiente.grupos.porId(grupoDeA)).toBeUndefined();
  });

  it('o contexto de outra instituição não escreve no usuário nem no grupo alheios', async () => {
    const usuario = (await comContexto(INSTITUICAO_A, () => ambiente.usuarios.porId(usuarioDeA)))!;
    usuario.desativar(AUTOR, 'motivo', DEPOIS);
    const grupo = (await comContexto(INSTITUICAO_A, () => ambiente.grupos.porId(grupoDeA)))!;
    grupo.excluir(0, AUTOR, DEPOIS);

    await expect(comContexto(INSTITUICAO_B, () => ambiente.usuarios.salvar(usuario))).rejects.toBeInstanceOf(
      OptimisticLockError,
    );
    await expect(comContexto(INSTITUICAO_B, () => ambiente.grupos.salvar(grupo))).rejects.toBeInstanceOf(
      OptimisticLockError,
    );

    expect(await usuarioNoBanco()).toEqual({ situacao: 'CONVITE_PENDENTE', versao: 1 });
    const [grupoNoBanco] = await consultarNaInstituicao<{ ativo: boolean; versao: number }>(
      banco,
      INSTITUICAO_A,
      'select ativo, versao from identidade.grupo where id = $1',
      [grupoDeA],
    );
    expect(grupoNoBanco).toEqual({ ativo: true, versao: 1 });
  });

  it('escrever sem instituição no contexto falha antes de tocar o banco', async () => {
    const usuario = (await comContexto(INSTITUICAO_A, () => ambiente.usuarios.porId(usuarioDeA)))!;
    usuario.desativar(AUTOR, 'motivo', DEPOIS);

    await expect(ambiente.usuarios.adicionar(novoUsuarioConvidado())).rejects.toBeInstanceOf(
      ErroDeInstituicaoAusenteNaPersistencia,
    );
    await expect(ambiente.usuarios.salvar(usuario)).rejects.toBeInstanceOf(ErroDeInstituicaoAusenteNaPersistencia);
    await expect(ambiente.grupos.adicionar(novoGrupo())).rejects.toBeInstanceOf(
      ErroDeInstituicaoAusenteNaPersistencia,
    );
  });

  it('usuário de uma instituição não aceita grupo de outra, mesmo sabendo o id', async () => {
    const intruso = novoUsuarioConvidado([grupoDeA]);

    await expect(comContexto(INSTITUICAO_B, () => ambiente.usuarios.adicionar(intruso))).rejects.toMatchObject({
      code: CODIGO_DE_VIOLACAO_DE_CHAVE_ESTRANGEIRA,
      constraint: CHAVE_ESTRANGEIRA_DO_GRUPO_DO_USUARIO,
    });

    const naB = await comContexto(INSTITUICAO_B, () => ambiente.usuarios.porId(intruso.id));
    expect(naB).toBeUndefined();
  });

  it('o papel da aplicação não grava linha de outra instituição, nem com contexto', async () => {
    await banco.app.query('begin');
    try {
      await banco.app.query(`select set_config('app.instituicao_id', $1, true)`, [INSTITUICAO_A]);
      await expect(
        banco.app.query(
          `insert into identidade.grupo (id, instituicao_id, nome) values ($1, $2, 'Invasor')`,
          [gerarUuidV7(), INSTITUICAO_B],
        ),
      ).rejects.toMatchObject({ code: CODIGO_DE_VIOLACAO_DE_RLS });
    } finally {
      await banco.app.query('rollback');
    }
  });

  it('o papel da aplicação sem contexto enxerga zero linhas das tabelas da identidade', async () => {
    for (const tabela of ['usuario', 'grupo', 'convite', 'usuario_grupo', 'grupo_permissao']) {
      // eslint-disable-next-line no-await-in-loop -- um cliente só; consultas em sequência
      const resultado = await banco.app.query(`select count(*)::int as total from identidade.${tabela}`);
      expect(resultado.rows[0], tabela).toEqual({ total: 0 });
    }
  });
});
