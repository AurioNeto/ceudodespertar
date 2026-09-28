import { Module } from '@nestjs/common';
import { BancoModule } from '../banco/banco.module.js';
import { SaudeController } from './saude.controller.js';
import { VerificadorDeProntidao } from './verificador-de-prontidao.js';

@Module({
  imports: [BancoModule],
  controllers: [SaudeController],
  providers: [VerificadorDeProntidao],
})
export class SaudeModule {}
