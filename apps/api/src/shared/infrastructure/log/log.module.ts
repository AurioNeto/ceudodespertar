import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import type { HttpLogger } from 'pino-http';
import { AMBIENTE } from '../configuracao/esquema-de-ambiente.js';
import type { Ambiente } from '../configuracao/esquema-de-ambiente.js';
import { construirMiddlewareDeLogHttp, construirParametrosDoLogger } from './opcoes-do-logger.js';

export const MIDDLEWARE_DE_LOG_HTTP = Symbol('MIDDLEWARE_DE_LOG_HTTP');

@Module({})
class MiddlewareDeLogHttpModule {}

@Module({})
export class LogModule {
  static paraRaiz(destino?: DestinationStream): DynamicModule {
    const moduloDoMiddleware: DynamicModule = {
      module: MiddlewareDeLogHttpModule,
      providers: [
        {
          provide: MIDDLEWARE_DE_LOG_HTTP,
          inject: [AMBIENTE],
          useFactory: (ambiente: Ambiente) => construirMiddlewareDeLogHttp(ambiente.LOG_NIVEL, destino),
        },
      ],
      exports: [MIDDLEWARE_DE_LOG_HTTP],
    };
    return {
      module: LogModule,
      imports: [
        moduloDoMiddleware,
        LoggerModule.forRootAsync({
          imports: [moduloDoMiddleware],
          inject: [MIDDLEWARE_DE_LOG_HTTP],
          useFactory: (middleware: HttpLogger) => construirParametrosDoLogger(middleware),
        }),
      ],
      exports: [moduloDoMiddleware],
    };
  }
}
