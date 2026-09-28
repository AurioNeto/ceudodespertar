import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { BancoModule } from '../banco/banco.module.js';
import { Despachante } from './despachante.js';
import { RegistroDeConsumidores } from './registro-de-consumidores.js';
import { RepositorioDoOutbox } from './repositorio-do-outbox.js';
import { RepositorioDoOutboxPostgres } from './repositorio-do-outbox.postgres.js';
import { SinalizadorDeEventos } from './sinalizador-de-eventos.js';

@Module({
  imports: [DiscoveryModule, BancoModule],
  providers: [
    RegistroDeConsumidores,
    SinalizadorDeEventos,
    { provide: RepositorioDoOutbox, useClass: RepositorioDoOutboxPostgres },
    Despachante,
  ],
  exports: [RepositorioDoOutbox, SinalizadorDeEventos],
})
export class EventosModule {}
