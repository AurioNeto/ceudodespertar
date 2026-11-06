import { protegerEscrita, periodosDaTransferencia } from '../periodos/proteger-escrita-no-periodo.js';
import { Injectable, Logger } from '@nestjs/common';
import { OptimisticLockError } from '@mikro-orm/core';
import type { StatusGravadoDoLancamento, TransferenciaId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { RepositorioDoOutbox } from '../../../../shared/infrastructure/eventos/repositorio-do-outbox.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { Transferencia } from '../../domain/transferencia/transferencia.js';
import { RepositorioDeTransferencia } from '../../domain/transferencia/transferencia.repo.js';
import type { EstornoDaTransferencia } from '../../domain/transferencia/transferencia.repo.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

@Injectable()
export class RepositorioDeTransferenciaKysely extends RepositorioDeTransferencia {
  private readonly logger = new Logger(RepositorioDeTransferenciaKysely.name);
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly outbox: RepositorioDoOutbox) { super(); }

  porId(id: TransferenciaId): Promise<Transferencia | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('financeiro.transferencia').selectAll().where('id', '=', id).executeTakeFirst();
      if (linha === undefined) return undefined;
      return Transferencia.reconstituir({
        id,
        finalidade: linha.finalidade as Transferencia['estado']['finalidade'],
        valor: linha.valor as Transferencia['estado']['valor'],
        data: linha.data as Transferencia['estado']['data'],
        contaOrigemId: linha.conta_origem_id as Transferencia['estado']['contaOrigemId'],
        contaDestinoId: linha.conta_destino_id as Transferencia['estado']['contaDestinoId'],
        unidadeId: linha.unidade_id as Transferencia['estado']['unidadeId'],
        unidadeDestinoId: linha.unidade_destino_id as Transferencia['estado']['unidadeDestinoId'],
        fundoId: linha.fundo_id as Transferencia['estado']['fundoId'],
        faturaId: linha.fatura_id as Transferencia['estado']['faturaId'],
        emprestimoId: linha.emprestimo_id as Transferencia['estado']['emprestimoId'],
        adiantamentoId: linha.adiantamento_id as Transferencia['estado']['adiantamentoId'],
        motivo: linha.motivo as Transferencia['estado']['motivo'],
        status: linha.status as Transferencia['estado']['status'],
        estornoDeId: linha.estorno_de_id as Transferencia['estado']['estornoDeId'],
        registradoPor: linha.registrado_por as Transferencia['estado']['registradoPor'],
        confirmadoPor: linha.confirmado_por as Transferencia['estado']['confirmadoPor'],
        registradoEm: new Date(linha.registrado_em).toISOString() as Transferencia['estado']['registradoEm'],
        confirmadoEm: linha.confirmado_em === null ? null : new Date(linha.confirmado_em).toISOString() as Transferencia['estado']['confirmadoEm'],
        versao: linha.versao,
      });
    });
  }

  estornoDe(id: TransferenciaId): Promise<EstornoDaTransferencia | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely.selectFrom('financeiro.transferencia').select(['id', 'status']).where('estorno_de_id', '=', id).orderBy('status', 'desc').orderBy('id').limit(2).execute();
      if (linhas.length > 1) this.logger.error({ alarme: 'ESTORNOS_DE_TRANSFERENCIA_DUPLICADOS', transferenciaId: id, instituicaoId: instituicaoDoContexto() });
      const linha = linhas[0];
      return linha === undefined ? undefined : { id: linha.id as TransferenciaId, status: linha.status as StatusGravadoDoLancamento };
    });
  }

  adicionar(t: Transferencia): Promise<void> {
    return this.unidade.transacao('escrita', async (ctx) => {
      await protegerEscrita(ctx, periodosDaTransferencia(t.estado));
      await ctx.kysely.insertInto('financeiro.transferencia').values({ id: t.id, instituicao_id: instituicaoDoContexto(), ...this.colunas(t), versao: t.versao }).execute();
      await this.outbox.gravar(ctx, t.retirarEventos());
    });
  }

  salvar(t: Transferencia): Promise<number> {
    return this.unidade.transacao('escrita', async (ctx) => {
      const anterior = await this.porId(t.id);
      await protegerEscrita(ctx, [...periodosDaTransferencia(t.estado), ...(anterior === undefined ? [] : periodosDaTransferencia(anterior.estado))]);
      const resultado = await ctx.kysely.updateTable('financeiro.transferencia').set({ ...this.colunas(t), versao: t.versao + 1 })
        .where('id', '=', t.id).where('versao', '=', t.versao).where('status', '=', 'A_CONFERIR').executeTakeFirst();
      exigirLinhaAtualizada(resultado, 'Transferencia');
      await this.outbox.gravar(ctx, t.retirarEventos());
      return t.versao + 1;
    });
  }

  excluir(t: Transferencia): Promise<void> {
    return this.unidade.transacao('escrita', async (ctx) => {
      await protegerEscrita(ctx, periodosDaTransferencia(t.estado));
      const resultado = await ctx.kysely.deleteFrom('financeiro.transferencia').where('id', '=', t.id).where('versao', '=', t.versao).where('status', '=', 'A_CONFERIR').executeTakeFirst();
      if (resultado.numDeletedRows === 0n) throw OptimisticLockError.lockFailed('Transferencia');
      await this.outbox.gravar(ctx, t.retirarEventos());
    });
  }

  private colunas(t: Transferencia) {
    const e = t.estado;
    return {
      finalidade: e.finalidade,
      valor: e.valor,
      data: e.data,
      conta_origem_id: e.contaOrigemId,
      conta_destino_id: e.contaDestinoId,
      unidade_id: e.unidadeId,
      unidade_destino_id: e.unidadeDestinoId,
      fundo_id: e.fundoId,
      fatura_id: e.faturaId,
      emprestimo_id: e.emprestimoId,
      adiantamento_id: e.adiantamentoId,
      motivo: e.motivo,
      status: e.status,
      estorno_de_id: e.estornoDeId,
      registrado_por: e.registradoPor,
      confirmado_por: e.confirmadoPor,
      registrado_em: e.registradoEm, confirmado_em: e.confirmadoEm,
    };
  }
}
