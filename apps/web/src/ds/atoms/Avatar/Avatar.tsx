import { iniciais } from '@/lib/formato';
import { vidroLeve } from '../../fundacao/estilos';

export function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 34,
        height: 34,
        flex: '0 0 auto',
        borderRadius: 'var(--leaf-seal)',
        background: 'var(--color-royal-soft)',
        ...vidroLeve,
        color: 'var(--color-royal-deep)',
        display: 'grid',
        placeItems: 'center',
        font: '700 12px var(--font-data)',
      }}
    >
      {iniciais(nome)}
    </span>
  );
}
