import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CATEGORIAS_DA_CASA, GRUPOS_DE_CUSTO_DA_CASA, UNIDADES_DA_CASA } from '../../src/modules/financeiro/domain/cadastros-da-casa.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirAmbienteDoFinanceiro } from './apoio.js';
import type { AmbienteDoFinanceiro } from './apoio.js';

interface Contagens {
  readonly unidades: number;
  readonly grupos: number;
  readonly categorias: number;
}

describe('SemeadorDeCadastrosDaCasa', () => {
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

  async function contagensDe(instituicaoId: string): Promise<Contagens> {
    const [linha] = await consultarNaInstituicao<{ unidades: number; grupos: number; categorias: number }>(
      banco,
      instituicaoId,
      `select (select count(*) from financeiro.unidade)::int as unidades,
              (select count(*) from financeiro.grupo_de_custo)::int as grupos,
              (select count(*) from financeiro.categoria)::int as categorias`,
    );
    return linha!;
  }

  function tabelaDe(instituicaoId: string, tabela: string): Promise<object[]> {
    return consultarNaInstituicao(banco, instituicaoId, `select * from financeiro.${tabela} order by codigo_sistema`);
  }

  it('semeia exatamente o que o dono decidiu, conferido por valores literais e não pela constante do seed', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    expect(
      await consultarNaInstituicao(
        banco,
        INSTITUICAO_A,
        'select codigo_sistema, nome, regime, teto_anual::int as teto_anual from financeiro.unidade order by codigo_sistema',
      ),
    ).toStrictEqual([
      { codigo_sistema: 'CDD', nome: 'CDD', regime: 'CONTRIBUICAO', teto_anual: null },
      { codigo_sistema: 'CHACARA', nome: 'Chácara', regime: 'CONTRIBUICAO', teto_anual: null },
      { codigo_sistema: 'DORMITORIOS', nome: 'Dormitórios', regime: 'CONTRIBUICAO', teto_anual: null },
      { codigo_sistema: 'LOJINHA', nome: 'Lojinha', regime: 'COMERCIAL', teto_anual: null },
      { codigo_sistema: 'MUNAY', nome: 'Munay', regime: 'COMERCIAL', teto_anual: 8_100_000 },
      { codigo_sistema: 'PESSOAL', nome: 'Pessoal', regime: 'CONTRIBUICAO', teto_anual: null },
    ]);
    expect(
      await consultarNaInstituicao(banco, INSTITUICAO_A, 'select codigo_sistema, nome from financeiro.grupo_de_custo order by codigo_sistema'),
    ).toStrictEqual([
      { codigo_sistema: 'CDD', nome: 'CDD' },
      { codigo_sistema: 'CHACARA', nome: 'Chácara' },
      { codigo_sistema: 'COZINHA', nome: 'Cozinha' },
      { codigo_sistema: 'DORMITORIO', nome: 'Dormitório' },
      { codigo_sistema: 'LOJINHA', nome: 'Lojinha' },
      { codigo_sistema: 'SECRETARIA', nome: 'Secretaria' },
    ]);
    expect(
      await consultarNaInstituicao(
        banco,
        INSTITUICAO_A,
        `select codigo_sistema, nome, natureza, tipo,
                array(select r from unnest(regimes_permitidos) as r order by r) as regimes, linha_relatorio
           from financeiro.categoria order by codigo_sistema`,
      ),
    ).toStrictEqual([
      { codigo_sistema: 'ADMINISTRATIVO', nome: 'Administrativo', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL', 'CONTRIBUICAO'], linha_relatorio: 'Administrativo' },
      { codigo_sistema: 'ALIMENTACAO_CERIMONIA', nome: 'Alimentação de cerimônia', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimes: ['CONTRIBUICAO'], linha_relatorio: 'Custo de cerimônia' },
      { codigo_sistema: 'APOIO_RECORRENTE', nome: 'Doações e apoio', natureza: 'RECEITA', tipo: 'OPERACIONAL', regimes: ['CONTRIBUICAO'], linha_relatorio: 'Receita de apoio' },
      { codigo_sistema: 'CACHE_PAGO', nome: 'Cachê a músico', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL'], linha_relatorio: 'Custo da Munay' },
      { codigo_sistema: 'CACHE_RECEBIDO', nome: 'Cachê de contratação', natureza: 'RECEITA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL'], linha_relatorio: 'Receita da Munay' },
      { codigo_sistema: 'COMBUSTIVEL', nome: 'Combustível', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL', 'CONTRIBUICAO'], linha_relatorio: 'Deslocamento' },
      { codigo_sistema: 'CONTRIB_CDD', nome: 'Contribuição de cerimônia', natureza: 'RECEITA', tipo: 'OPERACIONAL', regimes: ['CONTRIBUICAO'], linha_relatorio: 'Receita de contribuição' },
      { codigo_sistema: 'CUSTO_FEITIO', nome: 'Custo de feitio', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimes: ['CONTRIBUICAO'], linha_relatorio: 'Custo de feitio' },
      { codigo_sistema: 'CUSTO_LOJINHA', nome: 'Custo da lojinha', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL'], linha_relatorio: 'Custo da Lojinha' },
      { codigo_sistema: 'HOSPEDAGEM', nome: 'Hospedagem', natureza: 'RECEITA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL', 'CONTRIBUICAO'], linha_relatorio: 'Receita de hospedagem' },
      { codigo_sistema: 'MANUTENCAO', nome: 'Manutenção e zeladoria', natureza: 'DESPESA', tipo: 'MANUTENCAO', regimes: ['COMERCIAL', 'CONTRIBUICAO'], linha_relatorio: 'Manutenção' },
      { codigo_sistema: 'OBRA_DORMITORIO', nome: 'Obra do dormitório', natureza: 'DESPESA', tipo: 'INVESTIMENTO', regimes: ['CONTRIBUICAO'], linha_relatorio: 'Investimento em benfeitoria' },
      { codigo_sistema: 'PRESTADOR', nome: 'Prestadores de serviço', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL', 'CONTRIBUICAO'], linha_relatorio: 'Serviços de terceiros' },
      { codigo_sistema: 'VENDA_MERCADORIA', nome: 'Venda de mercadoria', natureza: 'RECEITA', tipo: 'OPERACIONAL', regimes: ['COMERCIAL'], linha_relatorio: 'Receita da Lojinha' },
    ]);
  });

  it('semeia 6 unidades, 6 grupos de custo e 14 categorias, ativos e na versão 1', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    expect(await contagensDe(INSTITUICAO_A)).toEqual({ unidades: 6, grupos: 6, categorias: 14 });
    const [naoPadrao] = await consultarNaInstituicao<{ total: number }>(
      banco,
      INSTITUICAO_A,
      `select (
         (select count(*) from financeiro.unidade where not ativa or versao <> 1) +
         (select count(*) from financeiro.grupo_de_custo where not ativo or versao <> 1) +
         (select count(*) from financeiro.categoria where not ativa or versao <> 1 or unidade_padrao_id is not null)
       )::int as total`,
    );
    expect(naoPadrao).toEqual({ total: 0 });
  });

  it('as unidades têm regime e teto como a casa decidiu: só a Munay com teto de R$ 81 mil', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    const unidades = await consultarNaInstituicao<{ codigo_sistema: string; nome: string; regime: string; teto_anual: number | null }>(
      banco,
      INSTITUICAO_A,
      'select codigo_sistema, nome, regime, teto_anual::int as teto_anual from financeiro.unidade order by codigo_sistema',
    );
    expect(unidades).toEqual(
      UNIDADES_DA_CASA.map(({ codigoSistema, nome, regime, tetoAnual }) => ({
        codigo_sistema: codigoSistema,
        nome,
        regime,
        teto_anual: tetoAnual,
      })).toSorted((a, b) => a.codigo_sistema.localeCompare(b.codigo_sistema)),
    );
    expect(unidades.find((unidade) => unidade.codigo_sistema === 'MUNAY')?.regime).toBe('COMERCIAL');
  });

  it('grupos de custo e categorias gravam o conteúdo da casa, sem as três legadas da planilha', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    const grupos = await consultarNaInstituicao<{ codigo_sistema: string; nome: string }>(
      banco,
      INSTITUICAO_A,
      'select codigo_sistema, nome from financeiro.grupo_de_custo order by codigo_sistema',
    );
    expect(grupos.map((grupo) => grupo.codigo_sistema)).toEqual(
      GRUPOS_DE_CUSTO_DA_CASA.map((grupo) => grupo.codigoSistema).toSorted(),
    );
    const categorias = await consultarNaInstituicao<{ codigo_sistema: string; regimes_permitidos: string[]; linha_relatorio: string }>(
      banco,
      INSTITUICAO_A,
      'select codigo_sistema, regimes_permitidos, linha_relatorio from financeiro.categoria order by codigo_sistema',
    );
    expect(categorias.map((categoria) => categoria.codigo_sistema)).toEqual(
      CATEGORIAS_DA_CASA.map((categoria) => categoria.codigoSistema).toSorted(),
    );
    const hospedagem = categorias.find((categoria) => categoria.codigo_sistema === 'HOSPEDAGEM');
    expect(hospedagem).toMatchObject({ regimes_permitidos: ['CONTRIBUICAO', 'COMERCIAL'], linha_relatorio: 'Receita de hospedagem' });
    expect(categorias.map((categoria) => categoria.codigo_sistema)).not.toContain('MOVIMENTACAO');
  });

  it('a segunda execução não duplica nem muda nada: mesmos ids, mesmas linhas', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);
    const antes = {
      unidades: await tabelaDe(INSTITUICAO_A, 'unidade'),
      grupos: await tabelaDe(INSTITUICAO_A, 'grupo_de_custo'),
      categorias: await tabelaDe(INSTITUICAO_A, 'categoria'),
    };

    await ambiente.semeador.semear(INSTITUICAO_A);

    expect(await contagensDe(INSTITUICAO_A)).toEqual({ unidades: 6, grupos: 6, categorias: 14 });
    expect({
      unidades: await tabelaDe(INSTITUICAO_A, 'unidade'),
      grupos: await tabelaDe(INSTITUICAO_A, 'grupo_de_custo'),
      categorias: await tabelaDe(INSTITUICAO_A, 'categoria'),
    }).toEqual(antes);
  });

  it('não sobrescreve o que a tesouraria editou nem recria o que ela inativou', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);
    const [munay] = await comContexto(INSTITUICAO_A, () => ambiente.unidades.listar()).then((lista) =>
      lista.filter((unidade) => unidade.codigoSistema === 'MUNAY'),
    );
    munay!.alterar({ nome: 'Munay Música', regime: 'COMERCIAL', tetoAnual: null, ativa: false });
    await comContexto(INSTITUICAO_A, () => ambiente.unidades.salvar(munay!));
    const [cozinha] = await comContexto(INSTITUICAO_A, () => ambiente.grupos.listar()).then((lista) =>
      lista.filter((grupo) => grupo.codigoSistema === 'COZINHA'),
    );
    cozinha!.alterar({ nome: 'Cozinha central', ativo: false });
    await comContexto(INSTITUICAO_A, () => ambiente.grupos.salvar(cozinha!));
    const [combustivel] = await comContexto(INSTITUICAO_A, () => ambiente.categorias.listar()).then((lista) =>
      lista.filter((categoria) => categoria.codigoSistema === 'COMBUSTIVEL'),
    );
    combustivel!.alterar({
      nome: 'Combustível e pedágio',
      regimesPermitidos: ['CONTRIBUICAO'],
      unidadePadraoId: null,
      linhaRelatorio: 'Deslocamento',
      ativa: false,
    });
    await comContexto(INSTITUICAO_A, () => ambiente.categorias.salvar(combustivel!));

    await ambiente.semeador.semear(INSTITUICAO_A);

    expect(await contagensDe(INSTITUICAO_A)).toEqual({ unidades: 6, grupos: 6, categorias: 14 });
    const [unidade] = await consultarNaInstituicao(banco, INSTITUICAO_A, "select nome, teto_anual, ativa, versao from financeiro.unidade where codigo_sistema = 'MUNAY'");
    expect(unidade).toEqual({ nome: 'Munay Música', teto_anual: null, ativa: false, versao: 2 });
    const [grupo] = await consultarNaInstituicao(banco, INSTITUICAO_A, "select nome, ativo, versao from financeiro.grupo_de_custo where codigo_sistema = 'COZINHA'");
    expect(grupo).toEqual({ nome: 'Cozinha central', ativo: false, versao: 2 });
    const [categoria] = await consultarNaInstituicao(
      banco,
      INSTITUICAO_A,
      "select nome, regimes_permitidos, ativa, versao from financeiro.categoria where codigo_sistema = 'COMBUSTIVEL'",
    );
    expect(categoria).toEqual({ nome: 'Combustível e pedágio', regimes_permitidos: ['CONTRIBUICAO'], ativa: false, versao: 2 });
  });

  it('completa o que faltar: a unidade apagada volta, as demais ficam como estão', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);
    await banco.owner.query("delete from financeiro.unidade where codigo_sistema = 'PESSOAL' and instituicao_id = $1", [INSTITUICAO_A]);

    await ambiente.semeador.semear(INSTITUICAO_A);

    expect((await contagensDe(INSTITUICAO_A)).unidades).toBe(6);
  });

  it('cada instituição recebe os seus cadastros, com ids próprios, e semear uma não toca a outra', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);
    expect(await contagensDe(INSTITUICAO_B)).toEqual({ unidades: 0, grupos: 0, categorias: 0 });

    await ambiente.semeador.semear(INSTITUICAO_B);

    expect(await contagensDe(INSTITUICAO_B)).toEqual({ unidades: 6, grupos: 6, categorias: 14 });
    const idsDasUnidades = [
      ...(await consultarNaInstituicao<{ id: string }>(banco, INSTITUICAO_A, 'select id from financeiro.unidade')),
      ...(await consultarNaInstituicao<{ id: string }>(banco, INSTITUICAO_B, 'select id from financeiro.unidade')),
    ];
    expect(new Set(idsDasUnidades.map(({ id }) => id)).size).toBe(2 * UNIDADES_DA_CASA.length);
  });

  it('duas execuções simultâneas na mesma instituição terminam com um único conjunto', async () => {
    await Promise.all([ambiente.semeador.semear(INSTITUICAO_A), ambiente.semeador.semear(INSTITUICAO_A)]);

    expect(await contagensDe(INSTITUICAO_A)).toEqual({ unidades: 6, grupos: 6, categorias: 14 });
  });
});
