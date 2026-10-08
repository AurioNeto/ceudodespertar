import { Injectable } from '@nestjs/common';
import { OptimisticLockError } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { CodigoGrupo, GrupoId, Permissao } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { RepositorioDoOutbox } from '../../../../shared/infrastructure/eventos/repositorio-do-outbox.js';
import { GravadorDeTrilha } from '../auditoria/gravador-de-trilha.js';
import { Grupo } from '../../domain/grupo/grupo.js';
import type { RepositorioDeGrupo } from '../../domain/grupo/grupo.repo.js';
import { GrupoEntidade, GrupoPermissaoEntidade } from './entidades-de-grupo.js';
import { instituicaoDoContexto } from './instituicao-do-contexto.js';

const NOME_DO_AGREGADO = 'Grupo';

@Injectable()
export class RepositorioDeGrupoMikroOrm implements RepositorioDeGrupo {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly outbox: RepositorioDoOutbox,
    private readonly trilha: GravadorDeTrilha,
  ) {}

  porId(id: GrupoId): Promise<Grupo | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ em }) => {
      const grupo = await em.findOne(GrupoEntidade, { id }, { refresh: true });
      if (grupo === null) return undefined;
      const permissoes = await em.find(GrupoPermissaoEntidade, { grupoId: id }, { refresh: true });
      return Grupo.reconstituir({
        id,
        codigoSistema: (grupo.codigoSistema ?? null) as CodigoGrupo | null,
        nome: grupo.nome,
        descricao: grupo.descricao,
        protegido: grupo.protegido,
        ativo: grupo.ativo,
        permissoes: permissoes.map((linha) => linha.permissao as Permissao),
        versao: grupo.versao,
      });
    });
  }

  async adicionar(grupo: Grupo): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    return this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
      const eventos = grupo.retirarEventos();
      await this.trilha.gravarEventos(contexto, eventos);
      await contexto.em.insert(GrupoEntidade, {
        id: grupo.id,
        instituicaoId,
        codigoSistema: grupo.codigoSistema,
        nome: grupo.nome,
        descricao: grupo.descricao,
        protegido: grupo.protegido,
        ativo: grupo.ativo,
        versao: grupo.versao,
      });
      await this.gravarPermissoes(contexto.em, grupo, instituicaoId);
      await this.outbox.gravar(contexto, eventos);
    });
  }

  async salvar(grupo: Grupo): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    return this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
      const eventos = grupo.retirarEventos();
      await this.trilha.gravarEventos(contexto, eventos);
      const atualizados = await contexto.em.nativeUpdate(
        GrupoEntidade,
        { id: grupo.id, versao: grupo.versao },
        { nome: grupo.nome, descricao: grupo.descricao, ativo: grupo.ativo, versao: grupo.versao + 1 },
      );
      if (atualizados === 0) throw OptimisticLockError.lockFailed(NOME_DO_AGREGADO);
      await this.gravarPermissoes(contexto.em, grupo, instituicaoId);
      await this.outbox.gravar(contexto, eventos);
    });
  }

  private async gravarPermissoes(em: EntityManager, grupo: Grupo, instituicaoId: string): Promise<void> {
    const gravadas = (await em.find(GrupoPermissaoEntidade, { grupoId: grupo.id }, { refresh: true })).map(
      (linha) => linha.permissao,
    );
    const revogadas = gravadas.filter((permissao) => !grupo.possui(permissao as Permissao));
    if (revogadas.length > 0) {
      await em.nativeDelete(GrupoPermissaoEntidade, { grupoId: grupo.id, permissao: { $in: revogadas } });
    }
    const concedidas = grupo.permissoes.filter((permissao) => !gravadas.includes(permissao));
    if (concedidas.length > 0) {
      await em.insertMany(
        GrupoPermissaoEntidade,
        concedidas.map((permissao) => ({ grupoId: grupo.id, permissao, instituicaoId })),
      );
    }
  }
}
