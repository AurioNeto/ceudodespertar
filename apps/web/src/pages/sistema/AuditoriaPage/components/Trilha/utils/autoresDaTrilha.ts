import type { RegistroDeAuditoria } from '@cdd/contracts';

/** Quem aparece nos filtros — vem dos próprios registros, sem lista à parte. */
export const autoresDaTrilha = (registros: readonly RegistroDeAuditoria[]): readonly string[] =>
  [...new Set(registros.map((r) => r.autorNome))].toSorted((a, b) => a.localeCompare(b, 'pt-BR'));
