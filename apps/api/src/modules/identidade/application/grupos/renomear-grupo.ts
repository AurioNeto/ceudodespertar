import { Injectable } from '@nestjs/common';
import type { DadosDoGrupoRenomeado, GrupoId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import type { Grupo } from '../../domain/grupo/grupo.js';
import { RepositorioDeGrupo } from '../../domain/grupo/grupo.repo.js';
import type { AcessoDoUsuario } from '../acesso-do-usuario.js';
import { conferirVersao, salvarSeAlterado } from '../conferir-versao.js';

export interface ComandoDeRenomeacaoDoGrupo {
  readonly grupoId: GrupoId;
  readonly versaoEsperada: number;
  readonly nome: string;
  readonly descricao: string;
}

function dadosDo(grupo: Grupo, versao: number): DadosDoGrupoRenomeado {
  return {
    id: grupo.id,
    codigoSistema: grupo.codigoSistema,
    nome: grupo.nome,
    descricao: grupo.descricao,
    permissoes: grupo.permissoes,
    protegido: grupo.protegido,
    versao,
  };
}

@Injectable()
export class RenomearGrupo {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly grupos: RepositorioDeGrupo,
    private readonly relogio: Relogio,
  ) {}

  executar(
    acesso: AcessoDoUsuario,
    comando: ComandoDeRenomeacaoDoGrupo,
  ): Promise<Result<DadosDoGrupoRenomeado, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao(
      'escrita',
      async (): Promise<Result<DadosDoGrupoRenomeado, ErroDeDominio>> => {
        const encontrado = conferirVersao(await this.grupos.porId(comando.grupoId), comando.versaoEsperada);
        if (encontrado.tipo === 'erro') return encontrado;
        const grupo = encontrado.valor;

        const renomeado = grupo.renomear(comando.nome, comando.descricao, acesso.usuarioId, this.relogio.agora());
        if (renomeado.tipo === 'erro') return renomeado;

        return ok(dadosDo(grupo, await salvarSeAlterado(this.grupos, grupo)));
      },
    );
  }
}
