import type { Competencia, Conta, ContaId, Fatura, FaturaId, LancamentoId, PessoaId } from '@cdd/contracts';
import { competencia, dataLocal, reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * Cartões e faturas.
 *
 * Os cartões ficam fora de `contas` (mocks/financeiro) de propósito: aquela
 * lista alimenta o saldo consolidado do Painel, e cartão é **passivo**, não
 * saldo. Somá-lo ali faria a casa parecer ter dinheiro que é dívida.
 * Quando `F-07` passar a exibir cartões, é lá que a conta precisa distinguir
 * saldo de dívida — e é o que falta para as duas listas virarem uma só.
 */

export const cartoes: readonly Conta[] = [
  {
    id: id<ContaId>('cartao-cora'),
    nome: 'Cartão Cora PJ',
    descricao: 'cartão corporativo · CNPJ do CDD',
    tipo: 'CARTAO_CREDITO',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    responsavel: 'Aurio Neto',
    saldo: reais(0),
    ultimoMovimento: dataLocal('2026-09-08'),
    conciliacao: 'NAO_APLICAVEL',
    alerta: null,
    ativa: true,
  },
  {
    id: id<ContaId>('cartao-itau'),
    nome: 'Cartão Itaú Paty',
    descricao: 'cartão pessoal usado em nome da casa',
    tipo: 'CARTAO_CREDITO',
    titularidade: 'PESSOAL_DE_TERCEIRO',
    pessoaTitularId: id<PessoaId>('p-paty'),
    responsavel: 'Paty Munay',
    saldo: reais(0),
    ultimoMovimento: dataLocal('2026-09-07'),
    conciliacao: 'NAO_APLICAVEL',
    /** CT2: despesa em conta de terceiro exige adiantamento correspondente. */
    alerta: 'Cartão pessoal: cada compra desta fatura gera um adiantamento a ressarcir.',
    ativa: true,
  },
];

const lanc = (n: string) => id<LancamentoId>(n);

export const faturas: readonly Fatura[] = [
  // ── Cartão Cora PJ ────────────────────────────────────────────────────────
  {
    id: id<FaturaId>('f-cora-09'),
    contaId: id<ContaId>('cartao-cora'),
    competencia: competencia('2026-09'),
    dataFechamento: dataLocal('2026-09-28'),
    dataVencimento: dataLocal('2026-10-05'),
    status: 'ABERTA',
    pagaEm: null,
    transferenciaPagamentoId: null,
    contaPagamentoId: null,
    compras: [
      {
        id: lanc('c-09-1'),
        data: dataLocal('2026-09-01'),
        motivo: 'mercado do trabalho de setembro',
        categoria: 'Alimentação de cerimônia',
        grupo: 'Cozinha',
        valor: reais(534.2),
        status: 'CONFIRMADO',
        registradoPorNome: 'Aurio Neto',
      },
      {
        id: lanc('c-09-2'),
        data: dataLocal('2026-09-04'),
        motivo: 'aluguel de betoneira',
        categoria: 'Obra do dormitório',
        grupo: 'Dormitório',
        valor: reais(380),
        status: 'A_CONFERIR',
        registradoPorNome: 'Lucia Prado',
      },
      {
        id: lanc('c-09-3'),
        data: dataLocal('2026-09-08'),
        motivo: 'diesel do caminhão',
        categoria: 'Combustível',
        grupo: 'Chácara',
        valor: reais(370.7),
        status: 'CONFIRMADO',
        registradoPorNome: 'Chico Aguiar',
      },
    ],
  },
  {
    id: id<FaturaId>('f-cora-08'),
    contaId: id<ContaId>('cartao-cora'),
    competencia: competencia('2026-08'),
    dataFechamento: dataLocal('2026-08-28'),
    dataVencimento: dataLocal('2026-09-05'),
    status: 'FECHADA',
    pagaEm: null,
    transferenciaPagamentoId: null,
    contaPagamentoId: null,
    compras: [
      {
        id: lanc('c-08-1'),
        data: dataLocal('2026-08-02'),
        motivo: 'mercado da cerimônia de agosto',
        categoria: 'Alimentação de cerimônia',
        grupo: 'Cozinha',
        valor: reais(487.4),
        status: 'CONFIRMADO',
        registradoPorNome: 'Aurio Neto',
      },
      {
        id: lanc('c-08-2'),
        data: dataLocal('2026-08-05'),
        motivo: 'diesel do caminhão',
        categoria: 'Combustível',
        grupo: 'Chácara',
        valor: reais(320),
        status: 'CONFIRMADO',
        registradoPorNome: 'Chico Aguiar',
      },
      {
        id: lanc('c-08-3'),
        data: dataLocal('2026-08-11'),
        motivo: 'material elétrico do dormitório',
        categoria: 'Obra do dormitório',
        grupo: 'Dormitório',
        valor: reais(764.8),
        status: 'CONFIRMADO',
        registradoPorNome: 'Lucia Prado',
      },
      {
        id: lanc('c-08-4'),
        data: dataLocal('2026-08-17'),
        motivo: 'itens do kit de primeiros socorros',
        categoria: 'Manutenção e zeladoria',
        grupo: 'CDD',
        valor: reais(145.2),
        status: 'CONFIRMADO',
        registradoPorNome: 'Marília Prado',
      },
      {
        id: lanc('c-08-5'),
        data: dataLocal('2026-08-22'),
        motivo: 'reposição da despensa',
        categoria: 'Alimentação de cerimônia',
        grupo: 'Cozinha',
        valor: reais(612.3),
        status: 'CONFIRMADO',
        registradoPorNome: 'Aurio Neto',
      },
      {
        id: lanc('c-08-6'),
        data: dataLocal('2026-08-26'),
        motivo: 'envio de camisetas da lojinha',
        categoria: 'Custo da lojinha',
        grupo: 'Lojinha',
        valor: reais(517.9),
        status: 'CONFIRMADO',
        registradoPorNome: 'Paty Munay',
      },
    ],
  },
  {
    id: id<FaturaId>('f-cora-07'),
    contaId: id<ContaId>('cartao-cora'),
    competencia: competencia('2026-07'),
    dataFechamento: dataLocal('2026-07-28'),
    dataVencimento: dataLocal('2026-08-05'),
    status: 'PAGA',
    pagaEm: dataLocal('2026-08-05'),
    transferenciaPagamentoId: null,
    contaPagamentoId: id<ContaId>('cora'),
    compras: [
      {
        id: lanc('c-07-1'),
        data: dataLocal('2026-07-03'),
        motivo: 'mercado da cerimônia de julho',
        categoria: 'Alimentação de cerimônia',
        grupo: 'Cozinha',
        valor: reais(598.7),
        status: 'CONFIRMADO',
        registradoPorNome: 'Aurio Neto',
      },
      {
        id: lanc('c-07-2'),
        data: dataLocal('2026-07-09'),
        motivo: 'madeira do feitio',
        categoria: 'Custo de feitio',
        grupo: 'Chácara',
        valor: reais(1240),
        status: 'CONFIRMADO',
        registradoPorNome: 'Chico Aguiar',
      },
      {
        id: lanc('c-07-3'),
        data: dataLocal('2026-07-15'),
        motivo: 'diesel do feitio',
        categoria: 'Combustível',
        grupo: 'Chácara',
        valor: reais(486.5),
        status: 'CONFIRMADO',
        registradoPorNome: 'Chico Aguiar',
      },
      {
        id: lanc('c-07-4'),
        data: dataLocal('2026-07-21'),
        motivo: 'torneiras e conexões',
        categoria: 'Obra do dormitório',
        grupo: 'Dormitório',
        valor: reais(702.4),
        status: 'CONFIRMADO',
        registradoPorNome: 'Lucia Prado',
      },
      {
        id: lanc('c-07-5'),
        data: dataLocal('2026-07-27'),
        motivo: 'reposição da despensa',
        categoria: 'Alimentação de cerimônia',
        grupo: 'Cozinha',
        valor: reais(484.8),
        status: 'CONFIRMADO',
        registradoPorNome: 'Aurio Neto',
      },
    ],
  },

  // ── Cartão Itaú Paty ──────────────────────────────────────────────────────
  {
    id: id<FaturaId>('f-itau-09'),
    contaId: id<ContaId>('cartao-itau'),
    competencia: competencia('2026-09'),
    dataFechamento: dataLocal('2026-09-30'),
    dataVencimento: dataLocal('2026-10-08'),
    status: 'ABERTA',
    pagaEm: null,
    transferenciaPagamentoId: null,
    contaPagamentoId: null,
    compras: [
      {
        id: lanc('i-09-1'),
        data: dataLocal('2026-09-02'),
        motivo: 'material da secretaria',
        categoria: 'Administrativo',
        grupo: 'Secretaria',
        valor: reais(187.3),
        status: 'CONFIRMADO',
        registradoPorNome: 'Paty Munay',
      },
      {
        id: lanc('i-09-2'),
        data: dataLocal('2026-09-07'),
        motivo: "peças da bomba d'água",
        categoria: 'Manutenção e zeladoria',
        grupo: 'Chácara',
        valor: reais(425),
        status: 'A_CONFERIR',
        registradoPorNome: 'Paty Munay',
      },
    ],
  },
  {
    id: id<FaturaId>('f-itau-08'),
    contaId: id<ContaId>('cartao-itau'),
    competencia: competencia('2026-08'),
    dataFechamento: dataLocal('2026-08-30'),
    dataVencimento: dataLocal('2026-09-08'),
    status: 'FECHADA',
    pagaEm: null,
    transferenciaPagamentoId: null,
    contaPagamentoId: null,
    compras: [
      {
        id: lanc('i-08-1'),
        data: dataLocal('2026-08-06'),
        motivo: 'livros para a biblioteca',
        categoria: 'Administrativo',
        grupo: 'CDD',
        valor: reais(218.9),
        status: 'CONFIRMADO',
        registradoPorNome: 'Paty Munay',
      },
      {
        id: lanc('i-08-2'),
        data: dataLocal('2026-08-13'),
        motivo: 'medicação de emergência',
        categoria: 'Manutenção e zeladoria',
        grupo: 'CDD',
        valor: reais(96.77),
        status: 'CONFIRMADO',
        registradoPorNome: 'Marília Prado',
      },
      {
        id: lanc('i-08-3'),
        data: dataLocal('2026-08-19'),
        motivo: 'compras da cozinha',
        categoria: 'Alimentação de cerimônia',
        grupo: 'Cozinha',
        valor: reais(452),
        status: 'CONFIRMADO',
        registradoPorNome: 'Paty Munay',
      },
      {
        id: lanc('i-08-4'),
        data: dataLocal('2026-08-24'),
        motivo: 'tecidos para as toalhas do altar',
        categoria: 'Administrativo',
        grupo: 'Secretaria',
        valor: reais(300),
        status: 'CONFIRMADO',
        registradoPorNome: 'Paty Munay',
      },
    ],
  },
];

export const totalDaFatura = (f: Fatura): number => f.compras.reduce((soma, c) => soma + c.valor, 0);

/** Contas de onde a fatura pode ser paga — cartão não paga cartão. */
export const contasPagadoras: readonly { readonly id: ContaId; readonly nome: string }[] = [
  { id: id<ContaId>('cora'), nome: 'Cora PJ' },
  { id: id<ContaId>('especie'), nome: 'Espécie' },
  { id: id<ContaId>('itau'), nome: 'Itaú Munay' },
];

export const competenciaDeHoje: Competencia = competencia('2026-09');
