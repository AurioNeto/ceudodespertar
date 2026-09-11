import type {
  ConsumoDeMateriaPrima,
  CustoDoFeitio,
  Dinheiro,
  EventoId,
  FeitioId,
  ItemId,
  LancamentoId,
  Litros,
} from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * `S-04` — um feitio em andamento e os anteriores, para o custo por litro ter
 * série. Os números de matéria-prima do feitio de março vieram do Doc 2 §4.3,
 * que é onde a conta que a casa nunca fechou está escrita por extenso.
 */

export interface FeitioNaTela {
  readonly id: FeitioId;
  readonly eventoId: EventoId;
  readonly nome: string;
  readonly dataInicio: string;
  readonly dataFim: string | null;
  readonly local: string;
  readonly participantes: readonly string[];
  readonly materiaPrima: readonly ConsumoDeMateriaPrima[];
  readonly custos: readonly CustoDoFeitio[];
  readonly litrosProduzidos: Litros | null;
  readonly forca: string | null;
  readonly loteProduzido: string | null;
}

const mp = (
  itemId: string,
  nome: string,
  quantidade: number,
  unidade: string,
  custo: Dinheiro,
  origem: string,
): ConsumoDeMateriaPrima => ({ itemId: id<ItemId>(itemId), nome, quantidade, unidade, custo, origem });

const custo = (
  lanc: string,
  descricao: string,
  categoria: string,
  valor: Dinheiro,
  confirmado: boolean,
): CustoDoFeitio => ({ lancamentoId: id<LancamentoId>(lanc), descricao, categoria, valor, confirmado });

export const emAndamento: FeitioNaTela = {
  id: id<FeitioId>('f-set-2026'),
  eventoId: id<EventoId>('e-feitio-set'),
  nome: 'Feitio de setembro',
  dataInicio: '08/09/2026',
  dataFim: null,
  local: 'Casa de feitio · Chácara',
  participantes: ['Chico Aguiar', 'Sérgio Bittencourt', 'Tobias Aguiar', 'Rosa Silveira', 'Carlos Menezes'],
  materiaPrima: [
    mp('i-jagube', 'Jagube', 240, 'kg', reais(6700), 'Colheita própria · sítio do Chico'),
    mp('i-chacrona', 'Chacrona', 180, 'kg', reais(4500), 'Compra · Céu do Mar'),
    mp('i-lenha', 'Lenha', 3, 'm³', reais(900), 'Compra · Serraria Ibiúna'),
  ],
  custos: [
    custo('lanc-9040', 'Ajuda de custo aos que ficaram', 'Prestadores de serviço', reais(1700), true),
    custo('lanc-9041', 'Alimentação da equipe · três dias', 'Alimentação de cerimônia', reais(860), true),
    custo('lanc-9052', 'Diesel e deslocamento da colheita', 'Combustível', reais(540), false),
    custo('lanc-9053', 'Gás de cozinha · dois botijões', 'Custo de feitio', reais(260), false),
  ],
  litrosProduzidos: null,
  forca: null,
  loteProduzido: null,
};

export const anteriores: readonly FeitioNaTela[] = [
  {
    id: id<FeitioId>('f-jun-2026'),
    eventoId: id<EventoId>('e-feitio-jun'),
    nome: 'Feitio de junho',
    dataInicio: '19/06/2026',
    dataFim: '22/06/2026',
    local: 'Casa de feitio · Chácara',
    participantes: ['Chico Aguiar', 'Sérgio Bittencourt', 'Rosa Silveira'],
    materiaPrima: [
      mp('i-jagube', 'Jagube', 150, 'kg', reais(4200), 'Colheita própria'),
      mp('i-chacrona', 'Chacrona', 110, 'kg', reais(2900), 'Compra · Céu do Mar'),
      mp('i-lenha', 'Lenha', 2, 'm³', reais(600), 'Compra'),
    ],
    custos: [
      custo('lanc-8305', 'Ajuda de custo', 'Prestadores de serviço', reais(1300), true),
      custo('lanc-8306', 'Alimentação da equipe', 'Alimentação de cerimônia', reais(560), true),
      custo('lanc-8307', 'Diesel', 'Combustível', reais(280), true),
    ],
    litrosProduzidos: 30,
    forca: 'Força 1',
    loteProduzido: 'Lote 06/2026',
  },
  {
    id: id<FeitioId>('f-mar-2026'),
    eventoId: id<EventoId>('e-feitio-mar'),
    nome: 'Feitio de março',
    dataInicio: '13/03/2026',
    dataFim: '16/03/2026',
    local: 'Casa de feitio · Chácara',
    participantes: ['Chico Aguiar', 'Tobias Aguiar', 'Carlos Menezes', 'Rosa Silveira'],
    materiaPrima: [mp('i-folha', 'Folha e cipó', 1, 'lote', reais(11200), 'Colheita e compra')],
    custos: [
      custo('lanc-7712', 'Mão de obra', 'Prestadores de serviço', reais(1700), true),
      custo('lanc-7713', 'Alimentação da equipe', 'Alimentação de cerimônia', reais(720), true),
      custo('lanc-7714', 'Diesel', 'Combustível', reais(480), true),
    ],
    litrosProduzidos: 48,
    forca: 'Força 2',
    loteProduzido: 'Lote 03/2026',
  },
  {
    id: id<FeitioId>('f-dez-2025'),
    eventoId: id<EventoId>('e-feitio-dez'),
    nome: 'Feitio de dezembro',
    dataInicio: '15/12/2025',
    dataFim: '18/12/2025',
    local: 'Casa de feitio · Chácara',
    participantes: ['Chico Aguiar', 'Sérgio Bittencourt'],
    materiaPrima: [mp('i-folha', 'Folha e cipó', 1, 'lote', reais(9700), 'Colheita e compra')],
    custos: [
      custo('lanc-6980', 'Mão de obra', 'Prestadores de serviço', reais(1600), true),
      custo('lanc-6981', 'Alimentação da equipe', 'Alimentação de cerimônia', reais(880), true),
    ],
    litrosProduzidos: 42,
    forca: 'Força 2',
    loteProduzido: 'Lote 12/2025',
  },
];

/**
 * A referência de fora. É o número que dá sentido a apurar o custo por litro:
 * sem ele, saber quanto custa o feitio não decide nada.
 */
export const aquisicaoExterna = {
  fornecedor: 'Céu do Mar',
  quando: 'março de 2026',
  litros: 12,
  custoPorLitro: reais(420),
  observacao: 'Última vez que a casa comprou daime pronto, para comparação.',
};

export const hojeNoFeitio = dataLocal('2026-09-11');

export const custoTotal = (f: FeitioNaTela): Dinheiro =>
  (f.materiaPrima.reduce((s, m) => s + m.custo, 0) + f.custos.reduce((s, c) => s + c.valor, 0)) as Dinheiro;

export const custoConfirmado = (f: FeitioNaTela): Dinheiro =>
  (f.materiaPrima.reduce((s, m) => s + m.custo, 0) +
    f.custos.filter((c) => c.confirmado).reduce((s, c) => s + c.valor, 0)) as Dinheiro;
