import { Injectable } from '@nestjs/common';
import type { ConviteReenviado, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { expiracaoMaximaDoConvite } from '../../domain/usuario/convite.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import type { AcessoDoUsuario } from '../acesso-do-usuario.js';
import { conferirVersao, salvarSeAlterado } from '../conferir-versao.js';
import { EntregaDeConvite } from '../convite/entrega-de-convite.js';
import { GeradorDeTokenDeConvite } from '../convite/gerador-de-token-de-convite.js';

export interface ComandoDeReenvio {
  readonly usuarioId: UsuarioId;
  readonly versaoEsperada: number;
}

@Injectable()
export class ReenviarConvite {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly gerador: GeradorDeTokenDeConvite,
    private readonly entrega: EntregaDeConvite,
    private readonly relogio: Relogio,
  ) {}

  executar(acesso: AcessoDoUsuario, comando: ComandoDeReenvio): Promise<Result<ConviteReenviado, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
      const encontrado = conferirVersao(await this.usuarios.porId(comando.usuarioId), comando.versaoEsperada);
      if (encontrado.tipo === 'erro') return encontrado;
      const usuario = encontrado.valor;

      const agora = this.relogio.agora();
      const { token, hash } = this.gerador.gerar();
      const expiraEm = expiracaoMaximaDoConvite(agora);
      const reenviado = usuario.reenviarConvite(hash, expiraEm, acesso.usuarioId, agora);
      if (reenviado.tipo === 'erro') return reenviado;

      const versao = await salvarSeAlterado(this.usuarios, usuario);
      this.entrega.depoisDoCommit(contexto, {
        usuarioId: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        token,
        expiraEm,
      });
      return ok({ versao });
    });
  }
}
