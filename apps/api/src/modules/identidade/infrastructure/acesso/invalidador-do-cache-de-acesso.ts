import { Injectable } from '@nestjs/common';
import { ContextoDaRequisicao } from '../../../../shared/infrastructure/contexto-da-requisicao.js';
import { ReageA } from '../../../../shared/infrastructure/eventos/reage-a.decorator.js';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { CacheDeContextoDeAcesso } from './cache-de-contexto-de-acesso.js';

@Injectable()
export class InvalidadorDoCacheDeAcesso {
  constructor(private readonly cache: CacheDeContextoDeAcesso) {}

  @ReageA('GRUPO_ALTERADO', 'InvalidadorDoCacheDeAcesso.aoAlterarGruposDoUsuario')
  aoAlterarGruposDoUsuario(evento: EventoDeDominio): Promise<void> {
    return this.invalidarUsuario(evento);
  }

  @ReageA('USUARIO_ATIVADO', 'InvalidadorDoCacheDeAcesso.aoAtivarUsuario')
  aoAtivarUsuario(evento: EventoDeDominio): Promise<void> {
    return this.invalidarUsuario(evento);
  }

  @ReageA('USUARIO_SUSPENSO', 'InvalidadorDoCacheDeAcesso.aoSuspenderUsuario')
  aoSuspenderUsuario(evento: EventoDeDominio): Promise<void> {
    return this.invalidarUsuario(evento);
  }

  @ReageA('USUARIO_REATIVADO', 'InvalidadorDoCacheDeAcesso.aoReativarUsuario')
  aoReativarUsuario(evento: EventoDeDominio): Promise<void> {
    return this.invalidarUsuario(evento);
  }

  @ReageA('GRUPO_EDITADO', 'InvalidadorDoCacheDeAcesso.aoEditarGrupo')
  aoEditarGrupo(): Promise<void> {
    const instituicaoId = ContextoDaRequisicao.atual()?.instituicaoId;
    if (instituicaoId === undefined) this.cache.invalidarTudo();
    else this.cache.invalidarInstituicao(instituicaoId);
    return Promise.resolve();
  }

  private invalidarUsuario(evento: EventoDeDominio): Promise<void> {
    this.cache.invalidarUsuario(evento.agregadoId);
    return Promise.resolve();
  }
}
