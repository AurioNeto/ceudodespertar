import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { contas as contasIniciais } from '@/pages/mocks/contas';

export const contaVazia = (id: ContaId): Conta => ({
  id,
  nome: '',
  descricao: '',
  tipo: 'CONTA_CORRENTE',
  titularidade: 'INSTITUCIONAL',
  pessoaTitularId: null,
  responsavel: '',
  saldo: reais(0),
  ultimoMovimento: null,
  conciliacao: 'PENDENTE',
  alerta: null,
  ativa: true,
});

export const fundoVazio = (id: FundoId): Fundo => ({
  id,
  codigoSistema: '',
  nome: '',
  nota: '',
  contaVinculadaId: contasIniciais[0]?.id ?? ('cora' as ContaId),
  valorReservado: reais(0),
  meta: null,
  ativo: true,
});
