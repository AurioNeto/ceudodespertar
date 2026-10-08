import { describe, expect, it } from 'vitest';
import { ErroDeDominioException, ehErroDeDominio, erroDeDominio } from './erro-de-dominio.js';

describe('erroDeDominio', () => {
  it('cria erro só com o código quando não há detalhes', () => {
    expect(erroDeDominio('ERRO_INTERNO')).toStrictEqual({ codigo: 'ERRO_INTERNO' });
  });

  it('inclui os detalhes quando informados', () => {
    expect(erroDeDominio('PERIODO_FECHADO', { competencia: '2026-07' })).toStrictEqual({
      codigo: 'PERIODO_FECHADO',
      detalhes: { competencia: '2026-07' },
    });
  });
});

describe('ErroDeDominioException', () => {
  it('carrega o ErroDeDominio original para quem capturar a exceção', () => {
    const erro = erroDeDominio('PERIODO_FECHADO', { competencia: '2026-07' });

    const excecao = new ErroDeDominioException(erro);

    expect(excecao).toBeInstanceOf(Error);
    expect(excecao.erroDeDominio).toStrictEqual(erro);
  });
});

describe('ehErroDeDominio', () => {
  it('reconhece erro com código conhecido', () => {
    expect(ehErroDeDominio(erroDeDominio('RECURSO_NAO_ENCONTRADO'))).toBe(true);
  });

  it.each([null, undefined, 'RECURSO_NAO_ENCONTRADO', {}, { codigo: 'INEXISTENTE' }])(
    'não reconhece %j',
    (valor) => {
      expect(ehErroDeDominio(valor)).toBe(false);
    },
  );
});
