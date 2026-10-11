import { Icon } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';

export interface GuardadoProps {
  quantas: number;
}

export function Guardado({ quantas }: GuardadoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon
        name={quantas > 0 ? 'circle-check' : 'smartphone'}
        size={15}
        color={quantas > 0 ? 'var(--color-confirmed)' : 'var(--text-meta)'}
      />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {quantas > 0
          ? `${pluralizar(quantas, 'resposta guardada', 'respostas guardadas')}. Pode fechar e voltar depois — nada se perde.`
          : 'Pode fechar e voltar depois. O que você responder fica guardado neste aparelho.'}
      </span>
    </div>
  );
}
