import { OptimisticLockError } from '@mikro-orm/core';
import { dinheiro } from '@cdd/contracts';
import type { CategoriaId, GrupoDeCustoId, UnidadeId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Categoria } from '../../src/modules/financeiro/domain/categoria/categoria.js';
import { GrupoDeCusto } from '../../src/modules/financeiro/domain/grupo-de-custo/grupo-de-custo.js';
import { Unidade } from '../../src/modules/financeiro/domain/unidade/unidade.js';
import { ehVersaoDesatualizada } from '../../src/shared/infrastructure/banco/classificacao-de-erros-do-banco.js';
import { RESTRICAO_PARA_CODIGO } from '../../src/shared/infrastructure/http/restricao-para-codigo.js';
import { ErroDeInstituicaoAusenteNaPersistencia } from '../../src/shared/infrastructure/instituicao-do-contexto.js';
import { gerarUuidV7 } from '../../src/shared/kernel/ids.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirAmbienteDoFinanceiro } from './apoio.js';
import type { AmbienteDoFinanceiro } from './apoio.js';

function novaUnidade(codigoSistema = 'CDD'): Unidade {
  const resultado = Unidade.criar({
    id: gerarUuidV7() as UnidadeId,
    codigoSistema,
    nome: 'Munay',
    regime: 'COMERCIAL',
    tetoAnual: dinheiro(8_100_000),
  });
  if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);
  return resultado.valor;
}

function novoGrupoDeCusto(codigoSistema = 'COZINHA'): GrupoDeCusto {
  return GrupoDeCusto.criar({ id: gerarUuidV7() as GrupoDeCustoId, codigoSistema, nome: 'Cozinha' });
}

function novaCategoria(codigoSistema = 'COMBUSTIVEL', unidadePadraoId: UnidadeId | null = null): Categoria {
  const resultado = Categoria.criar({
    id: gerarUuidV7() as CategoriaId,
    codigoSistema,
    nome: 'Combustível',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    unidadePadraoId,
    linhaRelatorio: 'Deslocamento',
  });
  if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);
  return resultado.valor;
}

async function erroDe(operacao: Promise<unknown>): Promise<{ constraint?: string }> {
  try {
    await operacao;
  } catch (erro) {
    return erro as { constraint?: string };
  }
  throw new Error('a operação deveria ter falhado');
}

