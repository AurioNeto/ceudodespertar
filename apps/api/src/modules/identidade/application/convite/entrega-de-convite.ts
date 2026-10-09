import { Injectable, Logger } from '@nestjs/common';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { EnviadorDeConvite } from './enviador-de-convite.js';
import type { ConviteParaEnviar } from './enviador-de-convite.js';

@Injectable()
export class EntregaDeConvite {
  private readonly logger = new Logger(EntregaDeConvite.name);

  constructor(private readonly enviador: EnviadorDeConvite) {}

  depoisDoCommit(contexto: ContextoDaTransacao, convite: ConviteParaEnviar): void {
    contexto.aoConfirmar(() => {
      void this.enviar(convite);
    });
  }

  private async enviar(convite: ConviteParaEnviar): Promise<void> {
    try {
      await this.enviador.enviar(convite);
    } catch (motivo) {
      const tipoDoErro = motivo instanceof Error ? motivo.name : typeof motivo;
      this.logger.error(`convite: falha no envio (usuário ${convite.usuarioId}): ${tipoDoErro}`);
    }
  }
}
