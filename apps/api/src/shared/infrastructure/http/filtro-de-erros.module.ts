import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { FiltroGlobalDeErros } from './filtro-global-de-erros.js';
import { PipeDeValidacaoZod } from './pipe-de-validacao-zod.js';

@Module({
  providers: [
    { provide: APP_FILTER, useClass: FiltroGlobalDeErros },
    { provide: APP_PIPE, useClass: PipeDeValidacaoZod },
  ],
})
export class FiltroDeErrosModule {}
