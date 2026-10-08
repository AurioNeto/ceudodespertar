import { Module } from '@nestjs/common';
import { IdentidadeModule, ResolvedorDeContextoDeAcessoDaIdentidade } from '../modules/identidade/public-api.js';
import { AutenticacaoModule } from '../shared/infrastructure/autenticacao/autenticacao.module.js';
import { BancoModule } from '../shared/infrastructure/banco/banco.module.js';
import { ConfiguracaoModule } from '../shared/infrastructure/configuracao/configuracao.module.js';
import { FiltroDeErrosModule } from '../shared/infrastructure/http/filtro-de-erros.module.js';
import { LogModule } from '../shared/infrastructure/log/log.module.js';
import { SaudeModule } from '../shared/infrastructure/saude/saude.module.js';

@Module({
  imports: [
    ConfiguracaoModule,
    LogModule.paraRaiz(),
    BancoModule,
    SaudeModule,
    FiltroDeErrosModule,
    IdentidadeModule,
    AutenticacaoModule.comResolvedor(IdentidadeModule, ResolvedorDeContextoDeAcessoDaIdentidade),
  ],
})
export class AppModule {}
