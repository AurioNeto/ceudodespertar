import { Injectable } from '@nestjs/common';
import type { GrupoId, Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { PermissoesEfetivas } from '../../domain/permissao/permissoes-efetivas.js';
import {
  PoliticaDoUltimoAdministrador,
  UsuarioDaInstituicao,
} from '../../domain/servicos/politica-do-ultimo-administrador.js';
import type { Usuario } from '../../domain/usuario/usuario.js';
import type { AcessoDoUsuario } from '../obter-eu.js';
import { LeitorDaAdministracao } from './leitor-da-administracao.js';
import type { FotografiaDaAdministracao } from './leitor-da-administracao.js';
import { TravaDaAdministracao } from './trava-da-administracao.js';

export type EfeitoNaAdministracao =
  | {
      readonly tipo: 'usuario';
      readonly usuarioId: UsuarioId;
      readonly situacao: SituacaoUsuario;
      readonly grupos: readonly GrupoId[];
    }
  | { readonly tipo: 'grupo'; readonly grupoId: GrupoId; readonly permissoes: readonly Permissao[] };

export interface AlteracaoPendente<T> {
  readonly efeito: EfeitoNaAdministracao;
  salvar(): Promise<T>;
}

export interface PedidoDeAlteracao<T> {
  readonly acesso: AcessoDoUsuario;
  mutar(antes: FotografiaDaAdministracao): Promise<Result<AlteracaoPendente<T>, ErroDeDominio>>;
}

export function efeitoDoUsuario(usuario: Usuario): EfeitoNaAdministracao {
  return { tipo: 'usuario', usuarioId: usuario.id, situacao: usuario.situacao, grupos: usuario.grupos };
}

function aplicar(fotografia: FotografiaDaAdministracao, efeito: EfeitoNaAdministracao): FotografiaDaAdministracao {
  if (efeito.tipo === 'usuario') {
    return {
      ...fotografia,
      usuarios: fotografia.usuarios.map((usuario) =>
        usuario.id === efeito.usuarioId ? { id: usuario.id, situacao: efeito.situacao, grupos: efeito.grupos } : usuario,
      ),
    };
  }
  return {
    ...fotografia,
    gruposAtivos: fotografia.gruposAtivos.map((grupo) =>
      grupo.id === efeito.grupoId ? { id: grupo.id, permissoes: efeito.permissoes } : grupo,
    ),
  };
}

function usuariosDaInstituicao(fotografia: FotografiaDaAdministracao): UsuarioDaInstituicao[] {
  const grupoPorId = new Map(fotografia.gruposAtivos.map((grupo) => [grupo.id, grupo]));
  return fotografia.usuarios.map((usuario) => {
    const gruposDoUsuario = usuario.grupos.flatMap((grupoId) => grupoPorId.get(grupoId) ?? []);
    const permissoes = PermissoesEfetivas.dosGrupos(gruposDoUsuario.map(({ permissoes: lista }) => ({ ativo: true, permissoes: lista })));
    return UsuarioDaInstituicao.de(usuario, permissoes);
  });
}

@Injectable()
export class AlteracaoQuePodeTirarAdministrador {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly trava: TravaDaAdministracao,
    private readonly leitor: LeitorDaAdministracao,
    private readonly politica: PoliticaDoUltimoAdministrador,
  ) {}

  executar<T>(pedido: PedidoDeAlteracao<T>): Promise<Result<T, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<T, ErroDeDominio>> => {
      await this.trava.adquirir(pedido.acesso.instituicaoId);
      const antes = await this.leitor.instituicao();
      const alteracao = await pedido.mutar(antes);
      if (alteracao.tipo === 'erro') return alteracao;

      const depois = aplicar(antes, alteracao.valor.efeito);
      const verificacao = this.politica.verificar(
        usuariosDaInstituicao(antes),
        usuariosDaInstituicao(depois),
        pedido.acesso.usuarioId,
      );
      if (verificacao.tipo === 'erro') return verificacao;

      return ok(await alteracao.valor.salvar());
    });
  }
}
