import type { Adiantamento, AdiantamentoId, ContaId, LancamentoId, PessoaId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * Adiantamentos: quem tirou do próprio bolso e ainda não foi ressarcido.
 *
 * A prática existe e é invisível — o Doc 2 §1.5 cita "estorno compras cartão
 * crédito Paty, R$ 1.067,67 + R$ 1.700,86" como o rastro dela na planilha.
 * Aqui ela vira agregado, com autorização e ressarcimento rastreáveis.
 */

/** A2: só conta de terceiro custeia adiantamento. A3: tem de ser da pessoa. */
export interface ContaPessoal {
  readonly id: ContaId;
  readonly nome: string;
  readonly pessoaId: PessoaId;
}

export const contasPessoais: readonly ContaPessoal[] = [
  { id: id<ContaId>('nubank'), nome: 'Nubank Paty', pessoaId: id<PessoaId>('p-paty') },
  { id: id<ContaId>('cartao-itau'), nome: 'Cartão Itaú Paty', pessoaId: id<PessoaId>('p-paty') },
  { id: id<ContaId>('nubank-carlao'), nome: 'Nubank Carlão', pessoaId: id<PessoaId>('p-carlao') },
  { id: id<ContaId>('caixa-carlao'), nome: 'Caixa Carlão', pessoaId: id<PessoaId>('p-carlao') },
];

export const contasInstitucionais: readonly { readonly id: ContaId; readonly nome: string }[] = [
  { id: id<ContaId>('cora'), nome: 'Cora PJ' },
  { id: id<ContaId>('especie'), nome: 'Espécie' },
];

/** Quem pode adiantar: quem tem conta pessoal cadastrada. */
export const quemAdianta: readonly { readonly id: PessoaId; readonly nome: string }[] = [
  { id: id<PessoaId>('p-paty'), nome: 'Paty Munay' },
  { id: id<PessoaId>('p-carlao'), nome: 'Carlos Andrade' },
  { id: id<PessoaId>('p-lucia'), nome: 'Lucia Prado' },
];

const l = (n: string) => id<LancamentoId>(n);

export const adiantamentos: readonly Adiantamento[] = [
  {
    id: id<AdiantamentoId>('a-1'),
    pessoaId: id<PessoaId>('p-paty'),
    pessoaNome: 'Paty Munay',
    contaOrigemId: id<ContaId>('cartao-itau'),
    contaOrigemNome: 'Cartão Itaú Paty',
    valor: reais(1067.67),
    dataDespesa: dataLocal('2026-08-24'),
    motivo: 'compras da cozinha e tecidos do altar',
    categoria: 'Alimentação de cerimônia',
    grupo: 'Cozinha',
    lancamentoId: l('i-08-3'),
    comprovante: null,
    status: 'AGUARDANDO_AUTORIZACAO',
    autorizadoPorNome: null,
    autorizadoEm: null,
    recusaMotivo: null,
    ressarcidoEm: null,
    contaRessarcimentoNome: null,
  },
  {
    id: id<AdiantamentoId>('a-2'),
    pessoaId: id<PessoaId>('p-carlao'),
    pessoaNome: 'Carlos Andrade',
    contaOrigemId: id<ContaId>('nubank-carlao'),
    contaOrigemNome: 'Nubank Carlão',
    valor: reais(430),
    dataDespesa: dataLocal('2026-09-01'),
    motivo: 'conserto da bomba do poço',
    categoria: 'Manutenção e zeladoria',
    grupo: 'Chácara',
    lancamentoId: l('x-201'),
    comprovante: null,
    status: 'AGUARDANDO_AUTORIZACAO',
    autorizadoPorNome: null,
    autorizadoEm: null,
    recusaMotivo: null,
    ressarcidoEm: null,
    contaRessarcimentoNome: null,
  },
  {
    id: id<AdiantamentoId>('a-3'),
    pessoaId: id<PessoaId>('p-paty'),
    pessoaNome: 'Paty Munay',
    contaOrigemId: id<ContaId>('nubank'),
    contaOrigemNome: 'Nubank Paty',
    valor: reais(1700.86),
    dataDespesa: dataLocal('2026-07-11'),
    motivo: 'camisetas da lojinha, lote de agosto',
    categoria: 'Custo da lojinha',
    grupo: 'Lojinha',
    lancamentoId: l('x-188'),
    comprovante: null,
    status: 'AUTORIZADO',
    autorizadoPorNome: 'Marta Neto',
    autorizadoEm: dataLocal('2026-07-14'),
    recusaMotivo: null,
    ressarcidoEm: null,
    contaRessarcimentoNome: null,
  },
  {
    id: id<AdiantamentoId>('a-4'),
    pessoaId: id<PessoaId>('p-lucia'),
    pessoaNome: 'Lucia Prado',
    contaOrigemId: id<ContaId>('nubank'),
    contaOrigemNome: 'Nubank Paty',
    valor: reais(268.4),
    dataDespesa: dataLocal('2026-08-06'),
    motivo: 'ferragens do dormitório',
    categoria: 'Obra do dormitório',
    grupo: 'Dormitório',
    lancamentoId: l('x-193'),
    comprovante: null,
    status: 'AUTORIZADO',
    autorizadoPorNome: 'Marta Neto',
    autorizadoEm: dataLocal('2026-08-08'),
    recusaMotivo: null,
    ressarcidoEm: null,
    contaRessarcimentoNome: null,
  },
  {
    id: id<AdiantamentoId>('a-5'),
    pessoaId: id<PessoaId>('p-carlao'),
    pessoaNome: 'Carlos Andrade',
    contaOrigemId: id<ContaId>('caixa-carlao'),
    contaOrigemNome: 'Caixa Carlão',
    valor: reais(612),
    dataDespesa: dataLocal('2026-06-19'),
    motivo: 'diesel do feitio de junho',
    categoria: 'Combustível',
    grupo: 'Chácara',
    lancamentoId: l('x-160'),
    comprovante: null,
    status: 'RESSARCIDO',
    autorizadoPorNome: 'Aurio Neto (padrinho)',
    autorizadoEm: dataLocal('2026-06-20'),
    recusaMotivo: null,
    ressarcidoEm: dataLocal('2026-07-02'),
    contaRessarcimentoNome: 'Cora PJ',
  },
];

/* ---------------------------------------------------------------------------
   Perspectivas — andaime de protótipo.

   A1 só é demonstrável se der para olhar a tela como pessoas diferentes: quem
   tem a permissão e o vínculo, quem tem a permissão e não tem o vínculo, e
   quem não tem a permissão. As três existem no sistema real; o que sai com o
   backend é este seletor, não os estados que ele revela.
   --------------------------------------------------------------------------- */

export interface Perspectiva {
  readonly chave: string;
  readonly nome: string;
  readonly grupo: string;
  /** Doc 3 §4.1 — o que o grupo pode. */
  readonly podeRegistrar: boolean;
  readonly podeAutorizar: boolean;
  readonly podeRessarcir: boolean;
  readonly podeLerReembolsos: boolean;
  /** Doc 2, A1 — o eixo do domínio, independente da permissão. */
  readonly vinculoDeAutoridade: 'PADRINHO' | 'MADRINHA' | null;
  readonly notaDoVinculo: string | null;
}

export const perspectivas: readonly Perspectiva[] = [
  {
    chave: 'tesouraria',
    nome: 'Aurio Neto',
    grupo: 'Tesouraria',
    podeRegistrar: true,
    podeAutorizar: false,
    podeRessarcir: true,
    podeLerReembolsos: true,
    vinculoDeAutoridade: null,
    notaDoVinculo: null,
  },
  {
    chave: 'madrinha',
    nome: 'Marta Neto',
    grupo: 'Governança',
    podeRegistrar: false,
    podeAutorizar: true,
    podeRessarcir: false,
    podeLerReembolsos: true,
    vinculoDeAutoridade: 'MADRINHA',
    notaDoVinculo: 'Vínculo de madrinha ativo desde 12/2018.',
  },
  {
    chave: 'admin',
    nome: 'Renato Dias',
    grupo: 'Administrador',
    podeRegistrar: true,
    podeAutorizar: true,
    podeRessarcir: true,
    podeLerReembolsos: true,
    vinculoDeAutoridade: null,
    notaDoVinculo: 'Administrador sem vínculo de padrinho ou madrinha.',
  },
];

export const diasDesde = (iso: string, hoje: string): number => {
  const [a1, m1, d1] = iso.split('-').map(Number);
  const [a2, m2, d2] = hoje.split('-').map(Number);
  const de = Date.UTC(a1 ?? 1970, (m1 ?? 1) - 1, d1 ?? 1);
  const ate = Date.UTC(a2 ?? 1970, (m2 ?? 1) - 1, d2 ?? 1);
  return Math.max(0, Math.round((ate - de) / 86400000));
};
