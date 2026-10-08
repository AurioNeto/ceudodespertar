import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { RespostaSemCorpoNoReplay, rotaGuardaRespostaSemCorpo } from './resposta-sem-corpo-no-replay.decorator.js';

function contextoDe(controlador: new () => object, nomeDoHandler: string): ExecutionContext {
  const handler = (controlador.prototype as Record<string, () => void>)[nomeDoHandler];
  return { getClass: () => controlador, getHandler: () => handler } as unknown as ExecutionContext;
}

class ControladorComHandlerMarcado {
  @RespostaSemCorpoNoReplay()
  marcado(): void {}

  comum(): void {}
}

@RespostaSemCorpoNoReplay()
class ControladorMarcado {
  qualquer(): void {}
}

describe('RespostaSemCorpoNoReplay', () => {
  it('reconhece o handler marcado', () => {
    expect(rotaGuardaRespostaSemCorpo(contextoDe(ControladorComHandlerMarcado, 'marcado'))).toBe(true);
  });

  it('não marca os outros handlers do mesmo controlador', () => {
    expect(rotaGuardaRespostaSemCorpo(contextoDe(ControladorComHandlerMarcado, 'comum'))).toBe(false);
  });

  it('reconhece a marca posta no controlador inteiro', () => {
    expect(rotaGuardaRespostaSemCorpo(contextoDe(ControladorMarcado, 'qualquer'))).toBe(true);
  });
});
