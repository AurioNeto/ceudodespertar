import { describe, expect, it } from 'vitest';
import { erroDeDominio } from './erro-de-dominio.js';

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
