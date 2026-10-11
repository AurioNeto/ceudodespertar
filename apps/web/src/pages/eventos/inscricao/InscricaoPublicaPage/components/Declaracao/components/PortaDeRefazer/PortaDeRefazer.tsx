import { Button, Cartao, Icon, type Density } from '@/ds';

export interface PortaDeRefazerProps {
  densidade: Density;
  onRefazer: () => void;
}

/**
 * A saída de quem **não pode** declarar que segue verdadeiro.
 *
 * Sem ela a declaração é uma armadilha: quem mudou de condição fica entre
 * afirmar algo falso e abandonar a inscrição, e as duas saídas são piores para
 * a casa do que a pergunta a mais. Fica ao lado da declaração, não escondida
 * num "editar" — é ali que a pessoa descobre que precisa dela.
 */
export function PortaDeRefazer({ densidade, onRefazer }: PortaDeRefazerProps) {
  const campo = densidade === 'field';
  return (
    <Cartao campo={campo} style={{ gap: 9 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="rotate-ccw" size={17} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
            Mudou alguma coisa na sua saúde?
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Se você não pode confirmar o que está acima, não marque. Responder de novo é melhor para todo mundo — e
            não tem problema nenhum.
          </span>
        </div>
      </div>
      <Button variant="quiet" fullWidth density={campo ? 'field' : 'office'} iconName="rotate-ccw" onClick={onRefazer}>
        Quero responder de novo
      </Button>
    </Cartao>
  );
}
