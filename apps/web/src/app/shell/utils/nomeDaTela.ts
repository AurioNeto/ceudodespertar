import type { NavEntry } from '@/ds';
import type { RotaId } from '@/app/rotas';

export function nomeDaTela(nav: readonly NavEntry[], ativo: RotaId): string {
  const rotuloDaTela = nav.find((entrada) => 'id' in entrada && entrada.id === ativo);
  return rotuloDaTela && 'label' in rotuloDaTela ? rotuloDaTela.label : ativo;
}
