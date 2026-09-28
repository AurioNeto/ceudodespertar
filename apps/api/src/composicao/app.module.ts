import { Module } from '@nestjs/common';
import { BancoModule } from '../shared/infrastructure/banco/banco.module.js';
import { ConfiguracaoModule } from '../shared/infrastructure/configuracao/configuracao.module.js';
import { LogModule } from '../shared/infrastructure/log/log.module.js';
import { SaudeModule } from '../shared/infrastructure/saude/saude.module.js';

@Module({
  imports: [ConfiguracaoModule, LogModule.paraRaiz(), BancoModule, SaudeModule],
})
export class AppModule {}
