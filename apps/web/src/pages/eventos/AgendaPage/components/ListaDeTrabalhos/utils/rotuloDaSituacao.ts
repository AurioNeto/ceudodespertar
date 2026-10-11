import type { SituacaoDoTrabalho } from '../../../tipos';

export const rotuloDaSituacao = (s: SituacaoDoTrabalho) => s[0]!.toUpperCase() + s.slice(1);
