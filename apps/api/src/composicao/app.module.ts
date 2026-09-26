import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../shared/infrastructure/configuracao/configuracao.module.js';
import { SaudeController } from '../shared/infrastructure/saude/saude.controller.js';

@Module({
  imports: [ConfiguracaoModule],
  controllers: [SaudeController],
})
export class AppModule {}
