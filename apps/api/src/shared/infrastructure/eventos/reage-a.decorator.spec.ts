import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ReageA, lerMetadadosReageA } from './reage-a.decorator.js';

class ConsumidorDeTeste {
  @ReageA('financeiro.LancamentoConfirmado')
  async aoConfirmar(): Promise<void> {}
}

describe('ReageA', () => {
  it('anota o método com o tipo do evento e o nome do consumidor', () => {
    const metadados = lerMetadadosReageA(ConsumidorDeTeste.prototype, 'aoConfirmar');

    expect(metadados).toEqual({
      tipo: 'financeiro.LancamentoConfirmado',
      consumidor: 'ConsumidorDeTeste.aoConfirmar',
    });
  });

  it('não anota métodos sem o decorator', () => {
    class OutroConsumidor {
      async metodoQualquer(): Promise<void> {}
    }

    expect(lerMetadadosReageA(OutroConsumidor.prototype, 'metodoQualquer')).toBeUndefined();
  });
});
