import type { ContaId, Fundo, FundoId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { id } from '@/mocks/ids';

export const fundos: readonly Fundo[] = [
  {
    id: id<FundoId>('obra'),
    codigoSistema: 'FUNDO_OBRA',
    nome: 'Obra do dormitório',
    nota: 'meta 24.000,00 · previsão de conclusão em novembro',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(18400),
    meta: reais(24000),
    ativo: true,
  },
  {
    id: id<FundoId>('feitio'),
    codigoSistema: 'FUNDO_FEITIO',
    nome: 'Feitio de dezembro',
    nota: 'insumos, garrafas e deslocamento',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(9200),
    meta: null,
    ativo: true,
  },
  {
    id: id<FundoId>('emergencia'),
    codigoSistema: 'FUNDO_EMERGENCIA',
    nome: 'Emergência e saúde',
    nota: 'intocável fora de emergência, decisão da direção',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(6000),
    meta: null,
    ativo: true,
  },
];
