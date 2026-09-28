import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { CHAVE_DO_MODO_DE_TRANSACAO, ModoDeTransacao } from './modo-de-transacao.decorator.js';

describe('ModoDeTransacao', () => {
  it('grava o modo como metadado sob a chave do módulo', () => {
    class Alvo {
      @ModoDeTransacao('escrita')
      metodo(): void {}
    }

    const reflector = new Reflector();
    const modo = reflector.get(CHAVE_DO_MODO_DE_TRANSACAO, Alvo.prototype.metodo);

    expect(modo).toBe('escrita');
  });

  it('também decora a classe inteira', () => {
    @ModoDeTransacao('leitura')
    class AlvoDeClasse {}

    const reflector = new Reflector();
    const modo = reflector.get(CHAVE_DO_MODO_DE_TRANSACAO, AlvoDeClasse);

    expect(modo).toBe('leitura');
  });
});
