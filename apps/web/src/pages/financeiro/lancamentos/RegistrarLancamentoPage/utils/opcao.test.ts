import { describe, expect, it } from 'vitest';
import { metaDaOpcao, rotuloDaOpcao } from './opcao';

const OPCOES = [
  { value: 'cora', label: 'Cora PJ', meta: 'mais usada por você' },
  { value: 'pix', label: 'Pix' },
] as const;

describe('rotuloDaOpcao', () => {
  it('devolve o rótulo da opção com o valor pedido', () => {
    expect(rotuloDaOpcao(OPCOES, 'cora')).toBe('Cora PJ');
  });

  it('sem opção com o valor, devolve o próprio valor', () => {
    expect(rotuloDaOpcao(OPCOES, 'itau')).toBe('itau');
  });
});

describe('metaDaOpcao', () => {
  it('devolve a meta da opção com o valor pedido', () => {
    expect(metaDaOpcao(OPCOES, 'cora')).toBe('mais usada por você');
  });

  it.each([['pix'], ['itau']])('opção %s sem meta ou ausente devolve vazio', (valor) => {
    expect(metaDaOpcao(OPCOES, valor)).toBe('');
  });
});
