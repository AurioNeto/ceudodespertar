import type { Adiantamento } from '@cdd/contracts';

export const particionarPorStatus = (adiantamentos: readonly Adiantamento[]) => ({
  aguardando: adiantamentos.filter((a) => a.status === 'AGUARDANDO_AUTORIZACAO'),
  aRessarcir: adiantamentos.filter((a) => a.status === 'AUTORIZADO'),
  fechados: adiantamentos.filter((a) => a.status === 'RESSARCIDO' || a.status === 'RECUSADO'),
});
