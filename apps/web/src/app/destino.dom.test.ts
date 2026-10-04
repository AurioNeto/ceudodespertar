import { describe, expect, it } from 'vitest';
import { destinoDaNavegacao, destinoSeguro } from './destino';

describe('destinoSeguro', () => {
  it('mantém caminho interno com consulta', () => {
    expect(destinoSeguro('/lancamentos?pagina=2')).toBe('/lancamentos?pagina=2');
  });

  it.each(['https://malicioso.example/x', '//malicioso.example', '/\\malicioso.example', 'lancamentos', ''])(
    'descarta destino que sai do site: %s',
    (valor) => {
      expect(destinoSeguro(valor)).toBe('/');
    },
  );

  it.each([undefined, null, 42, {}])('descarta o que não é texto: %s', (valor) => {
    expect(destinoSeguro(valor)).toBe('/');
  });

  it.each(['/entrar', '/entrar/retorno', '/entrar?x=1'])('não devolve para a tela de entrada: %s', (valor) => {
    expect(destinoSeguro(valor)).toBe('/');
  });

  it.each([
    ['tab', '/\t/evil.com'],
    ['quebra de linha', '/\n/evil.com'],
    ['retorno de carro', '/\r/evil.com'],
    ['barra dupla', '//'],
    ['host com caminho, que não pode virar só o caminho', '//evil.com/lancamentos'],
    ['tab antes do host com caminho', '/\t/evil.com/lancamentos'],
    ['barra e contrabarra', '/\\'],
    ['contrabarra com host', '/\\evil.com'],
    ['esquema javascript', 'javascript:alert(1)'],
  ])('descarta o que o navegador resolveria para fora do site: %s', (_nome, valor) => {
    expect(destinoSeguro(valor)).toBe('/');
  });

  it.each([
    ['barras codificadas', '/%2F%2Fevil.com', '/%2F%2Fevil.com'],
    ['arroba no caminho', '/@evil.com', '/@evil.com'],
    ['fragmento', '/lancamentos?pagina=2#fim', '/lancamentos?pagina=2#fim'],
  ])('mantém como caminho do próprio site: %s', (_nome, valor, esperado) => {
    expect(destinoSeguro(valor)).toBe(esperado);
  });

  it('o resultado é sempre um caminho do próprio site, nunca uma URL absoluta', () => {
    for (const valor of ['/\t/evil.com', '/a/../b', '/%2F%2Fevil.com', '/@evil.com']) {
      const resultado = destinoSeguro(valor);
      expect(resultado.startsWith('/')).toBe(true);
      expect(new URL(resultado, window.location.origin).origin).toBe(window.location.origin);
    }
  });

  it('não devolve para a tela de entrada disfarçada de caminho relativo', () => {
    expect(destinoSeguro('/./entrar')).toBe('/');
    expect(destinoSeguro('/a/../entrar/retorno?code=1')).toBe('/');
  });

  it('não confunde rota que só começa com as mesmas letras', () => {
    expect(destinoSeguro('/entrarem-contato')).toBe('/entrarem-contato');
  });
});

describe('destinoDaNavegacao', () => {
  it('lê o destino guardado pelo guard de rota', () => {
    expect(destinoDaNavegacao({ de: '/faturas' })).toBe('/faturas');
  });

  it('cai no painel sem estado de navegação', () => {
    expect(destinoDaNavegacao(null)).toBe('/');
    expect(destinoDaNavegacao(undefined)).toBe('/');
    expect(destinoDaNavegacao({})).toBe('/');
  });

  it('aplica a mesma sanitização', () => {
    expect(destinoDaNavegacao({ de: 'https://malicioso.example' })).toBe('/');
  });
});
