import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { CHAVE_DE_SEM_TRANSACAO_NA_BORDA, SemTransacaoNaBorda } from './sem-transacao-na-borda.decorator.js';

describe('SemTransacaoNaBorda', () => {
  it('marca o método', () => {
    class Alvo {
      @SemTransacaoNaBorda()
      metodo(): void {}
    }

    expect(new Reflector().get(CHAVE_DE_SEM_TRANSACAO_NA_BORDA, Alvo.prototype.metodo)).toBe(true);
  });

  it('marca a classe inteira', () => {
    @SemTransacaoNaBorda()
    class AlvoDeClasse {}

    expect(new Reflector().get(CHAVE_DE_SEM_TRANSACAO_NA_BORDA, AlvoDeClasse)).toBe(true);
  });
});
