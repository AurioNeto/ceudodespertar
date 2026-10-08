import { Module } from '@nestjs/common';
import { BancoModule } from '../banco/banco.module.js';
import { ExpurgoDeChavesDeIdempotencia } from './expurgo-de-chaves-de-idempotencia.js';
import { IdempotenciaInterceptor } from './idempotencia.interceptor.js';

@Module({
  imports: [BancoModule],
  providers: [IdempotenciaInterceptor, ExpurgoDeChavesDeIdempotencia],
  exports: [IdempotenciaInterceptor],
})
export class IdempotenciaModule {}
