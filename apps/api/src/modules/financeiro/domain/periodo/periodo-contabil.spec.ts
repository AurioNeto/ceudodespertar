import { describe, expect, it } from 'vitest';
import type { Competencia, PeriodoContabilId, UnidadeId, UsuarioId } from '@cdd/contracts';
import { PeriodoContabil } from './periodo-contabil.js';
import { hashDoPeriodo, competenciaAnterior } from './hash-do-periodo.js';
const ID = '0198a3c0-0000-7000-8000-000000000001' as PeriodoContabilId;
const UNIDADE = ID as unknown as UnidadeId;
const AUTOR = ID as unknown as UsuarioId;
const COMPETENCIA = '2026-10' as Competencia;
const EM = new Date('2026-11-02T12:00:00Z');
const snapshot = { lancamentos: [], transferencias: [] };
const criar = () => PeriodoContabil.abrir(ID, UNIDADE, COMPETENCIA);
const hash = hashDoPeriodo(UNIDADE, COMPETENCIA, snapshot);
describe('PeriodoContabil P1–P4', () => {
  it('P2 fecha e registra hash, ator e evento', () => {
    const p = criar();
    expect(p.fechar(0, true, hash, AUTOR, EM).tipo).toBe('ok');
    expect(p.estado).toMatchObject({ fechado: true, hash, fechadoPor: AUTOR, fechadoEm: EM.toISOString() });
    expect(p.retirarEventos()).toEqual([expect.objectContaining({ tipo: 'PERIODO_FECHADO' })]);
  });
  it.each([1, 2])('P1 recusa %s movimentos A_CONFERIR', n => {
    const p = criar();
    expect(p.fechar(n, true, hash, AUTOR, EM)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_COM_PENDENCIAS' } });
    expect(p.estado.fechado).toBe(false);
  });
  it('P4 recusa anterior aberto', () => {
    expect(criar().fechar(0, false, hash, AUTOR, EM)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_ANTERIOR_ABERTO' } });
  });
  it('recusa fechar fechado e reabrir aberto', () => {
    const p = criar();
    expect(p.reabrir('Motivo válido', AUTOR, EM)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_NAO_FECHADO' } });
    p.fechar(0, true, hash, AUTOR, EM);
    expect(p.fechar(0, true, hash, AUTOR, EM)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_JA_FECHADO' } });
  });
  it.each(['', 'curto', '         ', '123456789', 'x'.repeat(501), 'motivo com\0nulo'])('P3 recusa motivo inválido %s', motivo => {
    const p = criar(); p.fechar(0, true, hash, AUTOR, EM);
    expect(p.reabrir(motivo, AUTOR, EM).tipo).toBe('erro');
    expect(p.estado.fechado).toBe(true);
  });
  it('P3 preserva hash e histórico de cada fechamento sem reutilizar reabertura antiga', () => {
    const p = criar(); p.fechar(0, true, hash, AUTOR, EM);
    expect(p.reabrir('  Ajustar classificação  ', AUTOR, EM).tipo).toBe('ok');
    expect(p.estado).toMatchObject({ fechado: false, hash: null, fechadoPor: null, fechadoEm: null, reaberturas: [{ hashAnterior: hash, motivo: 'Ajustar classificação' }] });
    p.fechar(0, true, 'a'.repeat(64), AUTOR, EM); p.reabrir('Segundo ajuste', AUTOR, EM);
    expect(p.estado.reaberturas.map(r => r.hashAnterior)).toEqual([hash, 'a'.repeat(64)]);
  });
  it('snapshots isolados e reconstituição sem eventos', () => {
    const p = criar(); const estado = p.estado;
    (estado as { fechado: boolean }).fechado = true;
    expect(p.estado.fechado).toBe(false);
    expect(PeriodoContabil.reconstituir(p.estado).retirarEventos()).toEqual([]);
  });
  it('hash inclui transferências e independe da ordem dos registros e das chaves', () => {
    const a = { id: 'a', valor: 100, etiquetas: [{ categoriaId: 'b', valor: 30 }, { categoriaId: 'a', valor: 70 }] };
    const b = { id: 'b', valor: 200 };
    const t = { id: 't', valor: 400, contaDestinoId: 'destino' };
    const original = hashDoPeriodo(UNIDADE, COMPETENCIA, { lancamentos: [a, b], transferencias: [t] });
    expect(hashDoPeriodo(UNIDADE, COMPETENCIA, { lancamentos: [b, { etiquetas: [...a.etiquetas].reverse(), valor: 100, id: 'a' }], transferencias: [t] })).toBe(original);
    expect(hashDoPeriodo(UNIDADE, COMPETENCIA, { lancamentos: [a, b], transferencias: [{ ...t, valor: 401 }] })).not.toBe(original);
    expect(hashDoPeriodo(UNIDADE, COMPETENCIA, { lancamentos: [a, b], transferencias: [] })).not.toBe(original);
  });
  it.each([['2026-01', '2025-12'], ['2026-11', '2026-10'], ['0100-01', '0099-12'], ['0001-01', null]])('competência anterior de %s é %s', (competencia, anterior) => {
    expect(competenciaAnterior(competencia as Competencia)).toBe(anterior);
  });

  it('hash trata nulos e entradas iguais de forma estável', () => {
    const registro = { id: 'a', valor: 100, pessoa: null };
    const movimentos = { lancamentos: [registro, registro], transferencias: [] };
    expect(hashDoPeriodo(UNIDADE, COMPETENCIA, movimentos)).toBe(hashDoPeriodo(UNIDADE, COMPETENCIA, structuredClone(movimentos)));
  });

});
