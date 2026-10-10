import { Injectable } from '@nestjs/common';
import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { ContextoDaRequisicao } from '../../../../shared/infrastructure/contexto-da-requisicao.js';
import { ReageA } from '../../../../shared/infrastructure/eventos/reage-a.decorator.js';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { ControleDeAcessoNoProvedor } from '../../application/usuarios/controle-de-acesso-no-provedor.js';
import { LeitorDoSujeitoDoUsuario } from '../../application/usuarios/leitor-do-sujeito-do-usuario.js';

export class EventoDeSituacaoSemInstituicao extends Error {
  constructor() {
    super('evento de situação do usuário processado sem instituição no contexto');
    this.name = 'EventoDeSituacaoSemInstituicao';
  }
}

@Injectable()
export class SincronizadorDoAcessoNoProvedor {
  constructor(
    private readonly sujeitos: LeitorDoSujeitoDoUsuario,
    private readonly controle: ControleDeAcessoNoProvedor,
  ) {}

  @ReageA('USUARIO_SUSPENSO', 'SincronizadorDoAcessoNoProvedor.aoSuspenderUsuario')
  aoSuspenderUsuario(evento: EventoDeDominio): Promise<void> {
    return this.convergir(evento);
  }

  @ReageA('USUARIO_REATIVADO', 'SincronizadorDoAcessoNoProvedor.aoReativarUsuario')
  aoReativarUsuario(evento: EventoDeDominio): Promise<void> {
    return this.convergir(evento);
  }

  private async convergir(evento: EventoDeDominio): Promise<void> {
    const instituicaoId = ContextoDaRequisicao.atual()?.instituicaoId;
    if (instituicaoId === undefined) throw new EventoDeSituacaoSemInstituicao();

    const usuario = await this.sujeitos.ler(evento.agregadoId as UsuarioId, instituicaoId as InstituicaoId);
    if (usuario?.subjectId == null) return;
    if (usuario.situacao === 'ATIVO') await this.controle.liberar(usuario.subjectId);
    else await this.controle.bloquear(usuario.subjectId);
  }
}
