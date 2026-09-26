import { Global, Module } from '@nestjs/common';
import { AMBIENTE, analisarAmbiente } from './esquema-de-ambiente.js';

@Global()
@Module({
  providers: [
    {
      provide: AMBIENTE,
      useFactory: () => analisarAmbiente(process.env),
    },
  ],
  exports: [AMBIENTE],
})
export class ConfiguracaoModule {}
