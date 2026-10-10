import { describe, expect, it } from 'vitest';
import { AMBIENTE_DO_KEYCLOAK_DE_TESTE } from '../../../../test/ambiente-de-teste.js';
import { analisarAmbiente, ErroDeAmbienteInvalido } from './esquema-de-ambiente.js';

const OIDC_VALIDO = {
  OIDC_EMISSOR: 'http://localhost:8080/realms/cdd',
  OIDC_AUDIENCIA: 'cdd-api',
  ...AMBIENTE_DO_KEYCLOAK_DE_TESTE,
};

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

  it.each(['OIDC_EMISSOR', 'OIDC_AUDIENCIA', ...Object.keys(AMBIENTE_DO_KEYCLOAK_DE_TESTE)])(
    'exige %s',
    (variavel) => {
      expect.assertions(2);

      try {
        analisarAmbiente({ ...OIDC_VALIDO, [variavel]: undefined });
      } catch (erro) {
        const problemas = (erro as ErroDeAmbienteInvalido).problemas;
        expect(problemas).toHaveLength(1);
        expect(problemas[0]?.startsWith(variavel)).toBe(true);
      }
    },
  );

  it.each(['KEYCLOAK_URL_BASE', 'APP_URL_BASE'])('recusa %s fora da forma canônica', (variavel) => {
    expect(() => analisarAmbiente({ ...OIDC_VALIDO, [variavel]: 'https://app.exemplo.com/' })).toThrow(
      ErroDeAmbienteInvalido,
    );
    expect(() => analisarAmbiente({ ...OIDC_VALIDO, [variavel]: 'http://app.exemplo.com' })).toThrow(
      ErroDeAmbienteInvalido,
    );
  });

  it.each(['KEYCLOAK_REALM', 'KEYCLOAK_ADMIN_CLIENT_ID', 'KEYCLOAK_CLIENT_ID_DO_CONVITE'])(
    'recusa %s com barra ou espaço',
    (variavel) => {
      expect(() => analisarAmbiente({ ...OIDC_VALIDO, [variavel]: 'cdd/admin' })).toThrow(ErroDeAmbienteInvalido);
      expect(() => analisarAmbiente({ ...OIDC_VALIDO, [variavel]: 'cdd admin' })).toThrow(ErroDeAmbienteInvalido);
    },
  );

  it('recusa CDD_KC_ADMIN_SEGREDO vazio', () => {
    expect(() => analisarAmbiente({ ...OIDC_VALIDO, CDD_KC_ADMIN_SEGREDO: '' })).toThrow(ErroDeAmbienteInvalido);
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
    ' https://idp.exemplo.com/realms/cdd',
    'https://idp.exemplo.com/realms/cdd ',
    'https://idp.exemplo.com/realms/cdd\t',
    'HTTPS://IDP.EXEMPLO.COM/realms/cdd',
    'https://IDP.exemplo.com/realms/cdd',
    'http://LOCALHOST:8080/realms/cdd',
    'https:idp.exemplo.com/realms/cdd',
    'https://idp.exemplo.com/realms/cdd/..',
    'https://idp.exemplo.com/realms/./cdd',
    'https://idp.exemplo.com:443/realms/cdd',
    'https://idp.exemplo.com/realms/cd d',
  ])('recusa OIDC_EMISSOR %j', (emissor) => {
    expect(() => analisarAmbiente({ ...OIDC_VALIDO, OIDC_EMISSOR: emissor })).toThrow(ErroDeAmbienteInvalido);
  });

  it.each(['https://idp.exemplo.com/realms/cdd', 'http://localhost/realms/cdd', 'http://localhost:8080/realms/cdd'])(
    'aceita OIDC_EMISSOR %j',
    (emissor) => {
      expect(analisarAmbiente({ ...OIDC_VALIDO, OIDC_EMISSOR: emissor }).OIDC_EMISSOR).toBe(emissor);
    },
  );

  it.each(['', ' cdd-api', 'cdd-api ', 'cdd api', 'cdd-api\t', 'cdd-api\n'])('recusa OIDC_AUDIENCIA %j', (audiencia) => {
    expect(() => analisarAmbiente({ ...OIDC_VALIDO, OIDC_AUDIENCIA: audiencia })).toThrow(ErroDeAmbienteInvalido);
  });

  it('aceita OIDC_AUDIENCIA sem espaços em branco', () => {
    expect(analisarAmbiente({ ...OIDC_VALIDO, OIDC_AUDIENCIA: 'cdd-api' }).OIDC_AUDIENCIA).toBe('cdd-api');
  });
});
