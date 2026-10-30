import { OptimisticLockError } from '@mikro-orm/core';
import { dinheiro } from '@cdd/contracts';
import type { ContaId, FundoId, PessoaId, UnidadeId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Conta } from '../../src/modules/financeiro/domain/conta/conta.js';
import { Fundo } from '../../src/modules/financeiro/domain/fundo/fundo.js';
import { Unidade } from '../../src/modules/financeiro/domain/unidade/unidade.js';
import { ehVersaoDesatualizada } from '../../src/shared/infrastructure/banco/classificacao-de-erros-do-banco.js';
import { RESTRICAO_PARA_CODIGO } from '../../src/shared/infrastructure/http/restricao-para-codigo.js';
import { gerarUuidV7 } from '../../src/shared/kernel/ids.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirAmbienteDoFinanceiro } from './apoio.js';
import type { AmbienteDoFinanceiro } from './apoio.js';

function novaConta(sobrescrita: Partial<Parameters<typeof Conta.criar>[0]> = {}): Conta {
  const resultado = Conta.criar({
    id: gerarUuidV7() as ContaId,
    nome: 'CC Itaú',
    descricao: '',
    tipo: 'CONTA_CORRENTE',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    identificadorBancario: null,
    unidadeId: null,
    ...sobrescrita,
  });
  if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);
  return resultado.valor;
}

function novaUnidade(): Unidade {
  const resultado = Unidade.criar({ id: gerarUuidV7() as UnidadeId, codigoSistema: 'CDD', nome: 'CDD', regime: 'CONTRIBUICAO', tetoAnual: null });
  if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);
  return resultado.valor;
}

function novoFundo(contaVinculadaId: ContaId, codigoSistema = 'CAIXINHA'): Fundo {
  const resultado = Fundo.criar({
    id: gerarUuidV7() as FundoId,
    codigoSistema,
    nome: 'Caixinha',
    nota: 'Para a obra',
    contaVinculadaId,
    meta: dinheiro(500_000),
    categoriasPermitidas: ['INSUMOS', 'OBRA'],
  });
  if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);
  return resultado.valor;
}

async function erroDe(operacao: Promise<unknown>): Promise<{ constraint?: string; code?: string }> {
  try {
    await operacao;
  } catch (erro) {
    return erro as { constraint?: string; code?: string };
  }
  throw new Error('a operação deveria ter falhado');
}

