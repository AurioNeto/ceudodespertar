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

function contextoComCabecalho(cabecalho: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: cabecalho === undefined ? {} : { 'if-match': cabecalho } }),
    }),
  } as unknown as ExecutionContext;
}

class ControladorComIfMatch {
  metodo(@IfMatch() _versao: number): void {}
}

describe('versaoDoIfMatch', () => {
  it('lê um inteiro simples', () => {
    expect(versaoDoIfMatch('3')).toBe(3);
  });

  it('remove aspas e o prefixo de validador fraco', () => {
    expect(versaoDoIfMatch('W/"7"')).toBe(7);
    expect(versaoDoIfMatch('"9"')).toBe(9);
  });

  it('devolve undefined quando ausente, vazio ou não numérico', () => {
    expect(versaoDoIfMatch(undefined)).toBeUndefined();
    expect(versaoDoIfMatch('')).toBeUndefined();
    expect(versaoDoIfMatch('"abc"')).toBeUndefined();
  });

  it('devolve undefined para número negativo ou fracionário', () => {
    expect(versaoDoIfMatch('-1')).toBeUndefined();
    expect(versaoDoIfMatch('1.5')).toBeUndefined();
  });
});

describe('IfMatch', () => {
  it('devolve a versão quando o cabeçalho está presente', () => {
    const fabrica = fabricaDoParametro(ControladorComIfMatch.prototype, 'metodo');

    expect(fabrica(undefined, contextoComCabecalho('5'))).toBe(5);
  });

  it('lança VERSAO_OBRIGATORIA quando o cabeçalho está ausente', () => {
    const fabrica = fabricaDoParametro(ControladorComIfMatch.prototype, 'metodo');

    expect(() => fabrica(undefined, contextoComCabecalho(undefined))).toThrow(ErroDeDominioException);
  });

  it('carrega o código VERSAO_OBRIGATORIA na exceção', () => {
    const fabrica = fabricaDoParametro(ControladorComIfMatch.prototype, 'metodo');

    try {
      fabrica(undefined, contextoComCabecalho(undefined));
      expect.unreachable();
    } catch (excecao) {
      expect((excecao as ErroDeDominioException).erroDeDominio).toStrictEqual({ codigo: 'VERSAO_OBRIGATORIA' });
    }
  });
});
