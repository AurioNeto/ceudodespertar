import type { SituacaoUsuario } from '@cdd/contracts';
import type { BadgeTone } from '../../ds';

export const SITUACAO_DE_USUARIO: Record<SituacaoUsuario, { rotulo: string; tom: BadgeTone }> = {
  ATIVO: { rotulo: 'Ativo', tom: 'confirmed' },
  CONVITE_PENDENTE: { rotulo: 'Convite pendente', tom: 'suggest' },
  SUSPENSO: { rotulo: 'Suspenso', tom: 'pending' },
  REVOGADO: { rotulo: 'Revogado', tom: 'neutral' },
};
