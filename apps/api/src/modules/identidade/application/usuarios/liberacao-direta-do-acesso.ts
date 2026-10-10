import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { AcessoDoUsuario } from '../acesso-do-usuario.js';
import { ControleDeAcessoNoProvedor } from './controle-de-acesso-no-provedor.js';
import { LeitorDoSujeitoDoUsuario } from './leitor-do-sujeito-do-usuario.js';

@Injectable()
export class LiberacaoDiretaDoAcesso implements OnModuleDestroy {
  private readonly logger = new Logger(LiberacaoDiretaDoAcesso.name);
  private readonly liberacoesEmVoo = new Set<Promise<void>>();

  constructor(
    private readonly controle: ControleDeAcessoNoProvedor,
    private readonly sujeitos: LeitorDoSujeitoDoUsuario,
  ) {}

  depoisDoCommit(contexto: ContextoDaTransacao, alvo: AcessoDoUsuario): void {
    contexto.aoConfirmar(() => {
      const liberacao = this.liberar(alvo);
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

  private async liberar(alvo: AcessoDoUsuario): Promise<void> {
    try {
      const atual = await this.sujeitos.ler(alvo.usuarioId, alvo.instituicaoId);
      if (atual?.situacao !== 'ATIVO' || atual.subjectId === null) return;
      await this.controle.liberar(atual.subjectId);
    } catch (motivo) {
      this.logger.error(`reativação: falha na liberação direta do acesso (${motivo instanceof Error ? motivo.name : typeof motivo})`);
    }
  }
}
