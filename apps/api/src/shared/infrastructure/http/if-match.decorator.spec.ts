import { describe, expect, it } from 'vitest';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext } from '@nestjs/common';
import { ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import { IfMatch, versaoDoIfMatch } from './if-match.decorator.js';

type FabricaDoParametro = (dado: unknown, contexto: ExecutionContext) => number;

function fabricaDoParametro(alvo: object, metodo: string): FabricaDoParametro {
  const metadados = Reflect.getMetadata(ROUTE_ARGS_METADATA, alvo.constructor, metodo) as Record<
    string,
    { factory: FabricaDoParametro }
  >;
  const chave = Object.keys(metadados)[0] as string;
  const entrada = metadados[chave];
  if (entrada === undefined) throw new Error('nenhum parâmetro decorado encontrado');
  return entrada.factory;
}

function contextoComCabecalho(cabecalho: string | string[] | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: cabecalho === undefined ? {} : { 'if-match': cabecalho } }),
    }),
  } as unknown as ExecutionContext;
}

function codigoDoErro(fabrica: FabricaDoParametro, cabecalho: string | string[] | undefined): string {
  try {
    fabrica(undefined, contextoComCabecalho(cabecalho));
    throw new Error('deveria ter lançado ErroDeDominioException');
  } catch (excecao) {
    return (excecao as ErroDeDominioException).erroDeDominio.codigo;
  }
}

class ControladorComIfMatch {
  metodo(@IfMatch() _versao: number): void {}
}

describe('versaoDoIfMatch', () => {
  it('lê um inteiro simples, com ou sem aspas', () => {
    expect(versaoDoIfMatch('3')).toBe(3);
    expect(versaoDoIfMatch('"9"')).toBe(9);
    expect(versaoDoIfMatch('0')).toBe(0);
  });

  it('devolve undefined quando ausente ou vazio', () => {
    expect(versaoDoIfMatch(undefined)).toBeUndefined();
    expect(versaoDoIfMatch('')).toBeUndefined();
    expect(versaoDoIfMatch(' ')).toBeUndefined();
  });

  it('devolve undefined para número negativo, fracionário ou com zero à esquerda', () => {
    expect(versaoDoIfMatch('-1')).toBeUndefined();
    expect(versaoDoIfMatch('1.5')).toBeUndefined();
    expect(versaoDoIfMatch('3.0')).toBeUndefined();
    expect(versaoDoIfMatch('01')).toBeUndefined();
  });

  it('devolve undefined para notação alternativa que Number aceitaria (científica, hex, binária, com sinal)', () => {
    expect(versaoDoIfMatch('1e3')).toBeUndefined();
    expect(versaoDoIfMatch('0x10')).toBeUndefined();
    expect(versaoDoIfMatch('0b11')).toBeUndefined();
    expect(versaoDoIfMatch('+3')).toBeUndefined();
  });

  it('devolve undefined para validador fraco (W/) e para o coringa (*)', () => {
    expect(versaoDoIfMatch('W/"3"')).toBeUndefined();
    expect(versaoDoIfMatch('*')).toBeUndefined();
  });

  it('devolve undefined para número maior que o inteiro seguro do JavaScript', () => {
    expect(versaoDoIfMatch('99999999999999999999')).toBeUndefined();
  });

  it('devolve undefined para múltiplos valores (cabeçalho duplicado, já unido por vírgula)', () => {
    expect(versaoDoIfMatch('"3", "4"')).toBeUndefined();
  });
});

describe('IfMatch', () => {
  it('devolve a versão quando o cabeçalho está presente e bem formado', () => {
    const fabrica = fabricaDoParametro(ControladorComIfMatch.prototype, 'metodo');

    expect(fabrica(undefined, contextoComCabecalho('5'))).toBe(5);
  });

  it('lança VERSAO_OBRIGATORIA (428) quando o cabeçalho está ausente', () => {
    const fabrica = fabricaDoParametro(ControladorComIfMatch.prototype, 'metodo');

    expect(() => fabrica(undefined, contextoComCabecalho(undefined))).toThrow(ErroDeDominioException);
    expect(codigoDoErro(fabrica, undefined)).toBe('VERSAO_OBRIGATORIA');
  });

  it.each(['', ' ', '*', 'W/"3"', '-1', '1.5', '1e3', '0x10', '0b11', '+3', '3.0', '"3", "4"', '99999999999999999999'])(
    'lança CORPO_INVALIDO (400) quando o cabeçalho está presente e malformado: %s',
    (cabecalho) => {
      const fabrica = fabricaDoParametro(ControladorComIfMatch.prototype, 'metodo');

      expect(codigoDoErro(fabrica, cabecalho)).toBe('CORPO_INVALIDO');
    },
  );

  it('lança CORPO_INVALIDO (400) quando o cabeçalho chega como array (duplicado não unido)', () => {
    const fabrica = fabricaDoParametro(ControladorComIfMatch.prototype, 'metodo');

    expect(codigoDoErro(fabrica, ['3', '4'])).toBe('CORPO_INVALIDO');
  });
});
