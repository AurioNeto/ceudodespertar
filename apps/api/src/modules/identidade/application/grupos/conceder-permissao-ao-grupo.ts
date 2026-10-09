import { Injectable } from '@nestjs/common';
import type { PermissoesDoGrupoAlteradas } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeGrupo } from '../../domain/grupo/grupo.repo.js';
import type { AcessoDoUsuario } from '../acesso-do-usuario.js';
import { salvarSeAlterado } from '../conferir-versao.js';
import { conferirGrupoExistenteEVersao } from './conferir-grupo-existente-e-versao.js';
import type { ComandoSobrePermissaoDoGrupo } from './comando-sobre-permissao-do-grupo.js';

@Injectable()
export class ConcederPermissaoAoGrupo {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly grupos: RepositorioDeGrupo,
    private readonly relogio: Relogio,
  ) {}

  executar(
    acesso: AcessoDoUsuario,
    comando: ComandoSobrePermissaoDoGrupo,
  ): Promise<Result<PermissoesDoGrupoAlteradas, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao(
      'escrita',
      async (): Promise<Result<PermissoesDoGrupoAlteradas, ErroDeDominio>> => {
        const encontrado = conferirGrupoExistenteEVersao(await this.grupos.porId(comando.grupoId), comando.versaoEsperada);
        if (encontrado.tipo === 'erro') return encontrado;
        const grupo = encontrado.valor;

        const concedida = grupo.concederPermissao(comando.permissao, acesso.usuarioId, this.relogio.agora());
        if (concedida.tipo === 'erro') return concedida;

        return ok({ permissoes: grupo.permissoes, versao: await salvarSeAlterado(this.grupos, grupo) });
      },
    );
  }
}
