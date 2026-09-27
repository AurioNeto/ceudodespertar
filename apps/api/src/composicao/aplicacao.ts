import { RequestMethod } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AMBIENTE } from '../shared/infrastructure/configuracao/esquema-de-ambiente.js';
import type { Ambiente } from '../shared/infrastructure/configuracao/esquema-de-ambiente.js';

export const PREFIXO_GLOBAL = 'api/v1';
export const ROTAS_FORA_DO_PREFIXO = [{ path: 'saude/*caminho', method: RequestMethod.ALL }];

export async function criarAplicacao(modulo: Type = AppModule): Promise<INestApplication> {
  const app = await NestFactory.create(modulo);
  app.setGlobalPrefix(PREFIXO_GLOBAL, { exclude: ROTAS_FORA_DO_PREFIXO });
  const ambiente = app.get<Ambiente>(AMBIENTE);
  app.enableCors({ origin: ambiente.ORIGENS_CORS.length > 0 ? ambiente.ORIGENS_CORS : false });
  return app;
}

export async function iniciarAplicacao(): Promise<void> {
  const app = await criarAplicacao();
  app.enableShutdownHooks();
  const ambiente = app.get<Ambiente>(AMBIENTE);
  await app.listen(ambiente.PORTA);
}
