import { Module } from '@nestjs/common';
import { AutenticacaoModule } from '../shared/infrastructure/autenticacao/autenticacao.module.js';
import { ConfiguracaoModule } from '../shared/infrastructure/configuracao/configuracao.module.js';
import { SaudeController } from '../shared/infrastructure/saude/saude.controller.js';

@Module({
  imports: [ConfiguracaoModule, AutenticacaoModule],
  controllers: [SaudeController],
})
export class AppModule {}
