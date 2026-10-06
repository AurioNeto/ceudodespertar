import { Module } from '@nestjs/common';
import { BancoModule } from '../banco/banco.module.js';
import { IdempotenciaInterceptor } from './idempotencia.interceptor.js';

@Module({
  imports: [BancoModule],
  providers: [IdempotenciaInterceptor],
  exports: [IdempotenciaInterceptor],
})
export class IdempotenciaModule {}
