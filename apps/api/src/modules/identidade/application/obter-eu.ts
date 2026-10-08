import { Injectable, Logger } from '@nestjs/common';
import type { Eu, InstituicaoId, UsuarioId } from '@cdd/contracts';
import { Relogio } from '../../../shared/infrastructure/relogio.js';
import { LeitorDoEu } from './leitor-do-eu.js';
import { RegistradorDeUltimoAcesso } from './registrador-de-ultimo-acesso.js';

export const INTERVALO_MINIMO_ENTRE_REGISTROS_DE_ACESSO_EM_MS = 60 * 60 * 1000;

export interface AcessoDoUsuario {
  readonly usuarioId: UsuarioId;
  readonly instituicaoId: InstituicaoId;
}

@Injectable()
export class ObterEu {
  private readonly log = new Logger(ObterEu.name);

  constructor(
    private readonly leitor: LeitorDoEu,
    private readonly registrador: RegistradorDeUltimoAcesso,
    private readonly relogio: Relogio,
  ) {}

  async executar(acesso: AcessoDoUsuario): Promise<Eu> {
    const eu = await this.leitor.ler(acesso.usuarioId, acesso.instituicaoId);
    await this.registrarUltimoAcessoSemFalhar(acesso);
    return eu;
  }

  private async registrarUltimoAcessoSemFalhar(acesso: AcessoDoUsuario): Promise<void> {
    const agora = this.relogio.agora();
    try {
      await this.registrador.registrar({
        ...acesso,
        em: agora,
        seUltimoAcessoAnteriorA: new Date(agora.getTime() - INTERVALO_MINIMO_ENTRE_REGISTROS_DE_ACESSO_EM_MS),
      });
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.name : typeof erro;
      this.log.warn(`falha ao registrar o último acesso: ${motivo}`);
    }
  }
}
