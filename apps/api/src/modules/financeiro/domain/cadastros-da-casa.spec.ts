import { describe, expect, it } from 'vitest';
import { Categoria } from './categoria/categoria.js';
import { CATEGORIAS_DA_CASA, GRUPOS_DE_CUSTO_DA_CASA, UNIDADES_DA_CASA } from './cadastros-da-casa.js';
import { Unidade } from './unidade/unidade.js';

function repetidos(codigos: readonly string[]): string[] {
  return codigos.filter((codigo, posicao) => codigos.indexOf(codigo) !== posicao);
}

describe('cadastros da casa', () => {
  it('trazem 6 unidades, 6 grupos de custo e 14 categorias, sem código repetido', () => {
    expect(UNIDADES_DA_CASA).toHaveLength(6);
    expect(GRUPOS_DE_CUSTO_DA_CASA).toHaveLength(6);
    expect(CATEGORIAS_DA_CASA).toHaveLength(14);
    expect(repetidos(UNIDADES_DA_CASA.map((item) => item.codigoSistema))).toEqual([]);
    expect(repetidos(GRUPOS_DE_CUSTO_DA_CASA.map((item) => item.codigoSistema))).toEqual([]);
    expect(repetidos(CATEGORIAS_DA_CASA.map((item) => item.codigoSistema))).toEqual([]);
  });

  it('só a Munay tem teto, e é o MEI de R$ 81 mil em centavos', () => {
    const comTeto = UNIDADES_DA_CASA.filter((unidade) => unidade.tetoAnual !== null);

    expect(comTeto).toEqual([expect.objectContaining({ codigoSistema: 'MUNAY', tetoAnual: 8_100_000 })]);
  });

  it('toda unidade e toda categoria da casa respeitam as invariantes do agregado', () => {
    const unidades = UNIDADES_DA_CASA.map((item) => Unidade.criar({ ...item, id: 'u' as never }));
    const categorias = CATEGORIAS_DA_CASA.map((item) => Categoria.criar({ ...item, id: 'c' as never, unidadePadraoId: null }));

    expect([...unidades, ...categorias].map((resultado) => resultado.tipo)).toEqual(Array(UNIDADES_DA_CASA.length + CATEGORIAS_DA_CASA.length).fill('ok'));
  });
});