describe('repositórios de conta e fundo', () => {
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

  describe('conta', () => {
    it('adicionar grava e porId devolve o mesmo estado, na versão 1', async () => {
      const titular = gerarUuidV7() as PessoaId;
      const conta = novaConta({
        nome: 'CC Nubank Paty',
        descricao: 'Pessoal',
        titularidade: 'PESSOAL_DE_TERCEIRO',
        pessoaTitularId: titular,
        identificadorBancario: '  260/0001/12345-6 ',
      });

      await naInstituicaoA(() => ambiente.contas.adicionar(conta));
      const lida = await naInstituicaoA(() => ambiente.contas.porId(conta.id));

      expect(lida).toMatchObject({
        id: conta.id,
        nome: 'CC Nubank Paty',
        descricao: 'Pessoal',
        tipo: 'CONTA_CORRENTE',
        titularidade: 'PESSOAL_DE_TERCEIRO',
        pessoaTitularId: titular,
        identificadorBancario: '260/0001/12345-6',
        unidadeId: null,
        ativa: true,
        versao: 1,
      });
    });

    it('porId de id inexistente devolve undefined', async () => {
      expect(await naInstituicaoA(() => ambiente.contas.porId(gerarUuidV7() as ContaId))).toBeUndefined();
    });

    it('salvar grava a alteração, devolve a nova versão e mantém tipo e titularidade', async () => {
      const unidade = novaUnidade();
      await naInstituicaoA(() => ambiente.unidades.adicionar(unidade));
      const conta = novaConta({ identificadorBancario: '341/1' });
      await naInstituicaoA(() => ambiente.contas.adicionar(conta));

      conta.alterar({ nome: 'CC Itaú Munay', descricao: 'Bilheteria', identificadorBancario: null, unidadeId: unidade.id, ativa: false });
      const versao = await naInstituicaoA(() => ambiente.contas.salvar(conta));
      const lida = await naInstituicaoA(() => ambiente.contas.porId(conta.id));

      expect(versao).toBe(2);
      expect(lida).toMatchObject({
        nome: 'CC Itaú Munay',
        descricao: 'Bilheteria',
        tipo: 'CONTA_CORRENTE',
        titularidade: 'INSTITUCIONAL',
        identificadorBancario: null,
        unidadeId: unidade.id,
        ativa: false,
        versao: 2,
      });
    });

    it('trava otimista · salvar sobre versão que já mudou falha como versão desatualizada e não grava', async () => {
      const conta = novaConta();
      await naInstituicaoA(() => ambiente.contas.adicionar(conta));
      const copiaA = (await naInstituicaoA(() => ambiente.contas.porId(conta.id)))!;
      const copiaB = (await naInstituicaoA(() => ambiente.contas.porId(conta.id)))!;
      const alteracao = { descricao: '', identificadorBancario: null, unidadeId: null, ativa: true };
      copiaA.alterar({ ...alteracao, nome: 'Primeira' });
      copiaB.alterar({ ...alteracao, nome: 'Segunda' });
      await naInstituicaoA(() => ambiente.contas.salvar(copiaA));

      const erro = await erroDe(naInstituicaoA(() => ambiente.contas.salvar(copiaB)));

      expect(erro).toBeInstanceOf(OptimisticLockError);
      expect(ehVersaoDesatualizada(erro)).toBe(true);
      expect((await naInstituicaoA(() => ambiente.contas.porId(conta.id)))?.nome).toBe('Primeira');
    });

    it.each([
      ['espaço interno', '341/1', '341 /1'],
      ['caixa diferente', 'ITAU-1', 'itau-1'],
    ])('identificador na forma canônica — %s — bate na única do banco', async (_caso, primeiro, segundo) => {
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ identificadorBancario: primeiro })));

      const erro = await erroDe(naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ identificadorBancario: segundo }))));

      expect(RESTRICAO_PARA_CODIGO[erro.constraint!]).toBe('IDENTIFICADOR_BANCARIO_JA_CADASTRADO');
    });

    it('identificador bancário repetido na instituição bate no índice que o domínio mapeia', async () => {
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ identificadorBancario: '341/1' })));

      const erro = await erroDe(naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ identificadorBancario: ' 341/1 ' }))));

      expect(erro.constraint).toBe('conta_identificador_unico');
      expect(RESTRICAO_PARA_CODIGO[erro.constraint!]).toBe('IDENTIFICADOR_BANCARIO_JA_CADASTRADO');
    });

    it('alterar para o identificador de outra conta da casa bate no mesmo índice', async () => {
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ identificadorBancario: '341/1' })));
      const outra = novaConta({ identificadorBancario: '341/2' });
      await naInstituicaoA(() => ambiente.contas.adicionar(outra));

      outra.alterar({ nome: outra.nome, descricao: '', identificadorBancario: '341/1', unidadeId: null, ativa: true });
      const erro = await erroDe(naInstituicaoA(() => ambiente.contas.salvar(outra)));

      expect(erro.constraint).toBe('conta_identificador_unico');
    });

    it('o mesmo identificador bancário vale em outra instituição', async () => {
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ identificadorBancario: '341/1' })));

      await comContexto(INSTITUICAO_B, () => ambiente.contas.adicionar(novaConta({ identificadorBancario: '341/1' })));

      expect(await comContexto(INSTITUICAO_B, () => ambiente.contas.listar())).toHaveLength(1);
    });

    it('contas sem identificador bancário não colidem', async () => {
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ nome: 'Caixa' })));
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ nome: 'Cofre' })));

      expect(await naInstituicaoA(() => ambiente.contas.listar())).toHaveLength(2);
    });

    it('unidade de outra instituição é recusada pela chave composta', async () => {
      const deB = novaUnidade();
      await comContexto(INSTITUICAO_B, () => ambiente.unidades.adicionar(deB));

      const erro = await erroDe(naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ unidadeId: deB.id }))));

      expect(erro.code).toBe('23503');
    });

    it('listar devolve só as da instituição do contexto, por nome', async () => {
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ nome: 'Cofre' })));
      await naInstituicaoA(() => ambiente.contas.adicionar(novaConta({ nome: 'Caixa' })));
      await comContexto(INSTITUICAO_B, () => ambiente.contas.adicionar(novaConta({ nome: 'Outra casa' })));

      const doA = await naInstituicaoA(() => ambiente.contas.listar());

      expect(doA.map((conta) => conta.nome)).toEqual(['Caixa', 'Cofre']);
    });

    it('RLS · a instituição A não lê nem altera a conta da B', async () => {
      const deB = novaConta({ nome: 'Da B' });
      await comContexto(INSTITUICAO_B, () => ambiente.contas.adicionar(deB));

      expect(await naInstituicaoA(() => ambiente.contas.porId(deB.id))).toBeUndefined();
      deB.alterar({ nome: 'Invadida', descricao: '', identificadorBancario: null, unidadeId: null, ativa: false });
      await expect(naInstituicaoA(() => ambiente.contas.salvar(deB))).rejects.toBeInstanceOf(OptimisticLockError);
      const [linha] = await consultarNaInstituicao<{ nome: string }>(banco, INSTITUICAO_B, 'select nome from financeiro.conta');
      expect(linha).toEqual({ nome: 'Da B' });
    });
  });

  describe('fundo', () => {
    async function contaDaCasaA(): Promise<Conta> {
      const conta = novaConta({ tipo: 'FUNDO', nome: 'Conta da caixinha' });
      await naInstituicaoA(() => ambiente.contas.adicionar(conta));
      return conta;
    }

    it('adicionar grava meta e categorias, e porId devolve o mesmo estado', async () => {
      const conta = await contaDaCasaA();
      const fundo = novoFundo(conta.id);

      await naInstituicaoA(() => ambiente.fundos.adicionar(fundo));
      const lido = await naInstituicaoA(() => ambiente.fundos.porId(fundo.id));

      expect(lido).toMatchObject({
        id: fundo.id,
        codigoSistema: 'CAIXINHA',
        nome: 'Caixinha',
        nota: 'Para a obra',
        contaVinculadaId: conta.id,
        meta: 500_000,
        categoriasPermitidas: ['INSUMOS', 'OBRA'],
        ativo: true,
        versao: 1,
      });
    });

    it('o fundo sem meta nem categorias volta com meta nula e lista vazia', async () => {
      const conta = await contaDaCasaA();
      const resultado = Fundo.criar({
        id: gerarUuidV7() as FundoId,
        codigoSistema: 'VAZIO',
        nome: 'Vazio',
        nota: '',
        contaVinculadaId: conta.id,
        meta: null,
        categoriasPermitidas: [],
      });
      if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);

      await naInstituicaoA(() => ambiente.fundos.adicionar(resultado.valor));

      expect(await naInstituicaoA(() => ambiente.fundos.porId(resultado.valor.id))).toMatchObject({ meta: null, categoriasPermitidas: [] });
    });

    it('salvar grava a alteração, inclusive a troca de conta vinculada, mantém o código e trava a versão', async () => {
      const conta = await contaDaCasaA();
      const outraConta = await contaDaCasaA();
      const fundo = novoFundo(conta.id);
      await naInstituicaoA(() => ambiente.fundos.adicionar(fundo));
      const copiaA = (await naInstituicaoA(() => ambiente.fundos.porId(fundo.id)))!;
      const copiaB = (await naInstituicaoA(() => ambiente.fundos.porId(fundo.id)))!;
      copiaA.alterar({ nome: 'Reserva', contaVinculadaId: outraConta.id, nota: '', meta: null, categoriasPermitidas: ['OBRA'], ativo: false });
      copiaB.alterar({ nome: 'Outro', contaVinculadaId: conta.id, nota: '', meta: null, categoriasPermitidas: [], ativo: true });

      expect(await naInstituicaoA(() => ambiente.fundos.salvar(copiaA))).toBe(2);
      const erro = await erroDe(naInstituicaoA(() => ambiente.fundos.salvar(copiaB)));

      expect(erro).toBeInstanceOf(OptimisticLockError);
      expect(ehVersaoDesatualizada(erro)).toBe(true);
      expect(await naInstituicaoA(() => ambiente.fundos.porId(fundo.id))).toMatchObject({
        codigoSistema: 'CAIXINHA',
        contaVinculadaId: outraConta.id,
        nome: 'Reserva',
        meta: null,
        categoriasPermitidas: ['OBRA'],
        ativo: false,
        versao: 2,
      });
    });

    it('código de sistema repetido bate na restrição que o domínio mapeia', async () => {
      const conta = await contaDaCasaA();
      await naInstituicaoA(() => ambiente.fundos.adicionar(novoFundo(conta.id)));

      const erro = await erroDe(naInstituicaoA(() => ambiente.fundos.adicionar(novoFundo(conta.id))));

      expect(erro.constraint).toBe('fundo_codigo_unico');
      expect(RESTRICAO_PARA_CODIGO[erro.constraint!]).toBe('CODIGO_DE_SISTEMA_JA_EXISTE');
    });

    it('conta vinculada de outra instituição é recusada pela chave composta', async () => {
      const deB = novaConta();
      await comContexto(INSTITUICAO_B, () => ambiente.contas.adicionar(deB));

      const erro = await erroDe(naInstituicaoA(() => ambiente.fundos.adicionar(novoFundo(deB.id))));

      expect(erro.code).toBe('23503');
    });

    it('RLS · listar não mostra o fundo de outra instituição', async () => {
      const deB = novaConta();
      await comContexto(INSTITUICAO_B, () => ambiente.contas.adicionar(deB));
      await comContexto(INSTITUICAO_B, () => ambiente.fundos.adicionar(novoFundo(deB.id)));

      expect(await naInstituicaoA(() => ambiente.fundos.listar())).toEqual([]);
      expect(await comContexto(INSTITUICAO_B, () => ambiente.fundos.listar())).toHaveLength(1);
    });
  });
});
