import { describe, expect, it } from 'vitest';
import { analisarAmbiente, ErroDeAmbienteInvalido } from './esquema-de-ambiente.js';

const OIDC_VALIDO = { OIDC_EMISSOR: 'http://localhost:8080/realms/cdd', OIDC_AUDIENCIA: 'cdd-api' };

describe('analisarAmbiente', () => {
  it('aceita um ambiente válido e aplica os defaults', () => {
    const ambiente = analisarAmbiente({
      PORTA: '3000',
      ORIGENS_CORS: 'http://localhost:5173, http://localhost:4173',
      LOG_NIVEL: 'info',
      TZ: 'America/Sao_Paulo',
      ...OIDC_VALIDO,
    });

    expect(ambiente).toEqual({
      PORTA: 3000,
      ORIGENS_CORS: ['http://localhost:5173', 'http://localhost:4173'],
      LOG_NIVEL: 'info',
      TZ: 'America/Sao_Paulo',
      ...OIDC_VALIDO,
    });
  });

  it('preenche PORTA, ORIGENS_CORS, LOG_NIVEL e TZ quando ausentes', () => {
    const ambiente = analisarAmbiente({ ...OIDC_VALIDO });

    expect(ambiente).toEqual({
      PORTA: 3000,
      ORIGENS_CORS: [],
      LOG_NIVEL: 'info',
      TZ: 'UTC',
      ...OIDC_VALIDO,
    });
  });

  it('lança ErroDeAmbienteInvalido listando todos os problemas', () => {
    expect.assertions(4);

    try {
      analisarAmbiente({ ...OIDC_VALIDO, PORTA: 'abc', LOG_NIVEL: 'urgente' });
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
      analisarAmbiente({ ...OIDC_VALIDO, PORTA: '70000' });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteInvalido);
      const problemas = (erro as ErroDeAmbienteInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]?.startsWith('PORTA')).toBe(true);
    }
  });

  it('exige OIDC_EMISSOR e OIDC_AUDIENCIA', () => {
    expect.assertions(3);

    try {
      analisarAmbiente({});
    } catch (erro) {
      const problemas = (erro as ErroDeAmbienteInvalido).problemas;
      expect(problemas).toHaveLength(2);
      expect(problemas.some((problema) => problema.startsWith('OIDC_EMISSOR'))).toBe(true);
      expect(problemas.some((problema) => problema.startsWith('OIDC_AUDIENCIA'))).toBe(true);
    }
  });

  it.each([
    'http://idp.exemplo.com/realms/cdd',
    'http://127.0.0.1:8080/realms/cdd',
    'ftp://localhost/realms/cdd',
    'https://idp.exemplo.com/realms/cdd/',
    'https://usuario:senha@idp.exemplo.com/realms/cdd',
    'https://idp.exemplo.com/realms/cdd?x=1',
    'https://idp.exemplo.com/realms/cdd#frag',
    'idp.exemplo.com/realms/cdd',
    '',
  ])('recusa OIDC_EMISSOR %j', (emissor) => {
    expect(() => analisarAmbiente({ ...OIDC_VALIDO, OIDC_EMISSOR: emissor })).toThrow(ErroDeAmbienteInvalido);
  });

  it.each(['https://idp.exemplo.com/realms/cdd', 'http://localhost/realms/cdd', 'http://localhost:8080/realms/cdd'])(
    'aceita OIDC_EMISSOR %j',
    (emissor) => {
      expect(analisarAmbiente({ ...OIDC_VALIDO, OIDC_EMISSOR: emissor }).OIDC_EMISSOR).toBe(emissor);
    },
  );

  it('recusa OIDC_AUDIENCIA vazia', () => {
    expect(() => analisarAmbiente({ ...OIDC_VALIDO, OIDC_AUDIENCIA: '' })).toThrow(ErroDeAmbienteInvalido);
  });
});
