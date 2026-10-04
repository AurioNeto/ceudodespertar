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
