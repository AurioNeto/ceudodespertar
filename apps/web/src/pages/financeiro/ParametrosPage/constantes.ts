import type { RegimeDaUnidade } from '@cdd/contracts';

export type Aba = 'categorias' | 'unidades' | 'casa';

export const REGIME_ROTULO: Record<RegimeDaUnidade, string> = {
  CONTRIBUICAO: 'Contribuição',
  COMERCIAL: 'Comercial',
};

export const SEM_LINHA_ESCOLHIDA = '';

export const AVISO_DE_VERSAO_DESATUALIZADA =
  'Outra pessoa alterou esta categoria enquanto você editava. Os dados foram atualizados; revise e confirme de novo.';

export const MENSAGEM_DE_FALHA_NAS_CATEGORIAS = 'Não foi possível carregar as categorias agora. Tente de novo em instantes.';

export const MENSAGEM_DE_FALHA_NAS_UNIDADES = 'Não foi possível carregar as unidades agora. Tente de novo em instantes.';
