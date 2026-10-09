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
import { ConcederPermissaoAoGrupo } from './application/grupos/conceder-permissao-ao-grupo.js';
import { LeitorDeGrupos } from './application/grupos/leitor-de-grupos.js';
import { RenomearGrupo } from './application/grupos/renomear-grupo.js';
import { RevogarPermissaoDoGrupo } from './application/grupos/revogar-permissao-do-grupo.js';
import { EntregaDeConvite } from './application/convite/entrega-de-convite.js';
import { EnviadorDeConvite } from './application/convite/enviador-de-convite.js';
import { GeradorDeTokenDeConvite } from './application/convite/gerador-de-token-de-convite.js';
import { ResolvedorDeConvite } from './application/convite/resolvedor-de-convite.js';
import { LeitorDoEu } from './application/leitor-do-eu.js';
import { ObterEu } from './application/obter-eu.js';
import { RegistradorDeUltimoAcesso } from './application/registrador-de-ultimo-acesso.js';
import { ConvidarUsuario } from './application/usuarios/convidar-usuario.js';
import { DefinirGruposDoUsuario } from './application/usuarios/definir-grupos-do-usuario.js';
import { DesativarUsuario } from './application/usuarios/desativar-usuario.js';
import { LeitorDeGruposDaInstituicao } from './application/usuarios/leitor-de-grupos-da-instituicao.js';
import { LeitorDeUsuarios } from './application/usuarios/leitor-de-usuarios.js';
import { ObterUsuario } from './application/usuarios/obter-usuario.js';
import { ListarUsuarios } from './application/usuarios/listar-usuarios.js';
import { ReativarUsuario } from './application/usuarios/reativar-usuario.js';
import { ReenviarConvite } from './application/usuarios/reenviar-convite.js';
import { RepositorioDeGrupo } from './domain/grupo/grupo.repo.js';
import { PoliticaDoUltimoAdministrador } from './domain/servicos/politica-do-ultimo-administrador.js';
import { RepositorioDeUsuario } from './domain/usuario/usuario.repo.js';
import { LeitorDaAdministracaoKysely } from './infrastructure/administracao/leitor-da-administracao.kysely.js';
import { TravaDaAdministracaoAdvisory } from './infrastructure/administracao/trava-da-administracao.advisory.js';
import { LeitorDeGruposKysely } from './infrastructure/grupos/leitor-de-grupos.kysely.js';
import { EnviadorDeConviteQueRegistra } from './infrastructure/convite/enviador-de-convite.que-registra.js';
import { GeradorDeTokenDeConviteNode } from './infrastructure/convite/gerador-de-token-de-convite.node.js';
import { ResolvedorDeConviteKysely } from './infrastructure/convite/resolvedor-de-convite.kysely.js';
import { LeitorDeGruposDaInstituicaoKysely } from './infrastructure/usuarios/leitor-de-grupos-da-instituicao.kysely.js';
import { LeitorDeUsuariosKysely } from './infrastructure/usuarios/leitor-de-usuarios.kysely.js';
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
import { GestaoDeGruposController } from './interface/http/gestao-de-grupos.controller.js';
import { GestaoDeUsuariosController } from './interface/http/gestao-de-usuarios.controller.js';

@Module({
  imports: [BancoModule, EventosModule],
  controllers: [EuController, AuditoriaController, GestaoDeUsuariosController, GestaoDeGruposController],
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
    { provide: LeitorDeGrupos, useClass: LeitorDeGruposKysely },
    ConcederPermissaoAoGrupo,
    RevogarPermissaoDoGrupo,
    RenomearGrupo,
    { provide: GeradorDeTokenDeConvite, useClass: GeradorDeTokenDeConviteNode },
    { provide: EnviadorDeConvite, useClass: EnviadorDeConviteQueRegistra },
    EntregaDeConvite,
    { provide: ResolvedorDeConvite, useClass: ResolvedorDeConviteKysely },
    { provide: LeitorDeGruposDaInstituicao, useClass: LeitorDeGruposDaInstituicaoKysely },
    { provide: LeitorDeUsuarios, useClass: LeitorDeUsuariosKysely },
    ConvidarUsuario,
    ReenviarConvite,
    ListarUsuarios,
    ObterUsuario,
    SemeadorDeGruposDeSistema,
    ObterEu,
    InvalidadorDoCacheDeAcesso,
    ResolvedorDeContextoDeAcessoDaIdentidade,
  ],
  exports: [ResolvedorDeContextoDeAcessoDaIdentidade, SemeadorDeGruposDeSistema],
})
export class IdentidadeModule {}
