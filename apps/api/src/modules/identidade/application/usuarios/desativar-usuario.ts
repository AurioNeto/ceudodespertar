import { Injectable } from '@nestjs/common';
import type { SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { AlteracaoQuePodeTirarAdministrador, efeitoDoUsuario } from '../administracao/alteracao-que-pode-tirar-administrador.js';
import { conferirVersao, salvarSeAlterado } from '../conferir-versao.js';
import type { AcessoDoUsuario } from '../acesso-do-usuario.js';

export interface ComandoDeDesativacao {
  readonly usuarioId: UsuarioId;
  readonly versaoEsperada: number;
  readonly motivo: string;
}

export interface SituacaoAlterada {
  readonly situacao: SituacaoUsuario;
  readonly versao: number;
}

@Injectable()
export class DesativarUsuario {
  constructor(
    private readonly alteracao: AlteracaoQuePodeTirarAdministrador,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly relogio: Relogio,
  ) {}

  executar(acesso: AcessoDoUsuario, comando: ComandoDeDesativacao): Promise<Result<SituacaoAlterada, ErroDeDominio>> {
    return this.alteracao.executar({
      acesso,
      mutar: async () => {
        const encontrado = conferirVersao(await this.usuarios.porId(comando.usuarioId), comando.versaoEsperada);
        if (encontrado.tipo === 'erro') return encontrado;
        const usuario = encontrado.valor;

        const desativado = usuario.desativar(acesso.usuarioId, comando.motivo, this.relogio.agora());
        if (desativado.tipo === 'erro') return desativado;

        return ok({
          efeito: efeitoDoUsuario(usuario),
          salvar: async () => ({
            situacao: usuario.situacao,
            versao: await salvarSeAlterado(this.usuarios, usuario),
          }),
        });
      },
    });
  }
}
