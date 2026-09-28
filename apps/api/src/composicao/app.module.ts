import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../shared/infrastructure/configuracao/configuracao.module.js';
import { FiltroDeErrosModule } from '../shared/infrastructure/http/filtro-de-erros.module.js';
import { SaudeController } from '../shared/infrastructure/saude/saude.controller.js';

@Module({
  imports: [ConfiguracaoModule, FiltroDeErrosModule],
  controllers: [SaudeController],
})
export class AppModule {}
