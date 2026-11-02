import { createHash } from 'node:crypto';
import type { Competencia, UnidadeId } from '@cdd/contracts';

export interface MovimentosDoPeriodo {
  readonly lancamentos: readonly object[];
  readonly transferencias: readonly object[];
}

function canonico(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(canonico).toSorted((a, b) => comparar(JSON.stringify(a), JSON.stringify(b)));
  if (valor !== null && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).toSorted(([a], [b]) => comparar(a, b)).map(([k, v]) => [k, canonico(v)]));
  return valor;
}

export function hashDoPeriodo(unidadeId: UnidadeId, competencia: Competencia, movimentos: MovimentosDoPeriodo): string {
  const conteudo = canonico({ formato: 'cdd.periodo.v1', unidadeId, competencia, ...movimentos });
  return createHash('sha256').update(JSON.stringify(conteudo)).digest('hex');
}

export function competenciaAnterior(competencia: Competencia): Competencia | null {
  if (competencia === '0001-01') return null;
  const [ano, mes] = competencia.split('-').map(Number) as [number, number];
  return `${String(mes === 1 ? ano - 1 : ano).padStart(4, '0')}-${String(mes === 1 ? 12 : mes - 1).padStart(2, '0')}` as Competencia;
}

function comparar(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
