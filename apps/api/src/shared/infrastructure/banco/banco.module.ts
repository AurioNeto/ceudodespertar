import { Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { construirOpcoesDoOrm } from './configuracao-do-orm.js';
import { UnidadeDeTrabalho } from './unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from './unidade-de-trabalho.mikro-orm.js';

@Module({
  providers: [
    {
      provide: MikroORM,
      useFactory: () => MikroORM.init(construirOpcoesDoOrm(process.env)),
    },
    { provide: UnidadeDeTrabalho, useClass: UnidadeDeTrabalhoMikroOrm },
  ],
  exports: [MikroORM, UnidadeDeTrabalho],
})
export class BancoModule implements OnModuleDestroy {
  constructor(private readonly orm: MikroORM) {}

  async onModuleDestroy(): Promise<void> {
    await this.orm.close(true);
  }
}
