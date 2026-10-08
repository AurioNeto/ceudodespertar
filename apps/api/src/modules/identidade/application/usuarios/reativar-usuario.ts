import { Injectable } from '@nestjs/common';
import type { UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { conferirVersao, salvarSeAlterado } from '../conferir-versao.js';
import type { AcessoDoUsuario } from '../obter-eu.js';
import type { SituacaoAlterada } from './desativar-usuario.js';

export interface ComandoDeReativacao {
  readonly usuarioId: UsuarioId;
  readonly versaoEsperada: number;
  readonly motivo: string;
}

@Injectable()
export class ReativarUsuario {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly relogio: Relogio,
  ) {}

  executar(acesso: AcessoDoUsuario, comando: ComandoDeReativacao): Promise<Result<SituacaoAlterada, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<SituacaoAlterada, ErroDeDominio>> => {
      const encontrado = conferirVersao(await this.usuarios.porId(comando.usuarioId), comando.versaoEsperada);
      if (encontrado.tipo === 'erro') return encontrado;
      const usuario = encontrado.valor;

      const reativado = usuario.reativar(acesso.usuarioId, comando.motivo, this.relogio.agora());
      if (reativado.tipo === 'erro') return reativado;

      return ok({ situacao: usuario.situacao, versao: await salvarSeAlterado(this.usuarios, usuario) });
    });
  }
}
