import { OptimisticLockError } from '@mikro-orm/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { comContexto, INSTITUICAO_A, semearInstituicoes } from '../eventos/apoio.js';
import { ehVersaoDesatualizada } from '../../src/shared/infrastructure/banco/classificacao-de-erros-do-banco.js';
import type { Grupo } from '../../src/modules/identidade/domain/grupo/grupo.js';
import type { Usuario } from '../../src/modules/identidade/domain/usuario/usuario.js';
import { criarBarreira } from './barreira.js';
import {
  abrirAmbienteDaIdentidade,
  AUTOR,
  consultarNaInstituicao,
  eventosDoOutbox,
  novoGrupo,
  novoUsuarioConvidado,
} from './apoio.js';
import type { AmbienteDaIdentidade } from './apoio.js';

const DEPOIS = new Date('2026-03-02T10:00:00.000Z');
const SUBJECT = 'sub-keycloak-1';
const DUAS_TRANSACOES = 2;

function ehRejeitada(resultado: PromiseSettledResult<unknown>): resultado is PromiseRejectedResult {
  return resultado.status === 'rejected';
}

async function versaoNoBanco(banco: BancoDeTeste, tabela: string, id: string): Promise<number> {
  const [linha] = await consultarNaInstituicao<{ versao: number }>(
    banco,
    INSTITUICAO_A,
    `select versao from identidade.${tabela} where id = $1`,
    [id],
  );
  return linha!.versao;
}

describe('trava otimista dos agregados da identidade', () => {
  let banco: BancoDeTeste;
  let ambiente: AmbienteDaIdentidade;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    ambiente = await abrirAmbienteDaIdentidade(banco);
  });

  afterEach(async () => {
    await ambiente.orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function naInstituicaoA<T>(fn: () => Promise<T>): Promise<T> {
    return comContexto(INSTITUICAO_A, fn);
  }

  it('duas transações que leram o mesmo usuário: uma grava, a outra recebe VERSAO_DESATUALIZADA', async () => {
    const outroGrupo = novoGrupo();
    await naInstituicaoA(() => ambiente.grupos.adicionar(outroGrupo));
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const ativado = (await naInstituicaoA(() => ambiente.usuarios.porId(convidado.id)))!;
    ativado.ativar(convidado.convite!.hashDoToken, SUBJECT, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(ativado));
    const barreira = criarBarreira(DUAS_TRANSACOES);

    const transacaoConcorrente = (alterar: (usuario: Usuario) => void) =>
      naInstituicaoA(() =>
        ambiente.unidadeDeTrabalho.transacao('escrita', async () => {
          const usuario = (await ambiente.usuarios.porId(convidado.id))!;
          await barreira.aguardar();
          alterar(usuario);
          await ambiente.usuarios.salvar(usuario);
        }),
      );
    const resultados = await Promise.allSettled([
      transacaoConcorrente((usuario) => usuario.desativar(AUTOR, 'motivo', DEPOIS)),
      transacaoConcorrente((usuario) => usuario.definirGrupos([outroGrupo.id], AUTOR, DEPOIS)),
    ]);

    const rejeitadas = resultados.filter(ehRejeitada);
    expect(resultados.filter((resultado) => resultado.status === 'fulfilled')).toHaveLength(1);
    expect(rejeitadas).toHaveLength(1);
    expect(rejeitadas[0]!.reason).toBeInstanceOf(OptimisticLockError);
    expect(ehVersaoDesatualizada(rejeitadas[0]!.reason)).toBe(true);
    expect(await versaoNoBanco(banco, 'usuario', convidado.id)).toBe(3);
    const eventos = await eventosDoOutbox(banco, convidado.id);
    expect(eventos).toHaveLength(3);
    expect(eventos.slice(0, 2)).toEqual(['USUARIO_CONVIDADO', 'USUARIO_ATIVADO']);
    expect(['USUARIO_SUSPENSO', 'GRUPO_ALTERADO']).toContain(eventos[2]);
  });

  it('duas transações que leram o mesmo grupo: uma grava, a outra recebe VERSAO_DESATUALIZADA', async () => {
    const grupo = novoGrupo();
    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
    const barreira = criarBarreira(DUAS_TRANSACOES);

    const transacaoConcorrente = (alterar: (grupoLido: Grupo) => void) =>
      naInstituicaoA(() =>
        ambiente.unidadeDeTrabalho.transacao('escrita', async () => {
          const lido = (await ambiente.grupos.porId(grupo.id))!;
          await barreira.aguardar();
          alterar(lido);
          await ambiente.grupos.salvar(lido);
        }),
      );
    const resultados = await Promise.allSettled([
      transacaoConcorrente((lido) => lido.concederPermissao('financeiro.conta.ler', AUTOR, DEPOIS)),
      transacaoConcorrente((lido) => lido.renomear('Outro nome', 'Outra descrição', AUTOR, DEPOIS)),
    ]);

    const rejeitadas = resultados.filter(ehRejeitada);
    expect(rejeitadas).toHaveLength(1);
    expect(rejeitadas[0]!.reason).toBeInstanceOf(OptimisticLockError);
    expect(await versaoNoBanco(banco, 'grupo', grupo.id)).toBe(2);
    expect(await eventosDoOutbox(banco, grupo.id)).toHaveLength(1);
  });

  it('a perdedora não deixa permissão nem renomeação pela metade', async () => {
    const grupo = novoGrupo(['financeiro.lancamento.ler']);
    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
    const barreira = criarBarreira(DUAS_TRANSACOES);

    const resultados = await Promise.allSettled(
      ['financeiro.conta.ler', 'financeiro.dre.ler'].map((permissao) =>
        naInstituicaoA(() =>
          ambiente.unidadeDeTrabalho.transacao('escrita', async () => {
            const lido = (await ambiente.grupos.porId(grupo.id))!;
            await barreira.aguardar();
            lido.concederPermissao(permissao, AUTOR, DEPOIS);
            await ambiente.grupos.salvar(lido);
          }),
        ),
      ),
    );

    expect(resultados.filter(ehRejeitada)).toHaveLength(1);
    const permissoes = await consultarNaInstituicao<{ permissao: string }>(
      banco,
      INSTITUICAO_A,
      'select permissao from identidade.grupo_permissao where grupo_id = $1',
      [grupo.id],
    );
    expect(permissoes).toHaveLength(2);
  });

  it('usuário inexistente na instituição também recusa a escrita como versão desatualizada', async () => {
    const fantasma = novoUsuarioConvidado();

    await expect(naInstituicaoA(() => ambiente.usuarios.salvar(fantasma))).rejects.toBeInstanceOf(OptimisticLockError);
  });
});
