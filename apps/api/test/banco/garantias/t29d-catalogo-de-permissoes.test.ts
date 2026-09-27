import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATALOGO_DE_PERMISSOES } from '@cdd/contracts';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';

interface LinhaDePermissao {
  readonly codigo: string;
  readonly modulo: string;
  readonly descricao: string;
}

type DetalhesDaPermissao = Omit<LinhaDePermissao, 'codigo'>;

function catalogoPorCodigo(linhas: readonly LinhaDePermissao[]): Record<string, DetalhesDaPermissao> {
  return Object.fromEntries(linhas.map(({ codigo, modulo, descricao }) => [codigo, { modulo, descricao }]));
}

describe('T29(d) · identidade.permissao no banco espelha @cdd/contracts', () => {
  let banco: BancoDeTeste;

  beforeAll(async () => {
    banco = await criarBancoDeTeste();
  });

  afterAll(async () => {
    await derrubarBancoDeTeste(banco);
  });

  it('tem exatamente as mesmas permissões, módulo e descrição do CATALOGO_DE_PERMISSOES', async () => {
    const resultado = await banco.app.query<LinhaDePermissao>(
      'SELECT codigo, modulo, descricao FROM identidade.permissao ORDER BY codigo',
    );

    const doBanco = catalogoPorCodigo(resultado.rows);
    const doContrato = catalogoPorCodigo(
      Object.entries(CATALOGO_DE_PERMISSOES).map(([codigo, { modulo, descricao }]) => ({
        codigo,
        modulo,
        descricao,
      })),
    );

    expect(doBanco).toEqual(doContrato);
  });
});
