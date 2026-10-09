import { Injectable } from '@nestjs/common';
import type { GrupoId, GrupoResumido, UsuarioConvidado } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { expiracaoMaximaDoConvite } from '../../domain/usuario/convite.js';
import { Usuario } from '../../domain/usuario/usuario.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import type { AcessoDoUsuario } from '../acesso-do-usuario.js';
import { EntregaDeConvite } from '../convite/entrega-de-convite.js';
import { GeradorDeTokenDeConvite } from '../convite/gerador-de-token-de-convite.js';
import { LeitorDeGruposDaInstituicao } from './leitor-de-grupos-da-instituicao.js';

export interface ComandoDeConvite {
  readonly nome: string;
  readonly email: string;
  readonly grupos?: readonly GrupoId[] | undefined;
}

@Injectable()
export class ConvidarUsuario {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly gruposDaInstituicao: LeitorDeGruposDaInstituicao,
    private readonly gerador: GeradorDeTokenDeConvite,
    private readonly entrega: EntregaDeConvite,
    private readonly relogio: Relogio,
  ) {}

  executar(acesso: AcessoDoUsuario, comando: ComandoDeConvite): Promise<Result<UsuarioConvidado, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
      const grupos = await this.resolverGrupos(comando.grupos);
      if (grupos.tipo === 'erro') return grupos;

      const agora = this.relogio.agora();
      const { token, hash } = this.gerador.gerar();
      const expiraEm = expiracaoMaximaDoConvite(agora);
      const usuario = Usuario.convidar({
        id: gerarUuidV7() as Usuario['id'],
        nome: comando.nome,
        email: comando.email,
        grupos: grupos.valor.map(({ id }) => id),
        hashDoConvite: hash,
        conviteExpiraEm: expiraEm,
        convidadoPor: acesso.usuarioId,
        em: agora,
      });
      await this.usuarios.adicionar(usuario);
      this.entrega.depoisDoCommit(contexto, {
        usuarioId: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        token,
        expiraEm,
      });

      return ok({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        situacao: usuario.situacao,
        grupos: grupos.valor,
        versao: usuario.versao,
      });
    });
  }

  private async resolverGrupos(pedidos: readonly GrupoId[] | undefined): Promise<Result<GrupoResumido[], ErroDeDominio>> {
    if (pedidos === undefined || pedidos.length === 0) return this.grupoPadrao();

    const ativos = await this.gruposDaInstituicao.ativosPorIds(pedidos);
    const porId = new Map(ativos.map((grupo) => [grupo.id, grupo]));
    const inexistentes = pedidos.filter((grupoId) => !porId.has(grupoId));
    if (inexistentes.length > 0) return err(erroDeDominio('GRUPO_INEXISTENTE', { grupos: inexistentes }));
    return ok(pedidos.map((grupoId) => porId.get(grupoId)!));
  }

  private async grupoPadrao(): Promise<Result<GrupoResumido[], ErroDeDominio>> {
    const leitura = await this.gruposDaInstituicao.doSistema('LEITURA');
    return leitura === undefined ? err(erroDeDominio('GRUPO_INEXISTENTE', { codigoSistema: 'LEITURA' })) : ok([leitura]);
  }
}
