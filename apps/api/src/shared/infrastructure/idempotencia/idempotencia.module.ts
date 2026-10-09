import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { BancoModule } from '../banco/banco.module.js';
import { ExpurgoDeChavesDeIdempotencia } from './expurgo-de-chaves-de-idempotencia.js';
import { IdempotenciaInterceptor } from './idempotencia.interceptor.js';
import { VerificadorDeSemIdempotenciaDasRotas } from './verificador-de-sem-idempotencia-das-rotas.js';

@Module({
  imports: [BancoModule, DiscoveryModule],
  providers: [IdempotenciaInterceptor, ExpurgoDeChavesDeIdempotencia, VerificadorDeSemIdempotenciaDasRotas],
  exports: [IdempotenciaInterceptor],
})
export class IdempotenciaModule {}
