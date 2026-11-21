import type { BadgeTone } from '@/ds';
import type { SituacaoDeAcesso } from '../../mocks/pessoas';

export const ACESSO: Record<SituacaoDeAcesso, { label: string; tone: BadgeTone }> = {
  ativo: { label: 'Acesso ativo', tone: 'confirmed' },
  convite: { label: 'Convite pendente', tone: 'suggest' },
  suspenso: { label: 'Suspenso', tone: 'pending' },
};
