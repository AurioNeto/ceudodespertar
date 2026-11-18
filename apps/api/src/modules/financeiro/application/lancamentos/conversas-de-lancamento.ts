import { Injectable } from '@nestjs/common';
import type { LancamentoId, PendenciaId, RegistroDeLancamento } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeLancamento } from '../../domain/lancamento/lancamento.repo.js';
import { OperacoesDeLancamento } from './operacoes-de-lancamento.js';

@Injectable()
export class ConversasDeLancamento {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly repo: RepositorioDeLancamento,
    private readonly operacoes: OperacoesDeLancamento, private readonly relogio: Relogio) {}

  abrir(acesso: ContextoDeAcesso, id: LancamentoId, versao: number, texto: string): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.operacoes.carregar(id, versao);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const aberta = l.abrirPendencia(texto, acesso.usuarioId, this.relogio.agora(), await this.operacoes.aberto(l.estado));
      if (aberta.tipo === 'erro') return aberta;
      return ok(await this.operacoes.apresentar(l, await this.repo.salvar(l)));
    });
  }

  responder(acesso: ContextoDeAcesso, id: LancamentoId, pendenciaId: PendenciaId, versao: number, texto: string): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.operacoes.carregar(id, versao, acesso);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const respondida = l.responderPendencia(pendenciaId, texto, acesso.usuarioId, this.relogio.agora(), await this.operacoes.aberto(l.estado));
      if (respondida.tipo === 'erro') return respondida;
      return ok(await this.operacoes.apresentar(l, await this.repo.salvar(l)));
    });
  }
}
