import type { SheetOption } from '../ds';

/**
 * Listas parametrizáveis. Na v1 elas nascem de seed (Doc 1 §4.8); aqui são
 * fixtures com os mesmos valores dos protótipos.
 */

export const opcoesDeConta: readonly SheetOption[] = [
  { value: 'cora', label: 'Cora PJ', meta: 'mais usada por você' },
  { value: 'nubank', label: 'Nubank Paty', meta: 'conta pessoal' },
  { value: 'especie', label: 'Espécie', meta: 'caixa da chácara' },
  { value: 'itau', label: 'Itaú Munay', meta: 'unidade comercial' },
];

export const opcoesDeContaDestino: readonly SheetOption[] = [
  { value: 'cora', label: 'Cora PJ', meta: 'conta principal da casa' },
  { value: 'nubank', label: 'Nubank Paty', meta: 'conta pessoal' },
  { value: 'especie', label: 'Espécie', meta: 'caixa da chácara' },
  { value: 'itau', label: 'Itaú Munay', meta: 'unidade comercial' },
];

/** O grupo é único por lançamento: onde o gasto ou a entrada aconteceu. */
export const opcoesDeGrupo: readonly SheetOption[] = [
  { value: 'Lojinha', label: 'Lojinha', meta: 'venda de itens' },
  { value: 'Dormitório', label: 'Dormitório', meta: 'hospedagem do corpo' },
  { value: 'Chácara (Infraestrutura)', label: 'Chácara (Infraestrutura)', meta: 'terreno, obras, manutenção' },
  { value: 'CDD', label: 'CDD', meta: 'casa e cerimônias' },
  { value: 'Cozinha', label: 'Cozinha', meta: 'alimentação' },
  { value: 'Secretaria', label: 'Secretaria', meta: 'administrativo' },
];

/** A categoria pode ter mais de uma por lançamento. */
export const opcoesDeCategoria: readonly SheetOption[] = [
  'Alimentação de cerimônia',
  'Manutenção',
  'Transporte',
  'Animais',
  'Insumos de feitio',
  'Administrativo',
].map((v) => ({ value: v, label: v }));

export const opcoesDePagamento: readonly SheetOption[] = [
  'Pix',
  'Débito',
  'Crédito',
  'Espécie',
  'Boleto',
  'Transferência bancária',
].map((v) => ({ value: v, label: v }));

export const SEM_CERIMONIA = 'Nenhuma — gasto da casa';

export const opcoesDeCerimonia: readonly SheetOption[] = [
  { value: '05/09 · Mãe Divina', label: '05/09 · Mãe Divina', meta: 'próxima · 78 inscritos' },
  { value: '19/09 · Trabalho de cura', label: '19/09 · Trabalho de cura', meta: 'em 22 dias' },
  { value: '22/08 · Mãe Divina', label: '22/08 · Mãe Divina', meta: 'contas fechadas em 24/08' },
  { value: SEM_CERIMONIA, label: SEM_CERIMONIA, meta: 'entra no custeio geral' },
];

export const opcoesDeCompetencia: readonly SheetOption[] = [
  { value: '08/2026', label: '08/2026', meta: 'aberta' },
  { value: '07/2026', label: '07/2026', meta: 'fechada em 05/08' },
  { value: '09/2026', label: '09/2026', meta: 'ainda não começou' },
];

/** Competências já fechadas — lançar nelas exige reabertura por administrador. */
export const competenciasFechadas: readonly string[] = ['07/2026'];

export const opcoesDePessoa: readonly SheetOption[] = ['Lucia Prado', 'Marcia Zubek', 'Aurio Neto', 'Wilson Prado'].map(
  (v) => ({ value: v, label: v }),
);

export const opcoesDeUnidade: readonly SheetOption[] = [
  { value: 'CDD', label: 'CDD', meta: 'Céu do Despertar' },
  { value: 'Munay', label: 'Munay', meta: 'unidade comercial' },
];

export const rotuloDaOpcao = (opcoes: readonly SheetOption[], value: string): string =>
  opcoes.find((o) => o.value === value)?.label ?? value;

export const metaDaOpcao = (opcoes: readonly SheetOption[], value: string): string =>
  opcoes.find((o) => o.value === value)?.meta ?? '';
