import { describe, expect, it } from 'vitest';
import {
  desembrulharOuLancar,
  ehErr,
  ehOk,
  ehResultadoDeErro,
  encadear,
  err,
  mapear,
  mapearErro,
  ok,
} from './result.js';

describe('ok e err', () => {
  it('ok carrega o valor e ehOk reconhece', () => {
    const resultado = ok(42);

    expect(ehOk(resultado)).toBe(true);
    expect(ehErr(resultado)).toBe(false);
  });

  it('ok sem argumento representa sucesso sem valor', () => {
    expect(ok()).toStrictEqual({ tipo: 'ok', valor: undefined });
  });

  it('err carrega o erro e ehErr reconhece', () => {
    const resultado = err('falhou');

    expect(ehErr(resultado)).toBe(true);
    expect(ehOk(resultado)).toBe(false);
  });
});

describe('mapear', () => {
  it('transforma o valor quando ok', () => {
    const resultado = mapear(ok(2), (valor) => valor * 10);

    expect(ehOk(resultado)).toBe(true);
    expect(desembrulharOuLancar(resultado, () => new Error('inesperado'))).toBe(20);
  });

  it('preserva o erro sem chamar a transformação quando erro', () => {
    const resultado = mapear(err('falhou'), () => {
      throw new Error('não deveria ser chamada');
    });

    expect(ehErr(resultado) && resultado.erro).toBe('falhou');
  });
});

describe('mapearErro', () => {
  it('preserva o valor sem chamar a transformação quando ok', () => {
    const resultado = mapearErro(ok(7), () => {
      throw new Error('não deveria ser chamada');
    });

    expect(desembrulharOuLancar(resultado, () => new Error('inesperado'))).toBe(7);
  });

  it('transforma o erro quando erro', () => {
    const resultado = mapearErro(err('falhou'), (erro) => `${erro}!`);

    expect(ehErr(resultado) && resultado.erro).toBe('falhou!');
  });
});

describe('encadear', () => {
  it('continua com o valor quando ok', () => {
    const resultado = encadear(ok(3), (valor) => ok(valor + 1));

    expect(desembrulharOuLancar(resultado, () => new Error('inesperado'))).toBe(4);
  });

  it('encurta e preserva o erro sem continuar quando erro', () => {
    const resultado = encadear(err('falhou'), () => {
      throw new Error('não deveria ser chamada');
    });

    expect(ehErr(resultado) && resultado.erro).toBe('falhou');
  });
});

describe('desembrulharOuLancar', () => {
  it('devolve o valor quando ok', () => {
    expect(desembrulharOuLancar(ok('valor'), () => new Error('inesperado'))).toBe('valor');
  });

  it('lança o erro criado quando erro', () => {
    expect(() =>
      desembrulharOuLancar(err('motivo'), (erro) => new Error(`falhou: ${erro}`)),
    ).toThrow('falhou: motivo');
  });
});

describe('ehResultadoDeErro', () => {
  it('reconhece o Result de erro de qualquer origem, inclusive de valor desconhecido', () => {
    const desconhecido: unknown = err('falhou');

    expect(ehResultadoDeErro(desconhecido)).toBe(true);
  });

  it.each([
    ['Result ok', ok(1)],
    ['null', null],
    ['undefined', undefined],
    ['string', 'erro'],
    ['objeto sem o campo erro', { tipo: 'erro' }],
    ['objeto de outra forma', { erro: 'x' }],
  ])('não reconhece %s', (_nome, valor) => {
    expect(ehResultadoDeErro(valor)).toBe(false);
  });
});
