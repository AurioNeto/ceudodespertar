import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Controller, Get, Next, Res } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { handlerRespondePorContaPropria } from './handler-responde-por-conta-propria.js';

function embrulhadoEmFuncaoDeOutroNome(): MethodDecorator {
  return (_alvo, _propriedade, descriptor) => {
    const original = descriptor.value as unknown as (...argumentos: unknown[]) => unknown;
    const envelope = (...argumentos: unknown[]) => original(...argumentos);
    Object.defineProperty(envelope, 'name', { value: 'envelope' });
    descriptor.value = envelope as unknown as typeof descriptor.value;
  };
}

@Controller('exemplos')
class ControladorDeExemplo {
  @Get('com-res')
  comRes(@Res() _resposta: unknown): void {}

  @Get('com-next')
  comNext(@Next() _proximo: unknown): void {}

  @Get('com-res-passthrough')
  comResPassthrough(@Res({ passthrough: true }) _resposta: unknown): void {}

  @Get('sem-injecao')
  semInjecao(): void {}

  @Get('com-res-embrulhado')
  @embrulhadoEmFuncaoDeOutroNome()
  comResEmbrulhado(@Res() _resposta: unknown): void {}
}

class ControladorFilho extends ControladorDeExemplo {}

function contextoDe(controlador: new () => object, handler: unknown): ExecutionContext {
  return {
    getClass: () => controlador,
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

describe('handlerRespondePorContaPropria', () => {
  it('detecta @Res()', () => {
    const contexto = contextoDe(ControladorDeExemplo, ControladorDeExemplo.prototype.comRes);
    expect(handlerRespondePorContaPropria(contexto)).toBe(true);
  });

  it('detecta @Next()', () => {
    const contexto = contextoDe(ControladorDeExemplo, ControladorDeExemplo.prototype.comNext);
    expect(handlerRespondePorContaPropria(contexto)).toBe(true);
  });

  it('ignora @Res({ passthrough: true })', () => {
    const contexto = contextoDe(ControladorDeExemplo, ControladorDeExemplo.prototype.comResPassthrough);
    expect(handlerRespondePorContaPropria(contexto)).toBe(false);
  });

  it('ignora handler sem @Res nem @Next', () => {
    const contexto = contextoDe(ControladorDeExemplo, ControladorDeExemplo.prototype.semInjecao);
    expect(handlerRespondePorContaPropria(contexto)).toBe(false);
  });

  it('detecta @Res() quando um decorator de método troca o handler por função de outro nome', () => {
    const handler = ControladorDeExemplo.prototype.comResEmbrulhado;
    expect(handler.name).toBe('envelope');
    expect(handlerRespondePorContaPropria(contextoDe(ControladorDeExemplo, handler))).toBe(true);
  });

  it('detecta @Res() de handler herdado pela cadeia de protótipos', () => {
    const handler = ControladorFilho.prototype.comResEmbrulhado;
    expect(handlerRespondePorContaPropria(contextoDe(ControladorFilho, handler))).toBe(true);
  });
});
