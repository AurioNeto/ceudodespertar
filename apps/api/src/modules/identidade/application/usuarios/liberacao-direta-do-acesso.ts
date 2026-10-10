import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ControleDeAcessoNoProvedor } from './controle-de-acesso-no-provedor.js';

@Injectable()
export class LiberacaoDiretaDoAcesso implements OnModuleDestroy {
  private readonly logger = new Logger(LiberacaoDiretaDoAcesso.name);
  private readonly liberacoesEmVoo = new Set<Promise<void>>();

  constructor(private readonly controle: ControleDeAcessoNoProvedor) {}

  depoisDoCommit(contexto: ContextoDaTransacao, sujeito: string): void {
    contexto.aoConfirmar(() => {
      const liberacao = this.liberar(sujeito);
      this.liberacoesEmVoo.add(liberacao);
      void liberacao.finally(() => this.liberacoesEmVoo.delete(liberacao));
    });
  }

  async aguardarLiberacoes(): Promise<void> {
    await Promise.allSettled(this.liberacoesEmVoo);
  }

  onModuleDestroy(): Promise<void> {
    return this.aguardarLiberacoes();
  }

  private async liberar(sujeito: string): Promise<void> {
    try {
      await this.controle.liberar(sujeito);
    } catch (motivo) {
      this.logger.error(`reativação: falha na liberação direta do acesso (${motivo instanceof Error ? motivo.name : typeof motivo})`);
    }
  }
}
