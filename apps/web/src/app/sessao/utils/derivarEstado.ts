import type { Eu } from '@cdd/contracts';
import { estadoDoErroDoEu } from '../estadoDaSessao';
import type { EstadoDaSessao } from '../estadoDaSessao';

export function derivarEstado(
  temUsuario: boolean | null,
  consulta: { status: 'pending' | 'error' | 'success'; data: Eu | undefined; error: unknown },
): EstadoDaSessao {
  if (temUsuario === null) return { tipo: 'verificando' };
  if (!temUsuario) return { tipo: 'sem-sessao' };
  if (consulta.status === 'pending') return { tipo: 'verificando' };
  if (consulta.status === 'error') return estadoDoErroDoEu(consulta.error);
  return consulta.data ? { tipo: 'ativa', eu: consulta.data } : { tipo: 'falha' };
}
