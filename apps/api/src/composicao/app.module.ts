import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdentidadeModule, ResolvedorDeContextoDeAcessoDaIdentidade } from '../modules/identidade/public-api.js';
import { AutenticacaoModule } from '../shared/infrastructure/autenticacao/autenticacao.module.js';
import { BancoModule } from '../shared/infrastructure/banco/banco.module.js';
import { ConfiguracaoModule } from '../shared/infrastructure/configuracao/configuracao.module.js';
import { EventosModule } from '../shared/infrastructure/eventos/eventos.module.js';
import { BordaTransacionalInterceptor } from '../shared/infrastructure/http/borda-transacional.interceptor.js';
import { BordaTransacionalModule } from '../shared/infrastructure/http/borda-transacional.module.js';
import { FiltroDeErrosModule } from '../shared/infrastructure/http/filtro-de-erros.module.js';
import { IdempotenciaInterceptor } from '../shared/infrastructure/idempotencia/idempotencia.interceptor.js';
import { IdempotenciaModule } from '../shared/infrastructure/idempotencia/idempotencia.module.js';
import { LogModule } from '../shared/infrastructure/log/log.module.js';
import { SaudeModule } from '../shared/infrastructure/saude/saude.module.js';

@Module({
  imports: [
    ConfiguracaoModule,
    LogModule.paraRaiz(),
    BancoModule,
    EventosModule,
    BordaTransacionalModule,
    IdempotenciaModule,
    SaudeModule,
    FiltroDeErrosModule,
    IdentidadeModule,
    AutenticacaoModule.comResolvedor(IdentidadeModule, ResolvedorDeContextoDeAcessoDaIdentidade),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: BordaTransacionalInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotenciaInterceptor },
  ],
})
export class AppModule {}
