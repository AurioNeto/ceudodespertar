import type { TipoLancamento } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { INICIAL } from '../mocks/formularioInicial';
import { regrasDoLancamento, type EstadoDoFormulario } from './regrasDoLancamento';
import { textosPorTipo } from './textosPorTipo';

const textos = (tipo: TipoLancamento, campos: EstadoDoFormulario = INICIAL, consolida = false) =>
  textosPorTipo(regrasDoLancamento(tipo, campos, consolida), campos, consolida);

describe('textosPorTipo', () => {
  it.each([
    ['SAIDA', 'Quanto foi', 'Conta de saída', 'Fornecedor', 'mais usada por você'],
    ['ENTRADA', 'Quanto entrou', 'Conta de entrada', 'De quem veio', 'mais usada por você'],
    ['TRANSFERENCIA', 'Quanto transferiu', 'Conta de origem', 'Fornecedor', 'De onde o dinheiro sai.'],
  ] as const)('%s — rótulos do valor, da conta e da contraparte, e nota da conta', (tipo, ...esperados) => {
    const [labelValor, labelConta, labelContraparte, notaConta] = esperados;

    expect(textos(tipo)).toMatchObject({ labelValor, labelConta, labelContraparte, notaConta });
  });

  it('conta de destino igual à origem pede outra conta; diferente, mostra a meta dela', () => {
    expect(textos('TRANSFERENCIA', { ...INICIAL, contaDestino: 'cora' }).notaContaDestino).toBe(
      'Escolha uma conta diferente da origem.',
    );
    expect(textos('TRANSFERENCIA').notaContaDestino).toBe('conta pessoal');
  });

  it('competência fechada muda a nota da competência', () => {
    expect(textos('SAIDA').notaCompetencia).toBe('Mês corrente.');
    expect(textos('SAIDA', { ...INICIAL, competencia: '07/2026' }).notaCompetencia).toBe(
      'Veio da data do gasto — julho está fechado.',
    );
  });

  it.each([
    [
      'bloqueado',
      'SAIDA',
      { competencia: '07/2026', valor: '3' },
      false,
      undefined,
    ],
    [
      'transferência',
      'TRANSFERENCIA',
      { valor: '3' },
      false,
      'Grava os dois lados de uma vez: saída em Cora PJ e entrada em Nubank Paty.',
    ],
    [
      'composto a conferir',
      'SAIDA',
      { valor: '65+70' },
      false,
      'Grava como a conferir: o valor composto vira pendência na conferência.',
    ],
    [
      'sem categoria',
      'SAIDA',
      { valor: '3' },
      false,
      'Nada bloqueia o registro. Sem categoria, grava e marca como não classificado.',
    ],
    [
      'consolidado',
      'SAIDA',
      { valor: '3', categorias: ['Manutenção'] },
      true,
      'Consolidado é definitivo: depois de gravado, só estorno.',
    ],
    [
      'a conferir',
      'SAIDA',
      { valor: '3', categorias: ['Manutenção'] },
      false,
      'Grava como a conferir: a tesouraria confere antes de consolidar.',
    ],
  ] as const)('nota da barra: %s', (_caso, tipo, mudanca, consolida, nota) => {
    expect(textos(tipo, { ...INICIAL, ...mudanca }, consolida).notaBarra).toBe(nota);
  });
});
