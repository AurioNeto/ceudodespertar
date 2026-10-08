import { Injectable } from '@nestjs/common';
import { OptimisticLockError } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { GrupoId, PessoaId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { RepositorioDoOutbox } from '../../../../shared/infrastructure/eventos/repositorio-do-outbox.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { GravadorDeTrilha } from '../auditoria/gravador-de-trilha.js';
import { Convite } from '../../domain/usuario/convite.js';
import { Usuario } from '../../domain/usuario/usuario.js';
import type { AtribuicaoDeGrupo } from '../../domain/usuario/usuario.js';
import type { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { ConviteEntidade, UsuarioEntidade, UsuarioGrupoEntidade } from './entidades-de-usuario.js';
import { instituicaoDoContexto } from './instituicao-do-contexto.js';

const NOME_DO_AGREGADO = 'Usuario';
const CODIFICACAO_DO_HASH = 'hex';

export class ErroDeGrupoSemAtribuicao extends Error {
  constructor(usuarioId: UsuarioId) {
    super(`grupo do usuário ${usuarioId} sem registro de quem atribuiu`);
    this.name = 'ErroDeGrupoSemAtribuicao';
  }
}

function hashParaBytes(hash: string): Buffer {
  return Buffer.from(hash, CODIFICACAO_DO_HASH);
}

function bytesParaHash(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString(CODIFICACAO_DO_HASH);
}

function paraConvite(linha: {
  tokenSha256: Uint8Array;
  expiraEm: Date;
  criadoPor: string;
  criadoEm: Date;
  usadoEm?: Date | null;
  revogadoEm?: Date | null;
}): Convite {
  return Convite.reconstituir({
    hashDoToken: bytesParaHash(linha.tokenSha256),
    expiraEm: linha.expiraEm,
    criadoPor: linha.criadoPor as UsuarioId,
    criadoEm: linha.criadoEm,
    usadoEm: linha.usadoEm ?? null,
    revogadoEm: linha.revogadoEm ?? null,
  });
}

@Injectable()
export class RepositorioDeUsuarioMikroOrm implements RepositorioDeUsuario {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly outbox: RepositorioDoOutbox,
    private readonly trilha: GravadorDeTrilha,
  ) {}

  porId(id: UsuarioId): Promise<Usuario | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ em }) => {
      const usuario = await em.findOne(UsuarioEntidade, { id }, { refresh: true });
      if (usuario === null) return undefined;
      const grupos = await em.find(UsuarioGrupoEntidade, { usuarioId: id }, { refresh: true });
      const conviteAtual = await em.findOne(
        ConviteEntidade,
        { usuarioId: id, revogadoEm: null },
        { orderBy: { criadoEm: 'desc' }, refresh: true },
      );
      return Usuario.reconstituir(
        {
          id,
          pessoaId: (usuario.pessoaId ?? null) as PessoaId | null,
          subjectId: usuario.subjectId ?? null,
          nome: usuario.nome,
          email: usuario.email,
          situacao: usuario.situacao as SituacaoUsuario,
          grupos: grupos.map((atribuicao) => atribuicao.grupoId as GrupoId),
          ativadoEm: usuario.ativadoEm ?? null,
          suspensoEm: usuario.suspensoEm ?? null,
          ultimoAcessoEm: usuario.ultimoAcessoEm ?? null,
          convite: conviteAtual === null ? null : paraConvite(conviteAtual),
        },
        usuario.versao,
      );
    });
  }

  async adicionar(usuario: Usuario): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    return this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
      const eventos = usuario.retirarEventos();
      await this.trilha.gravarEventos(contexto, eventos);
      await contexto.em.insert(UsuarioEntidade, {
        id: usuario.id,
        instituicaoId,
        subjectId: usuario.subjectId,
        pessoaId: usuario.pessoaId,
        nome: usuario.nome,
        email: usuario.email,
        situacao: usuario.situacao,
        ativadoEm: usuario.ativadoEm,
        suspensoEm: usuario.suspensoEm,
        ultimoAcessoEm: usuario.ultimoAcessoEm,
        versao: usuario.versao,
      });
      await this.gravarConvites(contexto.em, usuario, instituicaoId);
      await this.gravarGrupos(contexto.em, usuario, instituicaoId);
      await this.outbox.gravar(contexto, eventos);
    });
  }

  async salvar(usuario: Usuario): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    return this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
      const eventos = usuario.retirarEventos();
      await this.trilha.gravarEventos(contexto, eventos);
      const atualizadas = await contexto.em.nativeUpdate(
        UsuarioEntidade,
        { id: usuario.id, versao: usuario.versao },
        {
          subjectId: usuario.subjectId,
          pessoaId: usuario.pessoaId,
          nome: usuario.nome,
          email: usuario.email,
          situacao: usuario.situacao,
          ativadoEm: usuario.ativadoEm,
          suspensoEm: usuario.suspensoEm,
          ultimoAcessoEm: usuario.ultimoAcessoEm,
          versao: usuario.versao + 1,
        },
      );
      if (atualizadas === 0) throw OptimisticLockError.lockFailed(NOME_DO_AGREGADO);
      await this.gravarConvites(contexto.em, usuario, instituicaoId);
      await this.gravarGrupos(contexto.em, usuario, instituicaoId);
      await this.outbox.gravar(contexto, eventos);
    });
  }

  private async gravarConvites(em: EntityManager, usuario: Usuario, instituicaoId: string): Promise<void> {
    const convites = usuario.convite === null ? usuario.convitesSubstituidos : [...usuario.convitesSubstituidos, usuario.convite];
    for (const convite of convites) {
      // eslint-disable-next-line no-await-in-loop -- revogados antes do vigente, para respeitar o índice de convite vigente único
      await this.gravarConvite(em, usuario.id, convite, instituicaoId);
    }
  }

  private async gravarConvite(
    em: EntityManager,
    usuarioId: UsuarioId,
    convite: Convite,
    instituicaoId: string,
  ): Promise<void> {
    const tokenSha256 = hashParaBytes(convite.hashDoToken);
    const atualizados = await em.nativeUpdate(
      ConviteEntidade,
      { usuarioId, tokenSha256 },
      { expiraEm: convite.expiraEm, usadoEm: convite.usadoEm, revogadoEm: convite.revogadoEm },
    );
    if (atualizados > 0) return;
    await em.insert(ConviteEntidade, {
      id: gerarUuidV7(),
      instituicaoId,
      usuarioId,
      tokenSha256,
      expiraEm: convite.expiraEm,
      usadoEm: convite.usadoEm,
      revogadoEm: convite.revogadoEm,
      criadoPor: convite.criadoPor,
      criadoEm: convite.criadoEm,
    });
  }

  private async gravarGrupos(em: EntityManager, usuario: Usuario, instituicaoId: string): Promise<void> {
    const gravados = await em.find(UsuarioGrupoEntidade, { usuarioId: usuario.id }, { refresh: true });
    const idsGravados = gravados.map((atribuicao) => atribuicao.grupoId);
    const removidos = idsGravados.filter((grupoId) => !usuario.grupos.includes(grupoId as GrupoId));
    if (removidos.length > 0) {
      await em.nativeDelete(UsuarioGrupoEntidade, { usuarioId: usuario.id, grupoId: { $in: removidos } });
    }
    const acrescentados = usuario.atribuicoesPendentes.filter(({ grupoId }) => !idsGravados.includes(grupoId));
    const semAtribuicao = usuario.grupos.filter(
      (grupoId) => !idsGravados.includes(grupoId) && !acrescentados.some((atribuicao) => atribuicao.grupoId === grupoId),
    );
    if (semAtribuicao.length > 0) throw new ErroDeGrupoSemAtribuicao(usuario.id);
    for (const atribuicao of acrescentados) {
      // eslint-disable-next-line no-await-in-loop -- poucas linhas por usuário, na ordem da atribuição
      await this.inserirAtribuicao(em, usuario.id, atribuicao, instituicaoId);
    }
  }

  private async inserirAtribuicao(
    em: EntityManager,
    usuarioId: UsuarioId,
    atribuicao: AtribuicaoDeGrupo,
    instituicaoId: string,
  ): Promise<void> {
    await em.insert(UsuarioGrupoEntidade, {
      usuarioId,
      grupoId: atribuicao.grupoId,
      instituicaoId,
      atribuidoPor: atribuicao.por,
      atribuidoEm: atribuicao.em,
    });
  }
}
