import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CategoriaDoPlano, UnidadeDoPlano } from '@cdd/contracts';
import { INSTITUICAO_A } from '../eventos/apoio.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { GERENTE, idDoCadastro, LEITOR, pedirAoFinanceiro, ROTA_CATEGORIAS, ROTA_UNIDADES, subirAplicacaoDoFinanceiro } from '../financeiro/apoio-http.js';

const CAMPOS_DA_CATEGORIA_DO_PLANO: Record<keyof Required<CategoriaDoPlano>, true> = {
  id: true,
  codigoSistema: true,
  nome: true,
  natureza: true,
  tipo: true,
  regimesPermitidos: true,
  linhaRelatorio: true,
  ativa: true,
  lancamentos: true,
  nota: true,
  unidadePadraoId: true,
  versao: true,
};

const CAMPOS_DA_UNIDADE_DO_PLANO: Record<keyof Required<UnidadeDoPlano>, true> = {
  id: true,
  codigoSistema: true,
  nome: true,
  regime: true,
  documentoFiscal: true,
  tetoFaturamentoAnual: true,
  faturamentoNoAno: true,
  ativa: true,
  nota: true,
  versao: true,
};

const camposEsperados = (campos: Record<string, true>) => Object.keys(campos).toSorted();
const camposDe = (corpo: object) => Object.keys(corpo).toSorted();
const comoItens = <T>(corpo: Record<string, unknown>) => corpo['itens'] as T[];

const formaDaCategoriaDoPlano = {
  id: expect.any(String),
  codigoSistema: expect.any(String),
  nome: expect.any(String),
  natureza: expect.stringMatching(/^(RECEITA|DESPESA)$/),
  tipo: expect.any(String),
  regimesPermitidos: expect.any(Array),
  ativa: expect.any(Boolean),
  lancamentos: 0,
  nota: null,
  versao: expect.any(Number),
};

const formaDaUnidadeDoPlano = {
  id: expect.any(String),
  codigoSistema: expect.any(String),
  nome: expect.any(String),
  regime: expect.stringMatching(/^(CONTRIBUICAO|COMERCIAL)$/),
  documentoFiscal: null,
  faturamentoNoAno: null,
  ativa: expect.any(Boolean),
  nota: null,
  versao: expect.any(Number),
};

