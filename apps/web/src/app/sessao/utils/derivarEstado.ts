import type { Eu } from '@cdd/contracts';
import { estadoDoErroDoEu } from '../estadoDaSessao';
import type { EstadoDaSessao } from '../estadoDaSessao';

export const INTERVALO_DE_NOVA_TENTATIVA_DO_EU_EM_MS = 30_000;

const ehFalhaPassageira = (estado: EstadoDaSessao): boolean => estado.tipo === 'indisponivel' || estado.tipo === 'falha';

export function intervaloDeNovaTentativaDoEu(consulta: { status: string; data: Eu | undefined; error: unknown }): number | false {
  const passageira = consulta.status === 'error' && consulta.data !== undefined && ehFalhaPassageira(estadoDoErroDoEu(consulta.error));
  return passageira ? INTERVALO_DE_NOVA_TENTATIVA_DO_EU_EM_MS : false;
}

export function derivarEstado(
  temUsuario: boolean | null,
  consulta: { status: 'pending' | 'error' | 'success'; data: Eu | undefined; error: unknown },
): EstadoDaSessao {
  if (temUsuario === null) return { tipo: 'verificando' };
  if (!temUsuario) return { tipo: 'sem-sessao' };
  if (consulta.status === 'pending') return { tipo: 'verificando' };
  if (consulta.status === 'error') {
    const doErro = estadoDoErroDoEu(consulta.error);
    return consulta.data && ehFalhaPassageira(doErro) ? { tipo: 'ativa', eu: consulta.data } : doErro;
  }
  return consulta.data ? { tipo: 'ativa', eu: consulta.data } : { tipo: 'falha' };
}
