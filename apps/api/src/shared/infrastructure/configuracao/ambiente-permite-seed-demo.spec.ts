import { describe, expect, it } from 'vitest';
import { ambientePermiteSeedDemo } from './ambiente-permite-seed-demo.js';
import type { RecusaDoSeedDemo } from './ambiente-permite-seed-demo.js';

const KEYCLOAK_LOCAL = 'http://localhost:8080';
const BANCO_LOCAL = 'postgres://cdd_app:senha@localhost:5432/cdd';

function avaliar(entrada: { ambiente?: string; urlDoKeycloak?: string; urlDoBanco?: string }) {
  return ambientePermiteSeedDemo({
    ambiente: entrada.ambiente,
    urlDoKeycloak: entrada.urlDoKeycloak ?? KEYCLOAK_LOCAL,
    urlDoBanco: entrada.urlDoBanco ?? BANCO_LOCAL,
  });
}

function recusaDe(entrada: Parameters<typeof avaliar>[0]): RecusaDoSeedDemo | 'permitido' {
  const resultado = avaliar(entrada);
  return resultado.tipo === 'ok' ? 'permitido' : resultado.erro;
}

describe('ambientePermiteSeedDemo', () => {
  it.each([['local'], ['ci']])('permite %s com Keycloak e banco em loopback', (ambiente) => {
    expect(recusaDe({ ambiente })).toBe('permitido');
  });

  it.each([['homologacao'], ['producao']])('recusa %s mesmo com loopback', (ambiente) => {
    expect(recusaDe({ ambiente })).toBe('AMBIENTE_NAO_PERMITE_SEED');
  });

  it('recusa ambiente ausente', () => {
    expect(recusaDe({ ambiente: undefined })).toBe('AMBIENTE_AUSENTE');
  });

  it.each([[''], ['dev'], ['LOCAL'], [' local'], ['true']])('recusa ambiente inválido "%s"', (ambiente) => {
    expect(recusaDe({ ambiente })).toBe('AMBIENTE_INVALIDO');
  });

  it.each([
    ['http://127.0.0.1:8080'],
    ['http://[::1]:8080'],
    ['http://localhost'],
  ])('aceita Keycloak em loopback literal %s', (urlDoKeycloak) => {
    expect(recusaDe({ ambiente: 'local', urlDoKeycloak })).toBe('permitido');
  });

  it.each([
    ['postgres://u:s@127.0.0.1:5433/cdd'],
    ['postgres://u:s@[::1]:5432/cdd'],
    ['postgres://u:s@localhost/cdd'],
  ])('aceita banco em loopback literal %s', (urlDoBanco) => {
    expect(recusaDe({ ambiente: 'local', urlDoBanco })).toBe('permitido');
  });

  it.each([
    ['http://localhost.evil.com:8080'],
    ['http://127.0.0.1.nip.io:8080'],
    ['http://postgres:8080'],
    ['http://keycloak.interno:8080'],
    ['http://127.0.0.2:8080'],
    ['http://0.0.0.0:8080'],
    ['http://localhostx:8080'],
    ['http://localhost.:8080'],
    ['https://auth.exemplo.com'],
    ['nao é url'],
    [''],
  ])('recusa Keycloak fora do loopback %s', (urlDoKeycloak) => {
    expect(recusaDe({ ambiente: 'local', urlDoKeycloak })).toBe('KEYCLOAK_FORA_DO_LOOPBACK');
  });

  it.each([
    ['postgres://u:s@localhost.evil.com:5432/cdd'],
    ['postgres://u:s@127.0.0.1.nip.io:5432/cdd'],
    ['postgres://u:s@postgres:5432/cdd'],
    ['postgres://u:s@db.interno:5432/cdd'],
    ['postgres://u:s@evil.com/localhost'],
    ['postgres://u:s@localhost.:5432/cdd'],
    ['nao é url'],
    [''],
  ])('recusa banco fora do loopback %s', (urlDoBanco) => {
    expect(recusaDe({ ambiente: 'local', urlDoBanco })).toBe('BANCO_FORA_DO_LOOPBACK');
  });

  it('recusa quando só o Keycloak está fora do loopback', () => {
    expect(recusaDe({ ambiente: 'ci', urlDoKeycloak: 'https://auth.exemplo.com' })).toBe(
      'KEYCLOAK_FORA_DO_LOOPBACK',
    );
  });

  it('recusa quando só o banco está fora do loopback', () => {
    expect(recusaDe({ ambiente: 'ci', urlDoBanco: 'postgres://u:s@postgres:5432/cdd' })).toBe(
      'BANCO_FORA_DO_LOOPBACK',
    );
  });
});
