import { describe, expect, it } from 'vitest';
import { analisarAmbiente, ErroDeAmbienteInvalido } from './esquema-de-ambiente.js';

describe('analisarAmbiente', () => {
  it('aceita um ambiente válido e aplica os defaults', () => {
    const ambiente = analisarAmbiente({
      PORTA: '3000',
      ORIGENS_CORS: 'http://localhost:5173, http://localhost:4173',
      LOG_NIVEL: 'info',
      TZ: 'America/Sao_Paulo',
    });

    expect(ambiente).toEqual({
      PORTA: 3000,
      ORIGENS_CORS: ['http://localhost:5173', 'http://localhost:4173'],
      LOG_NIVEL: 'info',
      TZ: 'America/Sao_Paulo',
    });
  });

  it('preenche PORTA, ORIGENS_CORS, LOG_NIVEL e TZ quando ausentes', () => {
    const ambiente = analisarAmbiente({});

    expect(ambiente).toEqual({
      PORTA: 3000,
      ORIGENS_CORS: [],
      LOG_NIVEL: 'info',
      TZ: 'UTC',
    });
  });

  it('lança ErroDeAmbienteInvalido listando todos os problemas', () => {
    expect.assertions(4);

    try {
      analisarAmbiente({ PORTA: 'abc', LOG_NIVEL: 'urgente' });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteInvalido);
      const problemas = (erro as ErroDeAmbienteInvalido).problemas;
      expect(problemas).toHaveLength(2);
      expect(problemas.some((problema) => problema.startsWith('PORTA'))).toBe(true);
      expect(problemas.some((problema) => problema.startsWith('LOG_NIVEL'))).toBe(true);
    }
  });

  it('recusa PORTA acima do limite de portas TCP', () => {
    expect.assertions(3);

    try {
      analisarAmbiente({ PORTA: '70000' });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteInvalido);
      const problemas = (erro as ErroDeAmbienteInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]?.startsWith('PORTA')).toBe(true);
    }
  });
});
