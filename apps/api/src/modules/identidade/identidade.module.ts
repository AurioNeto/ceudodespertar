import { Module } from '@nestjs/common';
import { BancoModule } from '../../shared/infrastructure/banco/banco.module.js';
import { Relogio, RelogioDoSistema } from '../../shared/infrastructure/relogio.js';
import { LeitorDoEu } from './application/leitor-do-eu.js';
import { ObterEu } from './application/obter-eu.js';
import { RegistradorDeUltimoAcesso } from './application/registrador-de-ultimo-acesso.js';
import { CacheDeContextoDeAcesso } from './infrastructure/acesso/cache-de-contexto-de-acesso.js';
import { InvalidadorDoCacheDeAcesso } from './infrastructure/acesso/invalidador-do-cache-de-acesso.js';
import { LeitorDoEuKysely } from './infrastructure/acesso/leitor-do-eu.kysely.js';
import { RegistradorDeUltimoAcessoKysely } from './infrastructure/acesso/registrador-de-ultimo-acesso.kysely.js';
import { ResolvedorDeContextoDeAcessoDaIdentidade } from './infrastructure/acesso/resolvedor-de-contexto-de-acesso.da-identidade.js';
import { RegistroDasEntidadesDaIdentidade } from './infrastructure/persistencia/registro-das-entidades-da-identidade.js';
import { EuController } from './interface/http/eu.controller.js';

@Module({
  imports: [BancoModule],
  controllers: [EuController],
  providers: [
    { provide: Relogio, useClass: RelogioDoSistema },
    {
      provide: CacheDeContextoDeAcesso,
      inject: [Relogio],
      useFactory: (relogio: Relogio) => new CacheDeContextoDeAcesso(relogio),
    },
    { provide: LeitorDoEu, useClass: LeitorDoEuKysely },
    { provide: RegistradorDeUltimoAcesso, useClass: RegistradorDeUltimoAcessoKysely },
    RegistroDasEntidadesDaIdentidade,
    ObterEu,
    InvalidadorDoCacheDeAcesso,
    ResolvedorDeContextoDeAcessoDaIdentidade,
  ],
  exports: [ResolvedorDeContextoDeAcessoDaIdentidade],
})
export class IdentidadeModule {}
