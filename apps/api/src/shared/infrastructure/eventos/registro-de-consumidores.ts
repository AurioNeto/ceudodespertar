import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import type { EventoDeDominio } from '../../kernel/evento-de-dominio.js';
import { lerMetadadosReageA } from './reage-a.decorator.js';

export interface ConsumidorRegistrado {
  readonly consumidor: string;
  readonly reagir: (evento: EventoDeDominio) => Promise<void>;
}

function ehInstanciaDescobrivel(instancia: unknown): instancia is Record<string, unknown> {
  return typeof instancia === 'object' && instancia !== null;
}

@Injectable()
export class RegistroDeConsumidores implements OnModuleInit {
  private readonly consumidoresPorTipo = new Map<string, ConsumidorRegistrado[]>();

  constructor(
    private readonly descoberta: DiscoveryService,
    private readonly scanner: MetadataScanner,
  ) {}

  onModuleInit(): void {
    this.descobrir();
  }

  consumidoresPara(tipo: string): readonly ConsumidorRegistrado[] {
    return this.consumidoresPorTipo.get(tipo) ?? [];
  }

  private descobrir(): void {
    for (const wrapper of this.descoberta.getProviders()) {
      this.descobrirNaInstancia(wrapper.instance);
    }
  }

  private descobrirNaInstancia(instancia: unknown): void {
    if (!ehInstanciaDescobrivel(instancia)) {
      return;
    }

    const prototipo = Object.getPrototypeOf(instancia) as object;
    for (const nomeDoMetodo of this.scanner.getAllMethodNames(prototipo)) {
      this.descobrirNoMetodo(instancia, prototipo, nomeDoMetodo);
    }
  }

  private descobrirNoMetodo(instancia: Record<string, unknown>, prototipo: object, nomeDoMetodo: string): void {
    const metadados = lerMetadadosReageA(prototipo, nomeDoMetodo);
    const metodo = instancia[nomeDoMetodo];
    if (metadados === undefined || typeof metodo !== 'function') {
      return;
    }

    this.registrar(metadados.tipo, {
      consumidor: metadados.consumidor,
      reagir: (evento) => (metodo as (evento: EventoDeDominio) => Promise<void>).call(instancia, evento),
    });
  }

  private registrar(tipo: string, consumidor: ConsumidorRegistrado): void {
    const existentes = this.consumidoresPorTipo.get(tipo) ?? [];
    this.consumidoresPorTipo.set(tipo, [...existentes, consumidor]);
  }
}
