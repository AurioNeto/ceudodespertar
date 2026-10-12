import { BotaoDeIcone } from '@/ds';

export interface SetaRedondaProps {
  rotulo: string;
  onClick: () => void;
}

export function SetaRedonda({ rotulo, onClick }: SetaRedondaProps) {
  return (
    <BotaoDeIcone
      icone={rotulo === 'anterior' ? 'arrow-left' : 'arrow-right'}
      aria-label={rotulo}
      onClick={onClick}
      medida={44}
      style={{
        flex: '0 0 auto',
        border: '1px solid var(--color-line-strong)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--leaf-seal)',
        color: 'var(--text-primary)',
      }}
    />
  );
}
