import { Module } from '@nestjs/common';
import { BancoModule } from '../../shared/infrastructure/banco/banco.module.js';
import { EventosMinimos } from './application/eventos-minimos.js';
import { EventosMinimosKysely } from './infrastructure/eventos-minimos.kysely.js';

@Module({
  imports: [BancoModule],
  providers: [{ provide: EventosMinimos, useClass: EventosMinimosKysely }],
  exports: [EventosMinimos],
})
export class EventosMinimosModule {}
