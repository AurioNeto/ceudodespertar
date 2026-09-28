import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import type { INestApplicationContext, Provider } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BancoModule } from '../../src/shared/infrastructure/banco/banco.module.js';
import { EventosModule } from '../../src/shared/infrastructure/eventos/eventos.module.js';
import { gerarUuidV7 } from '../../src/shared/kernel/ids.js';
import type { EventoDeDominio } from '../../src/shared/kernel/evento-de-dominio.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

export const INSTITUICAO_A = 'a0000000-0000-0000-0000-000000000000';
export const INSTITUICAO_B = 'b0000000-0000-0000-0000-000000000000';

export async function semearInstituicoes(banco: BancoDeTeste): Promise<void> {
  await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2), ($3, $4)', [
    INSTITUICAO_A,
    'Casa A',
    INSTITUICAO_B,
    'Casa B',
  ]);
}

export function criarEvento(sobrescritas: Partial<EventoDeDominio> = {}): EventoDeDominio {
  return {
    eventoId: gerarUuidV7(),
    tipo: 'teste.EventoDeTeste',
    ocorridoEm: new Date(),
    agregadoTipo: 'AgregadoDeTeste',
    agregadoId: randomUUID(),
    dados: {},
    ...sobrescritas,
  };
}

export async function subirContextoDeEventos(
  banco: BancoDeTeste,
  providers: Provider[] = [],
): Promise<INestApplicationContext> {
  process.env.BANCO_URL = urlDoAppPara(banco);
  process.env.BANCO_POOL_MAXIMO = '5';

  @Module({ imports: [EventosModule, BancoModule], providers })
  class ModuloDeTeste {}

  return NestFactory.createApplicationContext(ModuloDeTeste, { logger: false, abortOnError: false });
}

export async function encerrarContextoDeEventos(app: INestApplicationContext): Promise<void> {
  await app.close();
  delete process.env.BANCO_URL;
  delete process.env.BANCO_POOL_MAXIMO;
}
