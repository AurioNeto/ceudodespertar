import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import type { EventoDeDominio } from '../../kernel/evento-de-dominio.js';
import { lerMetadadosReageA } from './reage-a.decorator.js';

export type WrapperDeProvider = ReturnType<DiscoveryService['getProviders']>[number];

export interface ConsumidorRegistrado {
  readonly consumidor: string;
  readonly reagir: (evento: EventoDeDominio) => Promise<void>;
}

export class ErroDeConsumidorComEscopoNaoEstatico extends Error {
  constructor(nomeDaClasse: string) {
    super(
      `"${nomeDaClasse}" reage a eventos com @ReageA mas tem escopo não estático (REQUEST ou TRANSIENT) — ` +
        'o despachante roda fora de uma requisição e não tem como resolver essa instância',
    );
    this.name = 'ErroDeConsumidorComEscopoNaoEstatico';
  }
}

export class ErroDeConsumidorDuplicado extends Error {
  constructor(identidade: string) {
    super(
      `dois consumidores usam a mesma identidade "${identidade}" no @ReageA — ` +
        'essa identidade é a chave em shared.evento_processado e precisa ser única',
    );
    this.name = 'ErroDeConsumidorDuplicado';
  }
}

function metodosDecoradosComReageA(prototipo: object, scanner: MetadataScanner): string[] {
  return scanner
    .getAllMethodNames(prototipo)
    .filter((nomeDoMetodo) => lerMetadadosReageA(prototipo, nomeDoMetodo) !== undefined);
}

@Injectable()
export class RegistroDeConsumidores implements OnModuleInit {
  private readonly consumidoresPorTipo = new Map<string, ConsumidorRegistrado[]>();
  private readonly identidadesRegistradas = new Set<string>();

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
      this.descobrirNoWrapper(wrapper);
    }
  }

  private descobrirNoWrapper(wrapper: WrapperDeProvider): void {
    const metatype = wrapper.metatype;
    if (typeof metatype !== 'function') {
      return;
    }

    const prototipo = metatype.prototype as object;
    const metodosComReageA = metodosDecoradosComReageA(prototipo, this.scanner);
    if (metodosComReageA.length === 0) {
      return;
    }

    if (!wrapper.isDependencyTreeStatic()) {
      throw new ErroDeConsumidorComEscopoNaoEstatico(metatype.name);
    }

    const instancia = wrapper.instance as Record<string, unknown>;
    for (const nomeDoMetodo of metodosComReageA) {
      this.registrarMetodo(instancia, prototipo, nomeDoMetodo);
    }
  }

  private registrarMetodo(instancia: Record<string, unknown>, prototipo: object, nomeDoMetodo: string): void {
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
    if (this.identidadesRegistradas.has(consumidor.consumidor)) {
      throw new ErroDeConsumidorDuplicado(consumidor.consumidor);
    }
    this.identidadesRegistradas.add(consumidor.consumidor);

    const existentes = this.consumidoresPorTipo.get(tipo) ?? [];
    this.consumidoresPorTipo.set(tipo, [...existentes, consumidor]);
  }
}
