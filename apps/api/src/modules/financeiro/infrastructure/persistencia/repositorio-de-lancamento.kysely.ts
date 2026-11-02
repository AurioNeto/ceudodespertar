import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { OptimisticLockError } from '@mikro-orm/core';
import type { LancamentoId, Etiqueta, PendenciaDoLancamento } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { RepositorioDoOutbox } from '../../../../shared/infrastructure/eventos/repositorio-do-outbox.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { Lancamento } from '../../domain/lancamento/lancamento.js';
import { RepositorioDeLancamento } from '../../domain/lancamento/lancamento.repo.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

@Injectable()
export class RepositorioDeLancamentoKysely extends RepositorioDeLancamento {
  private readonly logger = new Logger(RepositorioDeLancamentoKysely.name);
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly outbox: RepositorioDoOutbox) { super(); }

  porId(id: LancamentoId): Promise<Lancamento | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('financeiro.lancamento').selectAll().where('id', '=', id).executeTakeFirst();
      if (linha === undefined) return undefined;
      const etiquetas = await kysely.selectFrom('financeiro.lancamento_categoria').select(['categoria_id', 'natureza', 'valor']).where('lancamento_id', '=', id).orderBy('categoria_id').execute();
      const pendencias = await kysely.selectFrom('financeiro.pendencia').selectAll().where('lancamento_id', '=', id).orderBy('aberta_em').orderBy('id').execute();
      const estado: Lancamento['estado'] = {
        id,
        natureza: linha.natureza as Lancamento['estado']['natureza'],
        valor: linha.valor as Lancamento['estado']['valor'],
        motivo: linha.motivo as Lancamento['estado']['motivo'],
        unidadeId: linha.unidade_id as Lancamento['estado']['unidadeId'],
        grupoDeCustoId: linha.grupo_de_custo_id as Lancamento['estado']['grupoDeCustoId'],
        contaId: linha.conta_id as Lancamento['estado']['contaId'],
        faturaId: linha.fatura_id as Lancamento['estado']['faturaId'],
        pessoaId: linha.pessoa_id as Lancamento['estado']['pessoaId'],
        contraparteTexto: linha.contraparte_texto as Lancamento['estado']['contraparteTexto'],
        formaPagamento: linha.forma_pagamento as Lancamento['estado']['formaPagamento'],
        eventoId: linha.evento_id as Lancamento['estado']['eventoId'],
        dataCompetencia: linha.data_competencia as Lancamento['estado']['dataCompetencia'],
        dataCaixa: linha.data_caixa as Lancamento['estado']['dataCaixa'],
        reembolsoAId: linha.reembolso_a_id as Lancamento['estado']['reembolsoAId'],
        comprovanteId: linha.comprovante_id as Lancamento['estado']['comprovanteId'],
        origem: linha.origem as Lancamento['estado']['origem'],
        status: linha.status as Lancamento['estado']['status'],
        estornoDeId: linha.estorno_de_id as Lancamento['estado']['estornoDeId'],
        registradoPor: linha.registrado_por as Lancamento['estado']['registradoPor'],
        competencia: linha.competencia === null ? null : linha.competencia.slice(0, 7) as Lancamento['estado']['competencia'],
        registradoEm: new Date(linha.registrado_em).toISOString() as Lancamento['estado']['registradoEm'],
        confirmadoEm: linha.confirmado_em === null ? null : new Date(linha.confirmado_em).toISOString() as Lancamento['estado']['confirmadoEm'],
        confirmadoPor: linha.confirmado_autor_tipo === null ? null : linha.confirmado_autor_tipo === 'SISTEMA'
          ? { autorTipo: 'SISTEMA', autorId: null } : { autorTipo: 'USUARIO', autorId: linha.confirmado_por as NonNullable<Lancamento['estado']['confirmadoPor']>['autorId'] & string },
        etiquetas: etiquetas.map((e) => ({ categoriaId: e.categoria_id, natureza: e.natureza, valor: e.valor } as Etiqueta)),
        versao: linha.versao,
      };
      return Lancamento.reconstituir(estado, pendencias.map((p) => ({ id: p.id, texto: p.texto, abertaPor: p.aberta_por,
        destinatario: p.destinatario, abertaEm: new Date(p.aberta_em).toISOString(), resposta: p.resposta,
        resolvidaEm: p.resolvida_em === null ? null : new Date(p.resolvida_em).toISOString() } as PendenciaDoLancamento)));
    });
  }

  estornoDe(id: LancamentoId): Promise<LancamentoId | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const estornos = await kysely.selectFrom('financeiro.lancamento').select('id').where('estorno_de_id', '=', id).orderBy('id').limit(2).execute();
      if (estornos.length > 1) this.logger.error({ alarme: 'ESTORNOS_DUPLICADOS', lancamentoId: id, instituicaoId: instituicaoDoContexto() });
      return estornos[0]?.id as LancamentoId | undefined;
    });
  }

  adicionar(l: Lancamento): Promise<void> {
    return this.unidade.transacao('escrita', async (ctx) => {
      const e = l.estado;
      await ctx.kysely.insertInto('financeiro.lancamento').values({
        id: l.id, instituicao_id: instituicaoDoContexto(), gravado_na_transacao: sql<string>`pg_current_xact_id()`,
        natureza: e.natureza,
        valor: e.valor,
        motivo: e.motivo,
        unidade_id: e.unidadeId,
        grupo_de_custo_id: e.grupoDeCustoId,
        conta_id: e.contaId,
        fatura_id: e.faturaId,
        pessoa_id: e.pessoaId,
        contraparte_texto: e.contraparteTexto,
        forma_pagamento: e.formaPagamento,
        evento_id: e.eventoId,
        data_competencia: e.dataCompetencia,
        data_caixa: e.dataCaixa,
        reembolso_a_id: e.reembolsoAId,
        comprovante_id: e.comprovanteId,
        origem: e.origem,
        status: e.status,
        estorno_de_id: e.estornoDeId,
        registrado_por: e.registradoPor,
        competencia: e.competencia === null ? null : `${e.competencia}-01`,
        registrado_em: e.registradoEm, confirmado_em: e.confirmadoEm,
        confirmado_autor_tipo: e.confirmadoPor?.autorTipo ?? null, confirmado_por: e.confirmadoPor?.autorId ?? null,
        versao: e.versao,
      }).execute();
      await this.gravarFilhos(ctx, l);
      await this.outbox.gravar(ctx, l.retirarEventos());
    });
  }

  salvar(l: Lancamento): Promise<number> {
    return this.unidade.transacao('escrita', async (ctx) => {
      const e = l.estado;
      const resultado = await ctx.kysely.updateTable('financeiro.lancamento').set({
        natureza: e.natureza,
        valor: e.valor,
        motivo: e.motivo,
        unidade_id: e.unidadeId,
        grupo_de_custo_id: e.grupoDeCustoId,
        conta_id: e.contaId,
        fatura_id: e.faturaId,
        pessoa_id: e.pessoaId,
        contraparte_texto: e.contraparteTexto,
        forma_pagamento: e.formaPagamento,
        evento_id: e.eventoId,
        data_competencia: e.dataCompetencia,
        data_caixa: e.dataCaixa,
        reembolso_a_id: e.reembolsoAId,
        comprovante_id: e.comprovanteId,
        origem: e.origem,
        status: e.status,
        estorno_de_id: e.estornoDeId,
        registrado_por: e.registradoPor,
        competencia: e.competencia === null ? null : `${e.competencia}-01`,
        confirmado_em: e.confirmadoEm, confirmado_autor_tipo: e.confirmadoPor?.autorTipo ?? null,
        confirmado_por: e.confirmadoPor?.autorId ?? null, versao: e.versao + 1,
      }).where('id', '=', l.id).where('versao', '=', l.versao).where('status', '=', 'A_CONFERIR').executeTakeFirst();
      exigirLinhaAtualizada(resultado, 'Lancamento');
      await this.gravarFilhos(ctx, l);
      await this.outbox.gravar(ctx, l.retirarEventos());
      return e.versao + 1;
    });
  }

  excluir(l: Lancamento): Promise<void> {
    return this.unidade.transacao('escrita', async (ctx) => {
      const resultado = await ctx.kysely.deleteFrom('financeiro.lancamento').where('id', '=', l.id).where('versao', '=', l.versao).where('status', '=', 'A_CONFERIR').executeTakeFirst();
      if (resultado.numDeletedRows === 0n) throw OptimisticLockError.lockFailed('Lancamento');
      await this.outbox.gravar(ctx, l.retirarEventos());
    });
  }

  private async gravarFilhos(ctx: ContextoDaTransacao, l: Lancamento): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    await ctx.kysely.deleteFrom('financeiro.lancamento_categoria').where('lancamento_id', '=', l.id).execute();
    if (l.estado.etiquetas.length > 0) {
      await ctx.kysely.insertInto('financeiro.lancamento_categoria').values(l.estado.etiquetas.map((e) => ({
        instituicao_id: instituicaoId, lancamento_id: l.id, categoria_id: e.categoriaId, natureza: e.natureza, valor: e.valor,
      }))).execute();
    }
    await ctx.kysely.deleteFrom('financeiro.pendencia').where('lancamento_id', '=', l.id).execute();
    if (l.pendencias.length > 0) {
      await ctx.kysely.insertInto('financeiro.pendencia').values(l.pendencias.map((p) => ({
        id: p.id, instituicao_id: instituicaoId, lancamento_id: l.id, texto: p.texto, aberta_por: p.abertaPor,
        destinatario: p.destinatario, aberta_em: p.abertaEm, resposta: p.resposta, resolvida_em: p.resolvidaEm,
      }))).execute();
    }
  }
}
