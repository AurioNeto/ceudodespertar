import { Button, Cartao, Icon, StatusBadge, type Density } from '@/ds';
import type { PessoaDoDiretorio } from '../../mocks/inscricao';

export interface PessoaEscolhidaProps {
  pessoa: PessoaDoDiretorio;
  densidade: Density;
  onTrocar: () => void;
}

export function PessoaEscolhida({ pessoa, densidade, onTrocar }: PessoaEscolhidaProps) {
  const campo = densidade === 'field';
  return (
    <Cartao campo={campo} style={{ gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 11px' }}>
        <Icon name="user-round" size={18} color="var(--color-ink-brand)" />
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{pessoa.nome}</span>
        {pessoa.menorDeIdade ? <StatusBadge tone="suggest">Menor de idade</StatusBadge> : null}
        <span style={{ flex: 1 }} />
        <Button variant="quiet" iconName="arrow-left" onClick={onTrocar}>
          Trocar
        </Button>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {pessoa.vinculo} · {pessoa.cidade} · nasceu em {pessoa.nascimento}
      </span>
    </Cartao>
  );
}