describe('repositórios do financeiro', () => {
  let banco: BancoDeTeste;
  let ambiente: AmbienteDoFinanceiro;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    ambiente = await abrirAmbienteDoFinanceiro(banco);
  });

  afterEach(async () => {
    await ambiente.orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  const naInstituicaoA = <T>(fn: () => Promise<T>): Promise<T> => comContexto(INSTITUICAO_A, fn);

  describe('unidade', () => {
    it('adicionar grava e porId devolve o mesmo estado, na versão 1', async () => {
      const unidade = novaUnidade('MUNAY');

      await naInstituicaoA(() => ambiente.unidades.adicionar(unidade));
      const lida = await naInstituicaoA(() => ambiente.unidades.porId(unidade.id));

      expect(lida).toMatchObject({
        id: unidade.id,
        codigoSistema: 'MUNAY',
        nome: 'Munay',
        regime: 'COMERCIAL',
        tetoAnual: 8_100_000,
        ativa: true,
        versao: 1,
      });
    });

    it('porId de id inexistente devolve undefined', async () => {
      expect(await naInstituicaoA(() => ambiente.unidades.porId(gerarUuidV7() as UnidadeId))).toBeUndefined();
    });

    it('salvar grava a alteração, devolve a nova versão e o código de sistema não muda', async () => {
      const unidade = novaUnidade('MUNAY');
      await naInstituicaoA(() => ambiente.unidades.adicionar(unidade));

      unidade.alterar({ nome: 'Munay Música', regime: 'CONTRIBUICAO', tetoAnual: null, ativa: false });
      const versao = await naInstituicaoA(() => ambiente.unidades.salvar(unidade));
      const lida = await naInstituicaoA(() => ambiente.unidades.porId(unidade.id));

      expect(versao).toBe(2);
      expect(lida).toMatchObject({ codigoSistema: 'MUNAY', nome: 'Munay Música', regime: 'CONTRIBUICAO', tetoAnual: null, ativa: false, versao: 2 });
    });

    it('trava otimista · salvar sobre versão que já mudou falha como versão desatualizada e não grava', async () => {
      const unidade = novaUnidade('MUNAY');
      await naInstituicaoA(() => ambiente.unidades.adicionar(unidade));
      const copiaA = (await naInstituicaoA(() => ambiente.unidades.porId(unidade.id)))!;
      const copiaB = (await naInstituicaoA(() => ambiente.unidades.porId(unidade.id)))!;
      copiaA.alterar({ nome: 'Primeira', regime: 'COMERCIAL', tetoAnual: null, ativa: true });
      copiaB.alterar({ nome: 'Segunda', regime: 'COMERCIAL', tetoAnual: null, ativa: true });
      await naInstituicaoA(() => ambiente.unidades.salvar(copiaA));

      const erro = await erroDe(naInstituicaoA(() => ambiente.unidades.salvar(copiaB)));

      expect(erro).toBeInstanceOf(OptimisticLockError);
      expect(ehVersaoDesatualizada(erro)).toBe(true);
      expect((await naInstituicaoA(() => ambiente.unidades.porId(unidade.id)))?.nome).toBe('Primeira');
    });

    it('código de sistema repetido na instituição bate na restrição que o domínio mapeia', async () => {
      await naInstituicaoA(() => ambiente.unidades.adicionar(novaUnidade('MUNAY')));

      const erro = await erroDe(naInstituicaoA(() => ambiente.unidades.adicionar(novaUnidade('MUNAY'))));

      expect(erro.constraint).toBe('unidade_codigo_unico');
      expect(RESTRICAO_PARA_CODIGO[erro.constraint!]).toBe('CODIGO_DE_SISTEMA_JA_EXISTE');
    });

    it('o mesmo código de sistema vale em instituições diferentes', async () => {
      await naInstituicaoA(() => ambiente.unidades.adicionar(novaUnidade('MUNAY')));

      await comContexto(INSTITUICAO_B, () => ambiente.unidades.adicionar(novaUnidade('MUNAY')));

      expect(await comContexto(INSTITUICAO_B, () => ambiente.unidades.listar())).toHaveLength(1);
    });

    it('listar devolve só as da instituição do contexto, por nome', async () => {
      const cdd = novaUnidade('CDD');
      cdd.alterar({ nome: 'Antes', regime: 'COMERCIAL', tetoAnual: null, ativa: true });
      await naInstituicaoA(() => ambiente.unidades.adicionar(cdd));
      await naInstituicaoA(() => ambiente.unidades.adicionar(novaUnidade('MUNAY')));
      await comContexto(INSTITUICAO_B, () => ambiente.unidades.adicionar(novaUnidade('LOJINHA')));

      const doA = await naInstituicaoA(() => ambiente.unidades.listar());

      expect(doA.map((unidade) => unidade.codigoSistema)).toEqual(['CDD', 'MUNAY']);
    });

    it('RLS · a instituição A não lê nem altera a unidade da B', async () => {
      const deB = novaUnidade('MUNAY');
      await comContexto(INSTITUICAO_B, () => ambiente.unidades.adicionar(deB));

      expect(await naInstituicaoA(() => ambiente.unidades.porId(deB.id))).toBeUndefined();
      deB.alterar({ nome: 'Invadida', regime: 'COMERCIAL', tetoAnual: null, ativa: false });
      await expect(naInstituicaoA(() => ambiente.unidades.salvar(deB))).rejects.toBeInstanceOf(OptimisticLockError);
      const [linha] = await consultarNaInstituicao<{ nome: string }>(banco, INSTITUICAO_B, 'select nome from financeiro.unidade');
      expect(linha).toEqual({ nome: 'Munay' });
    });

    it('adicionar sem instituição no contexto falha antes de tocar o banco', async () => {
      await expect(ambiente.unidades.adicionar(novaUnidade())).rejects.toBeInstanceOf(ErroDeInstituicaoAusenteNaPersistencia);
    });
  });

  describe('grupo de custo', () => {
    it('adicionar, alterar e ler de volta, com trava otimista', async () => {
      const grupo = novoGrupoDeCusto();
      await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
      const copiaA = (await naInstituicaoA(() => ambiente.grupos.porId(grupo.id)))!;
      const copiaB = (await naInstituicaoA(() => ambiente.grupos.porId(grupo.id)))!;

      copiaA.alterar({ nome: 'Cozinha central', ativo: false });
      expect(await naInstituicaoA(() => ambiente.grupos.salvar(copiaA))).toBe(2);
      copiaB.alterar({ nome: 'Outra', ativo: true });

      await expect(naInstituicaoA(() => ambiente.grupos.salvar(copiaB))).rejects.toBeInstanceOf(OptimisticLockError);
      expect(await naInstituicaoA(() => ambiente.grupos.porId(grupo.id))).toMatchObject({
        codigoSistema: 'COZINHA',
        nome: 'Cozinha central',
        ativo: false,
        versao: 2,
      });
    });

    it('código de sistema repetido bate na restrição que o domínio mapeia', async () => {
      await naInstituicaoA(() => ambiente.grupos.adicionar(novoGrupoDeCusto()));

      const erro = await erroDe(naInstituicaoA(() => ambiente.grupos.adicionar(novoGrupoDeCusto())));

      expect(erro.constraint).toBe('grupo_de_custo_codigo_unico');
      expect(RESTRICAO_PARA_CODIGO[erro.constraint!]).toBe('CODIGO_DE_SISTEMA_JA_EXISTE');
    });

    it('RLS · listar não mostra o grupo de outra instituição', async () => {
      await comContexto(INSTITUICAO_B, () => ambiente.grupos.adicionar(novoGrupoDeCusto()));

      expect(await naInstituicaoA(() => ambiente.grupos.listar())).toEqual([]);
    });
  });

  describe('categoria', () => {
    it('adicionar grava regimes e unidade padrão, e porId devolve o mesmo estado', async () => {
      const unidade = novaUnidade('MUNAY');
      await naInstituicaoA(() => ambiente.unidades.adicionar(unidade));
      const categoria = novaCategoria('COMBUSTIVEL', unidade.id);

      await naInstituicaoA(() => ambiente.categorias.adicionar(categoria));
      const lida = await naInstituicaoA(() => ambiente.categorias.porId(categoria.id));

      expect(lida).toMatchObject({
        codigoSistema: 'COMBUSTIVEL',
        natureza: 'DESPESA',
        tipo: 'OPERACIONAL',
        regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
        unidadePadraoId: unidade.id,
        linhaRelatorio: 'Deslocamento',
        ativa: true,
        versao: 1,
      });
    });

    it('salvar mantém a natureza e o tipo e trava a versão', async () => {
      const categoria = novaCategoria();
      await naInstituicaoA(() => ambiente.categorias.adicionar(categoria));
      const copiaA = (await naInstituicaoA(() => ambiente.categorias.porId(categoria.id)))!;
      const copiaB = (await naInstituicaoA(() => ambiente.categorias.porId(categoria.id)))!;
      const alteracao = {
        nome: 'Combustível e pedágio',
        regimesPermitidos: ['CONTRIBUICAO' as const],
        unidadePadraoId: null,
        linhaRelatorio: 'Deslocamento',
        ativa: true,
      };
      copiaA.alterar(alteracao);
      copiaB.alterar({ ...alteracao, nome: 'Outro' });

      expect(await naInstituicaoA(() => ambiente.categorias.salvar(copiaA))).toBe(2);
      await expect(naInstituicaoA(() => ambiente.categorias.salvar(copiaB))).rejects.toBeInstanceOf(OptimisticLockError);

      expect(await naInstituicaoA(() => ambiente.categorias.porId(categoria.id))).toMatchObject({
        natureza: 'DESPESA',
        nome: 'Combustível e pedágio',
        tipo: 'OPERACIONAL',
        regimesPermitidos: ['CONTRIBUICAO'],
        versao: 2,
      });
    });

    it('código de sistema repetido bate na restrição que o domínio mapeia', async () => {
      await naInstituicaoA(() => ambiente.categorias.adicionar(novaCategoria()));

      const erro = await erroDe(naInstituicaoA(() => ambiente.categorias.adicionar(novaCategoria())));

      expect(erro.constraint).toBe('categoria_codigo_unico');
      expect(RESTRICAO_PARA_CODIGO[erro.constraint!]).toBe('CODIGO_DE_SISTEMA_JA_EXISTE');
    });

    it('unidade padrão de outra instituição é recusada pela chave composta', async () => {
      const deB = novaUnidade('MUNAY');
      await comContexto(INSTITUICAO_B, () => ambiente.unidades.adicionar(deB));

      const erro = await erroDe(naInstituicaoA(() => ambiente.categorias.adicionar(novaCategoria('COMBUSTIVEL', deB.id))));

      expect(erro).toMatchObject({ code: '23503' });
    });

    it('RLS · listar não mostra a categoria de outra instituição', async () => {
      await comContexto(INSTITUICAO_B, () => ambiente.categorias.adicionar(novaCategoria()));

      expect(await naInstituicaoA(() => ambiente.categorias.listar())).toEqual([]);
      expect(await comContexto(INSTITUICAO_B, () => ambiente.categorias.listar())).toHaveLength(1);
    });
  });
});
