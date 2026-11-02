import { sql } from 'kysely';
import { Injectable, Logger } from '@nestjs/common';
import type { Competencia, DataHora, PeriodoContabilId, UnidadeId, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { RepositorioDoOutbox } from '../../../../shared/infrastructure/eventos/repositorio-do-outbox.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { erroDeDominio, ErroDeDominioException } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { PeriodoContabil } from '../../domain/periodo/periodo-contabil.js';
import { competenciaAnterior } from '../../domain/periodo/hash-do-periodo.js';
import { RepositorioDePeriodo, type ChaveDoPeriodo, type SituacaoDosMovimentos } from '../../domain/periodo/periodo-contabil.repo.js';
import { travarPeriodos } from '../periodos/trava-de-periodo.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

@Injectable()
export class RepositorioDePeriodoKysely extends RepositorioDePeriodo {
  private readonly logger = new Logger(RepositorioDePeriodoKysely.name);
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly outbox: RepositorioDoOutbox) { super(); }
  travar(chave: ChaveDoPeriodo, incluirAnterior: boolean): Promise<void> {
    return this.unidade.transacao('escrita', async ctx => {
      const pedidos = [{ ...chave, exclusiva: true }];
      const anterior = competenciaAnterior(chave.competencia);
      if (incluirAnterior && anterior !== null) pedidos.push({ ...chave, competencia: anterior, exclusiva: false });
      await travarPeriodos(ctx, pedidos);
    });
  }
  porChave(chave: ChaveDoPeriodo): Promise<PeriodoContabil | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely.selectFrom('financeiro.periodo_contabil').selectAll().where('unidade_id', '=', chave.unidadeId)
        .where('competencia', '=', `${chave.competencia}-01`).orderBy('id').limit(2).execute();
      if (linhas.length > 1) {
        this.logger.error({ alarme: 'PERIODOS_CONTABEIS_DUPLICADOS', instituicaoId: instituicaoDoContexto(), ...chave });
        throw new ErroDeDominioException(erroDeDominio('REGISTRO_IMUTAVEL'));
      }
      const linha = linhas[0];
      if (linha === undefined) return undefined;
      const reaberturas = await kysely.selectFrom('financeiro.reabertura_de_periodo').selectAll().where('periodo_id', '=', linha.id).orderBy('versao_do_periodo').execute();
      return PeriodoContabil.reconstituir({ id: linha.id as PeriodoContabilId, unidadeId: linha.unidade_id as UnidadeId,
        competencia: linha.competencia.slice(0, 7) as Competencia, fechado: linha.fechado, fechadoPor: linha.fechado_por as UsuarioId | null,
        fechadoEm: linha.fechado_em === null ? null : new Date(linha.fechado_em).toISOString() as DataHora, hash: linha.hash_sha256, versao: linha.versao,
        reaberturas: reaberturas.map(r => ({ motivo: r.motivo, reabertoPor: r.reaberto_por as UsuarioId, reabertoEm: new Date(r.reaberto_em).toISOString() as DataHora, hashAnterior: r.hash_anterior })) });
    });
  }
  movimentos(chave: ChaveDoPeriodo): Promise<SituacaoDosMovimentos> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const lancamentos = await kysely.selectFrom('financeiro.lancamento').select(['id', 'natureza', 'valor', 'motivo', 'unidade_id', 'grupo_de_custo_id', 'conta_id', 'fatura_id', 'pessoa_id', 'contraparte_texto', 'forma_pagamento', 'evento_id', 'data_competencia', 'data_caixa', 'reembolso_a_id', 'comprovante_id', 'origem', 'status', 'estorno_de_id', 'registrado_por', 'confirmado_autor_tipo', 'confirmado_por', 'versao'])
        .select([instanteCanonico('registrado_em').as('registrado_em'), instanteCanonico('confirmado_em').as('confirmado_em')]).where('unidade_id', '=', chave.unidadeId).where('competencia', '=', `${chave.competencia}-01`).execute();
      const transferencias = await kysely.selectFrom('financeiro.transferencia').select(['id', 'finalidade', 'status', 'valor', 'data', 'conta_origem_id', 'conta_destino_id', 'unidade_id', 'unidade_destino_id', 'fundo_id', 'fatura_id', 'emprestimo_id', 'adiantamento_id', 'motivo', 'estorno_de_id', 'registrado_por', 'confirmado_por', 'versao'])
        .select([instanteCanonico('registrado_em').as('registrado_em'), instanteCanonico('confirmado_em').as('confirmado_em')]).where(eb => eb.or([eb('unidade_id', '=', chave.unidadeId), eb('unidade_destino_id', '=', chave.unidadeId)]))
        .where('data', '>=', `${chave.competencia}-01`).where('data', '<', mesSeguinte(chave.competencia)).execute();
      const etiquetas = await kysely.selectFrom('financeiro.lancamento_categoria as e').innerJoin('financeiro.lancamento as l', 'l.id', 'e.lancamento_id')
        .select(['e.lancamento_id', 'e.categoria_id', 'e.natureza', 'e.valor']).where('l.unidade_id', '=', chave.unidadeId).where('l.competencia', '=', `${chave.competencia}-01`).execute();
      const porLancamento = new Map<string, typeof etiquetas>();
      for (const etiqueta of etiquetas) porLancamento.set(etiqueta.lancamento_id, [...(porLancamento.get(etiqueta.lancamento_id) ?? []), etiqueta]);
      const movimentos = { lancamentos: lancamentos.map(l => ({ ...l, etiquetas: porLancamento.get(l.id) ?? [] })), transferencias };
      return { movimentos: JSON.parse(JSON.stringify(movimentos)) as typeof movimentos,
        pendentes: lancamentos.filter(l => l.status === 'A_CONFERIR').length + transferencias.filter(t => t.status === 'A_CONFERIR').length };
    });
  }
  anteriorFechado(chave: ChaveDoPeriodo): Promise<boolean> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const competencia = competenciaAnterior(chave.competencia);
      if (competencia === null) return true;
      const anterior = await this.porChave({ ...chave, competencia });
      if (anterior !== undefined) return anterior.estado.fechado;
      const periodo = await kysely.selectFrom('financeiro.periodo_contabil').select('id').where('unidade_id', '=', chave.unidadeId).where('competencia', '<', `${chave.competencia}-01`).executeTakeFirst();
      const lancamento = await kysely.selectFrom('financeiro.lancamento').select('id').where('unidade_id', '=', chave.unidadeId).where('competencia', '<', `${chave.competencia}-01`).executeTakeFirst();
      const transferencia = await kysely.selectFrom('financeiro.transferencia').select('id').where(eb => eb.or([eb('unidade_id', '=', chave.unidadeId), eb('unidade_destino_id', '=', chave.unidadeId)]))
        .where('data', '<', `${chave.competencia}-01`).executeTakeFirst();
      return periodo === undefined && lancamento === undefined && transferencia === undefined;
    });
  }
  adicionar(p: PeriodoContabil): Promise<void> {
    return this.unidade.transacao('escrita', async ctx => {
      await this.travar(p.estado, false);
      if (await this.porChave(p.estado) !== undefined) throw new ErroDeDominioException(erroDeDominio('PERIODO_JA_FECHADO'));
      const e = p.estado;
      await ctx.kysely.insertInto('financeiro.periodo_contabil').values({ id: e.id, instituicao_id: instituicaoDoContexto(), unidade_id: e.unidadeId,
        competencia: `${e.competencia}-01`, fechado: e.fechado, fechado_por: e.fechadoPor, fechado_em: e.fechadoEm === null ? null : new Date(e.fechadoEm), hash_sha256: e.hash, versao: e.versao }).execute();
      await this.outbox.gravar(ctx, p.retirarEventos());
    });
  }
  salvar(p: PeriodoContabil): Promise<number> {
    return this.unidade.transacao('escrita', async ctx => {
      await this.travar(p.estado, false);
      const e = p.estado;
      const anterior = await this.porChave(e);
      const novas = e.reaberturas.slice(anterior?.estado.reaberturas.length ?? 0);
      if (novas.length > 0) await ctx.kysely.insertInto('financeiro.reabertura_de_periodo').values(novas.map(r => ({ id: gerarUuidV7(), instituicao_id: instituicaoDoContexto(), periodo_id: e.id,
        motivo: r.motivo, reaberto_por: r.reabertoPor, reaberto_em: new Date(r.reabertoEm), hash_anterior: r.hashAnterior, versao_do_periodo: e.versao + 1 }))).execute();
      const resultado = await ctx.kysely.updateTable('financeiro.periodo_contabil').set({ fechado: e.fechado, fechado_por: e.fechadoPor,
        fechado_em: e.fechadoEm === null ? null : new Date(e.fechadoEm), hash_sha256: e.hash, versao: e.versao + 1 }).where('id', '=', e.id).where('versao', '=', e.versao).executeTakeFirst();
      exigirLinhaAtualizada(resultado, 'PeriodoContabil');
      await this.outbox.gravar(ctx, p.retirarEventos());
      return e.versao + 1;
    });
  }
}
function mesSeguinte(competencia: Competencia): string {
  const [ano, mes] = competencia.split('-').map(Number) as [number, number];
  return `${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01`;
}

function instanteCanonico(coluna: 'registrado_em' | 'confirmado_em') {
  return sql<string | null>`to_char(${sql.ref(coluna)} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}
