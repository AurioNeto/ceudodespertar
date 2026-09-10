import type {
  ContaId,
  ImportacaoDeExtrato,
  ImportacaoId,
  LancamentoAConciliar,
  LancamentoId,
  LinhaExtrato,
  LinhaExtratoId,
  SugestaoDeCasamento,
} from '@cdd/contracts';
import { dataHora, dataLocal, reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * Conciliação do extrato de setembro do Cora PJ.
 *
 * As duas colunas contam coisas diferentes, e a da esquerda é o produto
 * inteiro desta fase: **saiu dinheiro que ninguém registrou**. Hoje esse
 * problema é invisível — nada na planilha denuncia o que não foi lançado.
 */

const linha = (n: string) => id<LinhaExtratoId>(n);
const lanc = (n: string) => id<LancamentoId>(n);

export const importacao: ImportacaoDeExtrato = {
  id: id<ImportacaoId>('imp-1'),
  contaId: id<ContaId>('cora'),
  contaNome: 'Cora PJ',
  arquivo: 'extrato-cora-2026-09.ofx',
  periodo: { de: dataLocal('2026-09-01'), ate: dataLocal('2026-09-12') },
  importadoPorNome: 'Aurio Neto',
  importadoEm: dataHora('2026-09-12T09:40:00-03:00'),
  linhasLidas: 14,
  /** I1: já estavam no sistema pelo FITID e nem entraram de novo. */
  linhasJaConhecidas: 3,
};

/** Linhas do banco sem nada correspondente no sistema. */
export const linhasSozinhas: readonly LinhaExtrato[] = [
  {
    id: linha('lx-1'),
    identificadorExterno: '20260903-0001-1480',
    data: dataLocal('2026-09-03'),
    valor: reais(1480),
    sinal: 'DEBITO',
    descricaoBanco: 'TRANSF PIX MARIA S SANTOS',
    status: 'NAO_CONCILIADA',
    lancamentoId: null,
    transferenciaId: null,
    motivoIgnorada: null,
  },
  {
    id: linha('lx-2'),
    identificadorExterno: '20260901-0004-2500',
    data: dataLocal('2026-09-01'),
    valor: reais(2500),
    sinal: 'CREDITO',
    descricaoBanco: 'TED RECEBIDA J R OLIVEIRA',
    status: 'NAO_CONCILIADA',
    lancamentoId: null,
    transferenciaId: null,
    motivoIgnorada: null,
  },
  {
    id: linha('lx-3'),
    identificadorExterno: '20260906-0002-0230',
    data: dataLocal('2026-09-06'),
    valor: reais(230),
    sinal: 'DEBITO',
    descricaoBanco: 'SUPERMERCADO BOM PRECO',
    status: 'NAO_CONCILIADA',
    lancamentoId: null,
    transferenciaId: null,
    motivoIgnorada: null,
  },
  {
    id: linha('lx-4'),
    identificadorExterno: '20260909-0007-0045',
    data: dataLocal('2026-09-09'),
    valor: reais(45),
    sinal: 'DEBITO',
    descricaoBanco: 'TARIFA PACOTE SERVICOS',
    status: 'NAO_CONCILIADA',
    lancamentoId: null,
    transferenciaId: null,
    motivoIgnorada: null,
  },
  {
    id: linha('lx-5'),
    identificadorExterno: '20260912-0003-0089',
    data: dataLocal('2026-09-12'),
    valor: reais(89.9),
    sinal: 'DEBITO',
    descricaoBanco: 'NETFLIX.COM',
    status: 'NAO_CONCILIADA',
    lancamentoId: null,
    transferenciaId: null,
    motivoIgnorada: null,
  },
];

/** Lançamentos do sistema que o banco não confirma. */
export const lancamentosSozinhos: readonly LancamentoAConciliar[] = [
  {
    id: lanc('lc-1'),
    data: dataLocal('2026-08-28'),
    motivo: 'mercado cerimônia mãe divina',
    valor: reais(187.4),
    natureza: 'DESPESA',
    conta: 'Cora PJ',
    registradoPorNome: 'Aurio Neto',
  },
  {
    id: lanc('lc-2'),
    data: dataLocal('2026-08-22'),
    motivo: 'venda de camisetas na lojinha',
    valor: reais(285),
    natureza: 'RECEITA',
    conta: 'Cora PJ',
    registradoPorNome: 'Paty Munay',
  },
  {
    id: lanc('lc-3'),
    data: dataLocal('2026-09-05'),
    motivo: 'diesel do caminhão',
    valor: reais(370.7),
    natureza: 'DESPESA',
    conta: 'Cora PJ',
    registradoPorNome: 'Chico Aguiar',
  },
];

/** O motor propõe por valor + proximidade de data + conta. Ninguém casa sozinho. */
export const sugestoes: readonly SugestaoDeCasamento[] = [
  {
    linha: {
      id: linha('lx-6'),
      identificadorExterno: '20260902-0001-4874',
      data: dataLocal('2026-09-02'),
      valor: reais(487.4),
      sinal: 'DEBITO',
      descricaoBanco: 'ASSAI ATACADISTA IBIUNA',
      status: 'NAO_CONCILIADA',
      lancamentoId: null,
      transferenciaId: null,
      motivoIgnorada: null,
    },
    lancamento: {
      id: lanc('lc-4'),
      data: dataLocal('2026-09-02'),
      motivo: 'mercado do trabalho de setembro',
      valor: reais(487.4),
      natureza: 'DESPESA',
      conta: 'Cora PJ',
      registradoPorNome: 'Aurio Neto',
    },
    forca: 'ALTA',
    porque: 'mesmo valor, mesma data, mesma conta',
  },
  {
    linha: {
      id: linha('lx-7'),
      identificadorExterno: '20260905-0002-3200',
      data: dataLocal('2026-09-05'),
      valor: reais(320),
      sinal: 'DEBITO',
      descricaoBanco: 'POSTO IPIRANGA IBIUNA',
      status: 'NAO_CONCILIADA',
      lancamentoId: null,
      transferenciaId: null,
      motivoIgnorada: null,
    },
    lancamento: {
      id: lanc('lc-5'),
      data: dataLocal('2026-09-04'),
      motivo: 'combustível da van',
      valor: reais(320),
      natureza: 'DESPESA',
      conta: 'Cora PJ',
      registradoPorNome: 'Chico Aguiar',
    },
    forca: 'ALTA',
    porque: 'mesmo valor, um dia de diferença',
  },
  {
    linha: {
      id: linha('lx-8'),
      identificadorExterno: '20260830-0005-5179',
      data: dataLocal('2026-08-30'),
      valor: reais(517.9),
      sinal: 'DEBITO',
      descricaoBanco: 'CORREIOS AGF IBIUNA',
      status: 'NAO_CONCILIADA',
      lancamentoId: null,
      transferenciaId: null,
      motivoIgnorada: null,
    },
    lancamento: {
      id: lanc('lc-6'),
      data: dataLocal('2026-08-26'),
      motivo: 'envio de camisetas da lojinha',
      valor: reais(517.9),
      natureza: 'DESPESA',
      conta: 'Cora PJ',
      registradoPorNome: 'Paty Munay',
    },
    forca: 'MEDIA',
    porque: 'mesmo valor, quatro dias de diferença',
  },
];

export const motivosDeIgnorar: readonly string[] = [
  'Tarifa bancária, sem lançamento correspondente',
  'Movimentação pessoal em conta de terceiro',
  'Estorno do próprio banco',
  'Duplicidade do extrato',
];

export const contasComExtrato: readonly { readonly id: ContaId; readonly nome: string }[] = [
  { id: id<ContaId>('cora'), nome: 'Cora PJ' },
  { id: id<ContaId>('nubank'), nome: 'Nubank Paty' },
  { id: id<ContaId>('itau'), nome: 'Itaú Munay' },
];
