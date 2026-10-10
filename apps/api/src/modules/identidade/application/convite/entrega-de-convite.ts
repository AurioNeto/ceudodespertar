import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { EnviadorDeConvite } from './enviador-de-convite.js';
import type { ConviteParaEnviar } from './enviador-de-convite.js';

@Injectable()
export class EntregaDeConvite implements OnModuleDestroy {
  private readonly logger = new Logger(EntregaDeConvite.name);
  private readonly entregasEmVoo = new Set<Promise<void>>();

  constructor(private readonly enviador: EnviadorDeConvite) {}

  depoisDoCommit(contexto: ContextoDaTransacao, convite: ConviteParaEnviar): void {
    contexto.aoConfirmar(() => {
      const entrega = this.enviar(convite);
      this.entregasEmVoo.add(entrega);
      void entrega.finally(() => this.entregasEmVoo.delete(entrega));
    });
  }

  async aguardarEntregas(): Promise<void> {
    await Promise.allSettled(this.entregasEmVoo);
  }

  onModuleDestroy(): Promise<void> {
    return this.aguardarEntregas();
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
