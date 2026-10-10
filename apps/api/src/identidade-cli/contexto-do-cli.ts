import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BootstrapDaIdentidade, EnviadorDeConvite, IdentidadeModule, SemeaduraDeDemonstracao } from '../modules/identidade/public-api.js';
import { BancoModule } from '../shared/infrastructure/banco/banco.module.js';
import { ConfiguracaoModule } from '../shared/infrastructure/configuracao/configuracao.module.js';
import { EventosModule } from '../shared/infrastructure/eventos/eventos.module.js';
import type { ContextoDoCli } from './executar-cli.js';

@Module({ imports: [ConfiguracaoModule, BancoModule, EventosModule, IdentidadeModule] })
export class ModuloDoCliDaIdentidade {}

export async function abrirContextoDoCli(): Promise<ContextoDoCli> {
  const aplicacao = await NestFactory.createApplicationContext(ModuloDoCliDaIdentidade, {
    logger: false,
    abortOnError: false,
  });
  return {
    dependencias: {
      bootstrap: aplicacao.get(BootstrapDaIdentidade),
      enviador: aplicacao.get(EnviadorDeConvite),
      semeadura: aplicacao.get(SemeaduraDeDemonstracao),
    },
    encerrar: () => aplicacao.close(),
  };
}
