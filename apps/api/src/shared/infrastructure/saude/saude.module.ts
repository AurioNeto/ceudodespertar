import { Inject, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { Pool } from 'pg';
import { POOL_DA_PRONTIDAO, criarPoolDaProntidao } from '../banco/pool-da-prontidao.js';
import { SaudeController } from './saude.controller.js';
import { VerificadorDeProntidao } from './verificador-de-prontidao.js';

@Module({
  controllers: [SaudeController],
  providers: [{ provide: POOL_DA_PRONTIDAO, useFactory: () => criarPoolDaProntidao() }, VerificadorDeProntidao],
})
export class SaudeModule implements OnModuleDestroy {
  constructor(@Inject(POOL_DA_PRONTIDAO) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
