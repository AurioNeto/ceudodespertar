import 'reflect-metadata';
import { Injectable, Scope } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ReageA } from './reage-a.decorator.js';
import {
  ErroDeConsumidorComEscopoNaoEstatico,
  ErroDeConsumidorDuplicado,
  RegistroDeConsumidores,
} from './registro-de-consumidores.js';
import type { WrapperDeProvider } from './registro-de-consumidores.js';

function wrapperEstatico(metatype: new (...args: never[]) => object, instancia: object): WrapperDeProvider {
  return {
    metatype,
    instance: instancia,
    isDependencyTreeStatic: () => true,
  } as unknown as WrapperDeProvider;
}

function wrapperComEscopoDeRequisicao(metatype: new (...args: never[]) => object): WrapperDeProvider {
  return {
    metatype,
    instance: undefined,
    isDependencyTreeStatic: () => false,
  } as unknown as WrapperDeProvider;
}

function descobertaFalsa(wrappers: WrapperDeProvider[]): DiscoveryService {
  return { getProviders: () => wrappers } as unknown as DiscoveryService;
}

describe('RegistroDeConsumidores', () => {
  it('registra um consumidor e o entrega para o tipo anotado', () => {
    @Injectable()
    class ConsumidorA {
      @ReageA('teste.Evento', 'ConsumidorA')
      async reagir(): Promise<void> {}
    }
    const instancia = new ConsumidorA();
    const registro = new RegistroDeConsumidores(descobertaFalsa([wrapperEstatico(ConsumidorA, instancia)]), new MetadataScanner());

    registro.onModuleInit();

    expect(registro.consumidoresPara('teste.Evento').map((c) => c.consumidor)).toEqual(['ConsumidorA']);
  });

  it('registra os dois consumidores quando duas classes reagem ao mesmo tipo', () => {
    @Injectable()
    class ConsumidorFinanceiro {
      @ReageA('teste.EventoCompartilhado', 'financeiro')
      async reagir(): Promise<void> {}
    }
    @Injectable()
    class ConsumidorEstoque {
      @ReageA('teste.EventoCompartilhado', 'estoque')
      async reagir(): Promise<void> {}
    }

    const registro = new RegistroDeConsumidores(
      descobertaFalsa([
        wrapperEstatico(ConsumidorFinanceiro, new ConsumidorFinanceiro()),
        wrapperEstatico(ConsumidorEstoque, new ConsumidorEstoque()),
      ]),
      new MetadataScanner(),
    );

    registro.onModuleInit();

    expect(registro.consumidoresPara('teste.EventoCompartilhado').map((c) => c.consumidor).toSorted()).toEqual([
      'estoque',
      'financeiro',
    ]);
  });

  it('lança ErroDeConsumidorDuplicado quando duas identidades de @ReageA colidem', () => {
    @Injectable()
    class Primeiro {
      @ReageA('teste.EventoA', 'mesma-identidade')
      async reagir(): Promise<void> {}
    }
    @Injectable()
    class Segundo {
      @ReageA('teste.EventoB', 'mesma-identidade')
      async reagir(): Promise<void> {}
    }

    const registro = new RegistroDeConsumidores(
      descobertaFalsa([wrapperEstatico(Primeiro, new Primeiro()), wrapperEstatico(Segundo, new Segundo())]),
      new MetadataScanner(),
    );

    expect(() => registro.onModuleInit()).toThrow(ErroDeConsumidorDuplicado);
  });

  it('lança ErroDeConsumidorComEscopoNaoEstatico quando o consumidor tem Scope.REQUEST', () => {
    @Injectable({ scope: Scope.REQUEST })
    class ConsumidorPorRequisicao {
      @ReageA('teste.EventoRequest', 'porRequisicao')
      async reagir(): Promise<void> {}
    }

    const registro = new RegistroDeConsumidores(
      descobertaFalsa([wrapperComEscopoDeRequisicao(ConsumidorPorRequisicao)]),
      new MetadataScanner(),
    );

    expect(() => registro.onModuleInit()).toThrow(ErroDeConsumidorComEscopoNaoEstatico);
  });

  it('ignora providers sem métodos anotados com @ReageA', () => {
    class ProviderComum {
      metodoQualquer(): void {}
    }

    const registro = new RegistroDeConsumidores(
      descobertaFalsa([wrapperEstatico(ProviderComum, new ProviderComum())]),
      new MetadataScanner(),
    );

    expect(() => registro.onModuleInit()).not.toThrow();
    expect(registro.consumidoresPara('qualquer.tipo')).toEqual([]);
  });
});
