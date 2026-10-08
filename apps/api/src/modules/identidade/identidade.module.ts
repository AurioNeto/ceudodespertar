import { Module } from '@nestjs/common';
import { BancoModule } from '../../shared/infrastructure/banco/banco.module.js';
import { EventosModule } from '../../shared/infrastructure/eventos/eventos.module.js';
import { Relogio, RelogioDoSistema } from '../../shared/infrastructure/relogio.js';
import { ConsultarAuditoria } from './application/auditoria/consultar-auditoria.js';
import { LeitorDeAuditoria } from './application/auditoria/leitor-de-auditoria.js';
import { TrilhaDeAuditoria } from './application/auditoria/trilha-de-auditoria.js';
import { AlteracaoQuePodeTirarAdministrador } from './application/administracao/alteracao-que-pode-tirar-administrador.js';
import { LeitorDaAdministracao } from './application/administracao/leitor-da-administracao.js';
import { TravaDaAdministracao } from './application/administracao/trava-da-administracao.js';
import { LeitorDoEu } from './application/leitor-do-eu.js';
import { ObterEu } from './application/obter-eu.js';
import { RegistradorDeUltimoAcesso } from './application/registrador-de-ultimo-acesso.js';
import { DefinirGruposDoUsuario } from './application/usuarios/definir-grupos-do-usuario.js';
import { DesativarUsuario } from './application/usuarios/desativar-usuario.js';
import { ReativarUsuario } from './application/usuarios/reativar-usuario.js';
import { RepositorioDeGrupo } from './domain/grupo/grupo.repo.js';
import { PoliticaDoUltimoAdministrador } from './domain/servicos/politica-do-ultimo-administrador.js';
import { RepositorioDeUsuario } from './domain/usuario/usuario.repo.js';
import { LeitorDaAdministracaoKysely } from './infrastructure/administracao/leitor-da-administracao.kysely.js';
import { TravaDaAdministracaoAdvisory } from './infrastructure/administracao/trava-da-administracao.advisory.js';
import { GravadorDeTrilha } from './infrastructure/auditoria/gravador-de-trilha.js';
import { LeitorDeAuditoriaKysely } from './infrastructure/auditoria/leitor-de-auditoria.kysely.js';
import { CacheDeContextoDeAcesso } from './infrastructure/acesso/cache-de-contexto-de-acesso.js';
import { InvalidadorDoCacheDeAcesso } from './infrastructure/acesso/invalidador-do-cache-de-acesso.js';
import { LeitorDoEuKysely } from './infrastructure/acesso/leitor-do-eu.kysely.js';
import { RegistradorDeUltimoAcessoKysely } from './infrastructure/acesso/registrador-de-ultimo-acesso.kysely.js';
import { ResolvedorDeContextoDeAcessoDaIdentidade } from './infrastructure/acesso/resolvedor-de-contexto-de-acesso.da-identidade.js';
import { RegistroDasEntidadesDaIdentidade } from './infrastructure/persistencia/registro-das-entidades-da-identidade.js';
import { RepositorioDeGrupoMikroOrm } from './infrastructure/persistencia/repositorio-de-grupo.mikro-orm.js';
import { RepositorioDeUsuarioMikroOrm } from './infrastructure/persistencia/repositorio-de-usuario.mikro-orm.js';
import { SemeadorDeGruposDeSistema } from './infrastructure/persistencia/semeador-de-grupos-de-sistema.js';
import { AuditoriaController } from './interface/http/auditoria.controller.js';
import { EuController } from './interface/http/eu.controller.js';

@Module({
  imports: [BancoModule, EventosModule],
  controllers: [EuController, AuditoriaController],
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
    GravadorDeTrilha,
    { provide: TrilhaDeAuditoria, useExisting: GravadorDeTrilha },
    { provide: LeitorDeAuditoria, useClass: LeitorDeAuditoriaKysely },
    ConsultarAuditoria,
    { provide: RepositorioDeUsuario, useClass: RepositorioDeUsuarioMikroOrm },
    { provide: RepositorioDeGrupo, useClass: RepositorioDeGrupoMikroOrm },
    { provide: TravaDaAdministracao, useClass: TravaDaAdministracaoAdvisory },
    { provide: LeitorDaAdministracao, useClass: LeitorDaAdministracaoKysely },
    PoliticaDoUltimoAdministrador,
    AlteracaoQuePodeTirarAdministrador,
    DesativarUsuario,
    ReativarUsuario,
    DefinirGruposDoUsuario,
    SemeadorDeGruposDeSistema,
    ObterEu,
    InvalidadorDoCacheDeAcesso,
    ResolvedorDeContextoDeAcessoDaIdentidade,
  ],
  exports: [ResolvedorDeContextoDeAcessoDaIdentidade, SemeadorDeGruposDeSistema],
})
export class IdentidadeModule {}
