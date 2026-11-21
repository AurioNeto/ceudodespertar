import { describe, expect, it } from 'vitest';
import { lerBaseDaApi } from './ambienteDaApi';
import { criarClienteHttp } from './clienteHttp';
import { criarFetchFalso, criarFonteDeCredencialFalsa, respostaJson } from './apoioDeTeste';

describe('origem da API no ambiente publicado', () => {
  it('envia a consulta de acesso à API configurada, com prefixo e credencial', async () => {
    const fetchFalso = criarFetchFalso(respostaJson(200, { situacao: 'ATIVO' }));
    const cliente = criarClienteHttp({
      base: lerBaseDaApi({ VITE_API_URL: 'https://api.example.org/' }),
      credencial: criarFonteDeCredencialFalsa(),
      fetch: fetchFalso,
    });

    await expect(cliente.requisitar({ metodo: 'GET', caminho: '/eu' })).resolves.toEqual({ situacao: 'ATIVO' });

    expect(fetchFalso.mock.calls[0]?.[0]).toBe('https://api.example.org/api/v1/eu');
    expect(fetchFalso.mock.calls[0]?.[1]?.headers).toHaveProperty('Authorization', 'Bearer token-velho');
  });

  it('preserva o proxy local quando a origem não foi configurada', () => {
    expect(lerBaseDaApi({})).toBe('/api/v1');
    expect(lerBaseDaApi({ VITE_API_URL: '' })).toBe('/api/v1');
    expect(lerBaseDaApi({ VITE_API_URL: 'http://localhost:3000' })).toBe('http://localhost:3000/api/v1');
  });

  it.each([
    'http://api.example.org',
    'https://usuario:segredo@api.example.org',
    'https://api.example.org/api/v1',
    'https://api.example.org?destino=outro',
    'https://api.example.org#fragmento',
    '/relativo',
    'não é uma URL',
  ])('recusa origem inválida antes de enviar credenciais: %s', (origem) => {
    expect(() => lerBaseDaApi({ VITE_API_URL: origem })).toThrow('VITE_API_URL');
  });
});
