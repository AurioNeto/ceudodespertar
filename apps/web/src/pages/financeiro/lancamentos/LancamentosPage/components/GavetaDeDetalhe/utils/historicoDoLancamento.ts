import type { LancamentoNaLista } from '@cdd/contracts';
import { formatarData } from '@/pages/utils/formato';

export interface EntradaDoHistorico {
  quando: string;
  texto: string;
}

export function historicoDoLancamento(registro: LancamentoNaLista): EntradaDoHistorico[] {
  const estornado = registro.status === 'ESTORNADO';

  return [
    { quando: `${formatarData(registro.data)} ${registro.hora}`, texto: `Lançado por ${registro.registradoPor}.` },
    registro.status === 'A_CONFERIR'
      ? { quando: '—', texto: 'Aguardando conferência da tesouraria.' }
      : { quando: `${formatarData(registro.data)} 21:04`, texto: 'Consolidado por Aurio Neto.' },
    ...(estornado ? [{ quando: '20/08/2026 09:30', texto: 'Estornado: valor lançado em duplicidade.' }] : []),
  ];
}
