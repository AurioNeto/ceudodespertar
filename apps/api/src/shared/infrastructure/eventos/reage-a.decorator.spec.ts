import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ReageA, lerMetadadosReageA } from './reage-a.decorator.js';

class ConsumidorDeTeste {
  @ReageA('financeiro.LancamentoConfirmado', 'financeiro.confirma-lancamento')
  async aoConfirmar(): Promise<void> {}
}

describe('ReageA', () => {
  it('anota o método com o tipo do evento e a identidade explícita do consumidor', () => {
    const metadados = lerMetadadosReageA(ConsumidorDeTeste.prototype, 'aoConfirmar');

    expect(metadados).toEqual({
      tipo: 'financeiro.LancamentoConfirmado',
      consumidor: 'financeiro.confirma-lancamento',
    });
  });

  it('a identidade do consumidor não deriva do nome da classe: renomear a classe não muda a identidade', () => {
    class OutroNomeDeClasse {
      @ReageA('financeiro.LancamentoConfirmado', 'financeiro.confirma-lancamento')
      async aoConfirmar(): Promise<void> {}
    }

    expect(lerMetadadosReageA(OutroNomeDeClasse.prototype, 'aoConfirmar')).toEqual(
      lerMetadadosReageA(ConsumidorDeTeste.prototype, 'aoConfirmar'),
    );
  });

  it('não anota métodos sem o decorator', () => {
    class OutroConsumidor {
      async metodoQualquer(): Promise<void> {}
    }

    expect(lerMetadadosReageA(OutroConsumidor.prototype, 'metodoQualquer')).toBeUndefined();
  });
});