describe('Parâmetros no formato da tela (CategoriaDoPlano e UnidadeDoPlano)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    aplicacao = await subirAplicacaoDoFinanceiro(banco);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  const emA = (sujeito: string, caminho: string, pedido = {}) => pedirAoFinanceiro(aplicacao, sujeito, caminho, pedido);
  const unidadeDeA = (codigo: string) => idDoCadastro(banco, INSTITUICAO_A, 'unidade', codigo);

  it('GET categorias — cada item tem exatamente os campos de CategoriaDoPlano, com versao preenchida', async () => {
    const { status, corpo } = await emA(LEITOR, ROTA_CATEGORIAS);

    expect(status).toBe(200);
    expect(Object.keys(corpo)).toEqual(['itens']);
    const itens = comoItens<Record<string, unknown>>(corpo);
    expect(itens.length).toBeGreaterThan(0);
    for (const item of itens) {
      expect(camposDe(item)).toEqual(camposEsperados(CAMPOS_DA_CATEGORIA_DO_PLANO));
      expect(item).toMatchObject(formaDaCategoriaDoPlano);
    }
  });

  it('GET unidades — cada item tem exatamente os campos de UnidadeDoPlano, com versao preenchida', async () => {
    const { status, corpo } = await emA(LEITOR, ROTA_UNIDADES);

    expect(status).toBe(200);
    expect(Object.keys(corpo)).toEqual(['itens']);
    const itens = comoItens<Record<string, unknown>>(corpo);
    expect(itens.length).toBeGreaterThan(0);
    for (const item of itens) {
      expect(camposDe(item)).toEqual(camposEsperados(CAMPOS_DA_UNIDADE_DO_PLANO));
      expect(item).toMatchObject(formaDaUnidadeDoPlano);
    }
    expect(itens.find(({ codigoSistema }) => codigoSistema === 'MUNAY')).toMatchObject({ tetoFaturamentoAnual: 8_100_000 });
  });

  it('POST de categoria — responde no mesmo formato da leitura', async () => {
    const criada = await emA(GERENTE, ROTA_CATEGORIAS, {
      metodo: 'POST',
      corpo: {
        codigoSistema: 'ALUGUEL',
        nome: 'Aluguel de espaço',
        natureza: 'RECEITA',
        tipo: 'OPERACIONAL',
        regimesPermitidos: ['CONTRIBUICAO'],
        linhaRelatorio: 'Receita de aluguel',
      },
    });

    expect(criada.status).toBe(201);
    expect(camposDe(criada.corpo)).toEqual(camposEsperados(CAMPOS_DA_CATEGORIA_DO_PLANO));
    expect(criada.corpo).toMatchObject({ ...formaDaCategoriaDoPlano, versao: 1 });
  });

  it('POST e PUT de unidade — respondem no mesmo formato da leitura', async () => {
    const criada = await emA(GERENTE, ROTA_UNIDADES, {
      metodo: 'POST',
      corpo: { codigoSistema: 'OFICINA', nome: 'Oficina', regime: 'COMERCIAL', tetoAnual: 5_000_000 },
    });
    const editada = await emA(GERENTE, `${ROTA_UNIDADES}/${criada.corpo['id'] as string}`, {
      metodo: 'PUT',
      versao: criada.corpo['versao'] as number,
      corpo: { nome: 'Oficina nova', regime: 'COMERCIAL', tetoAnual: 6_000_000, ativa: true },
    });

    expect([criada.status, editada.status]).toEqual([201, 200]);
    for (const { corpo } of [criada, editada]) {
      expect(camposDe(corpo)).toEqual(camposEsperados(CAMPOS_DA_UNIDADE_DO_PLANO));
      expect(corpo).toMatchObject(formaDaUnidadeDoPlano);
    }
    expect(editada.corpo).toMatchObject({ nome: 'Oficina nova', tetoFaturamentoAnual: 6_000_000, versao: 2 });
  });

  it('GET seguido de PUT com a versão e a unidade padrão lidas — preserva a unidade padrão', async () => {
    const cdd = await unidadeDeA('CDD');
    await emA(GERENTE, ROTA_CATEGORIAS, {
      metodo: 'POST',
      corpo: {
        codigoSistema: 'ALUGUEL',
        nome: 'Aluguel de espaço',
        natureza: 'RECEITA',
        tipo: 'OPERACIONAL',
        regimesPermitidos: ['CONTRIBUICAO'],
        unidadePadraoId: cdd,
        linhaRelatorio: 'Receita de aluguel',
      },
    });
    const lida = comoItens<CategoriaDoPlano>((await emA(LEITOR, ROTA_CATEGORIAS)).corpo).find(
      ({ codigoSistema }) => codigoSistema === 'ALUGUEL',
    )!;

    const editada = await emA(GERENTE, `${ROTA_CATEGORIAS}/${lida.id}`, {
      metodo: 'PUT',
      versao: lida.versao,
      corpo: {
        nome: 'Aluguel do salão',
        regimesPermitidos: lida.regimesPermitidos,
        unidadePadraoId: lida.unidadePadraoId,
        linhaRelatorio: lida.linhaRelatorio,
        ativa: lida.ativa,
      },
    });
    const relida = comoItens<CategoriaDoPlano>((await emA(LEITOR, ROTA_CATEGORIAS)).corpo).find(({ id }) => id === lida.id);

    expect(lida).toMatchObject({ unidadePadraoId: cdd, versao: 1 });
    expect(editada.status).toBe(200);
    expect(camposDe(editada.corpo)).toEqual(camposEsperados(CAMPOS_DA_CATEGORIA_DO_PLANO));
    expect(editada.corpo).toMatchObject({ nome: 'Aluguel do salão', unidadePadraoId: cdd, versao: 2 });
    expect(relida).toMatchObject({ nome: 'Aluguel do salão', unidadePadraoId: cdd, versao: 2 });
  });
});
