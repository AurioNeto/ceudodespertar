import type { Dinheiro, EventoId, FormaDePagamento, StatusContratacao } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * `E-13` — o que a Munay faz fora de casa.
 *
 * Quatro contratações porque são quatro estados que pedem coisas diferentes da
 * tesouraria: uma proposta que ainda não é nada, uma confirmada esperando o
 * dinheiro, uma realizada e fechada, e uma cancelada **depois** de o dinheiro
 * ter entrado — que é o caso de CN4 e o que alimenta a fila de devoluções.
 */

export interface CacheDeMusico {
  readonly nome: string;
  readonly funcao: string;
  readonly valor: Dinheiro;
  readonly pago: boolean;
}

export interface CustoDoEvento {
  readonly descricao: string;
  readonly valor: Dinheiro;
}

export interface ContratacaoNaTela {
  readonly eventoId: EventoId;
  readonly contratante: string;
  readonly documento: string | null;
  readonly evento: string;
  readonly data: string;
  readonly local: string;
  readonly valorAcordado: Dinheiro;
  readonly formaPagamento: FormaDePagamento;
  readonly dataPrevistaPagamento: string | null;
  readonly status: StatusContratacao;
  readonly recebidoEm: string | null;
  readonly lancamentoReceitaId: string | null;
  readonly caches: readonly CacheDeMusico[];
  readonly custos: readonly CustoDoEvento[];
  readonly observacoes: string;
  /** CN4: cancelada com valor já recebido. */
  readonly devolucaoDevida: { readonly valor: Dinheiro; readonly situacao: string } | null;
}

const ev = (n: string) => id<EventoId>(n);

export const contratacoes: readonly ContratacaoNaTela[] = [
  {
    eventoId: ev('e-luz-do-norte'),
    contratante: 'Instituto Luz do Norte',
    documento: '22.740.115/0001-08',
    evento: 'Apresentação de abertura',
    data: '30/11/2026',
    local: 'Sede do Instituto · Atibaia',
    valorAcordado: reais(2400),
    formaPagamento: 'FATURADO',
    dataPrevistaPagamento: '15/12/2026',
    status: 'PROPOSTA',
    recebidoEm: null,
    lancamentoReceitaId: null,
    caches: [
      { nome: 'Sérgio Bittencourt', funcao: 'violão e voz', valor: reais(500), pago: false },
      { nome: 'Helena Duarte', funcao: 'percussão', valor: reais(400), pago: false },
    ],
    custos: [{ descricao: 'Deslocamento · van', valor: reais(280) }],
    observacoes: 'Proposta enviada em 02/09. Eles pediram para faturar em 15 dias após o evento.',
    devolucaoDevida: null,
  },
  {
    eventoId: ev('e-estrela-guia'),
    contratante: 'Centro Estrela Guia',
    documento: '19.550.802/0001-71',
    evento: 'Cerimônia contratada',
    data: '18/10/2026',
    local: 'Chácara do Centro · Cotia',
    valorAcordado: reais(3200),
    formaPagamento: 'ANTECIPADO',
    dataPrevistaPagamento: '10/10/2026',
    status: 'CONFIRMADA',
    recebidoEm: null,
    lancamentoReceitaId: null,
    caches: [
      { nome: 'Sérgio Bittencourt', funcao: 'violão e voz', valor: reais(600), pago: false },
      { nome: 'Helena Duarte', funcao: 'percussão', valor: reais(450), pago: false },
      { nome: 'Chico Aguiar', funcao: 'maracá e apoio', valor: reais(350), pago: false },
    ],
    custos: [
      { descricao: 'Deslocamento · van', valor: reais(340) },
      { descricao: 'Alimentação da equipe', valor: reais(210) },
    ],
    observacoes: 'Combinado antecipado, mas o pagamento ainda não entrou. Cobrança prevista para 10/10.',
    devolucaoDevida: null,
  },
  {
    eventoId: ev('e-jaci'),
    contratante: 'Casa de Cura Jaci',
    documento: '31.209.664/0001-30',
    evento: 'Cerimônia contratada',
    data: '16/08/2026',
    local: 'Casa de Cura · Mairiporã',
    valorAcordado: reais(2800),
    formaPagamento: 'NO_ATO',
    dataPrevistaPagamento: null,
    status: 'REALIZADA',
    recebidoEm: '16/08/2026',
    lancamentoReceitaId: 'lanc-8760',
    caches: [
      { nome: 'Sérgio Bittencourt', funcao: 'violão e voz', valor: reais(600), pago: true },
      { nome: 'Helena Duarte', funcao: 'percussão', valor: reais(450), pago: true },
      { nome: 'Chico Aguiar', funcao: 'maracá e apoio', valor: reais(350), pago: true },
    ],
    custos: [
      { descricao: 'Deslocamento · van', valor: reais(320) },
      { descricao: 'Hospedagem da equipe', valor: reais(180) },
    ],
    observacoes: 'Pago em espécie no dia, depositado no Cora no dia seguinte.',
    devolucaoDevida: null,
  },
  {
    eventoId: ev('e-contratada-agosto'),
    contratante: 'Instituto Semente Viva',
    documento: '41.118.209/0001-45',
    evento: 'Cerimônia contratada',
    data: '30/08/2026',
    local: 'Sede do Instituto · Sorocaba',
    valorAcordado: reais(1800),
    formaPagamento: 'ANTECIPADO',
    dataPrevistaPagamento: '10/08/2026',
    status: 'CANCELADA',
    recebidoEm: '10/08/2026',
    lancamentoReceitaId: 'lanc-8801',
    caches: [],
    custos: [],
    observacoes: 'Cancelada pelo contratante em 28/08, com dois dias de antecedência. Nenhum cachê foi pago.',
    devolucaoDevida: { valor: reais(1800), situacao: 'Na fila da tesouraria, em Devoluções a pagar' },
  },
];

export const STATUS_ROTULO: Record<StatusContratacao, string> = {
  PROPOSTA: 'Proposta',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

export const FORMA_ROTULO: Record<FormaDePagamento, string> = {
  ANTECIPADO: 'Antecipado',
  NO_ATO: 'No ato',
  FATURADO: 'Faturado',
};

export const FORMA_EXPLICACAO: Record<FormaDePagamento, string> = {
  ANTECIPADO: 'Combinado para antes do trabalho.',
  NO_ATO: 'Recebido no dia, na hora.',
  FATURADO: 'A receber depois do trabalho, na data combinada.',
};

/** Munay é MEI — o teto é parâmetro da unidade, e muda por lei. */
export const munay = {
  nome: 'Munay',
  documento: '41.882.310/0001-55',
  faturamentoNoAno: reais(43700),
  tetoAnual: reais(81000),
};
