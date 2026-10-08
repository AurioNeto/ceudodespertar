import { Injectable } from '@nestjs/common';
import type { PermissoesDoGrupoAlteradas } from '@cdd/contracts';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeGrupo } from '../../domain/grupo/grupo.repo.js';
import type { AcessoDoUsuario } from '../acesso-do-usuario.js';
import { AlteracaoQuePodeTirarAdministrador } from '../administracao/alteracao-que-pode-tirar-administrador.js';
import { conferirVersao, salvarSeAlterado } from '../conferir-versao.js';
import type { ComandoSobrePermissaoDoGrupo } from './comando-sobre-permissao-do-grupo.js';

@Injectable()
export class RevogarPermissaoDoGrupo {
  constructor(
    private readonly alteracao: AlteracaoQuePodeTirarAdministrador,
    private readonly grupos: RepositorioDeGrupo,
    private readonly relogio: Relogio,
  ) {}

  executar(
    acesso: AcessoDoUsuario,
    comando: ComandoSobrePermissaoDoGrupo,
  ): Promise<Result<PermissoesDoGrupoAlteradas, ErroDeDominio>> {
    return this.alteracao.executar({
      acesso,
      mutar: async () => {
        const encontrado = conferirVersao(await this.grupos.porId(comando.grupoId), comando.versaoEsperada);
        if (encontrado.tipo === 'erro') return encontrado;
        const grupo = encontrado.valor;

        const revogada = grupo.revogarPermissao(comando.permissao, acesso.usuarioId, this.relogio.agora());
        if (revogada.tipo === 'erro') return revogada;

        return ok({
          efeito: { tipo: 'grupo', grupoId: grupo.id, permissoes: grupo.permissoes },
          salvar: async () => ({ permissoes: grupo.permissoes, versao: await salvarSeAlterado(this.grupos, grupo) }),
        });
      },
    });
  }
}
