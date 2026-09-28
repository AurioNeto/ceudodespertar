import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import { AMBIENTE } from '../configuracao/esquema-de-ambiente.js';
import type { Ambiente } from '../configuracao/esquema-de-ambiente.js';
import { construirParametrosDoLogger } from './opcoes-do-logger.js';

@Module({})
export class LogModule {
  static paraRaiz(destino?: DestinationStream): DynamicModule {
    return {
      module: LogModule,
      imports: [
        LoggerModule.forRootAsync({
          inject: [AMBIENTE],
          useFactory: (ambiente: Ambiente) => construirParametrosDoLogger(ambiente.LOG_NIVEL, destino),
        }),
      ],
    };
  }
}
