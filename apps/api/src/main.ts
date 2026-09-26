import 'reflect-metadata';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { type INestApplication, RequestMethod } from '@nestjs/common';
import { AppModule } from './composicao/app.module.js';
import {
  AMBIENTE,
  type Ambiente,
  ErroDeAmbienteInvalido,
} from './shared/infrastructure/configuracao/esquema-de-ambiente.js';

const PREFIXO_GLOBAL = 'api/v1';
const ROTAS_FORA_DO_PREFIXO = [{ path: 'saude/*caminho', method: RequestMethod.ALL }];

export async function criarAplicacao(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.setGlobalPrefix(PREFIXO_GLOBAL, { exclude: ROTAS_FORA_DO_PREFIXO });
  const ambiente = app.get<Ambiente>(AMBIENTE);
  app.enableCors({ origin: ambiente.ORIGENS_CORS.length > 0 ? ambiente.ORIGENS_CORS : false });
  return app;
}

async function iniciar(): Promise<void> {
  const app = await criarAplicacao();
  app.enableShutdownHooks();
  const ambiente = app.get<Ambiente>(AMBIENTE);
  await app.listen(ambiente.PORTA);
}

const executadoDiretamente = process.argv[1] === fileURLToPath(import.meta.url);

if (executadoDiretamente) {
  iniciar().catch((erro: unknown) => {
    if (erro instanceof ErroDeAmbienteInvalido) {
      process.stderr.write(`${erro.problemas.join('\n')}\n`);
      process.exitCode = 1;
      return;
    }
    console.error(erro);
    process.exitCode = 1;
  });
}
