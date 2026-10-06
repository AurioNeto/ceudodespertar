import { describe, expect, it } from 'vitest';
import { ErroDeDominioException, erroDeDominio } from './erro-de-dominio.js';

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
