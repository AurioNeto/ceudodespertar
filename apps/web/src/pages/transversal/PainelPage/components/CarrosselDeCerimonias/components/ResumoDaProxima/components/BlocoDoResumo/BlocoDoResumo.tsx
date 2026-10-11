import { Icon, type IconName } from '@/ds';
import { numeroGrande, rotuloLabel } from '../../../../../../constantes';

export function BlocoDoResumo({
  icone,
  corDoIcone,
  rotulo,
  numero,
  corDoNumero,
  detalhe,
  destacado = false,
}: {
  icone: IconName;
  corDoIcone: string;
  rotulo: string;
  numero: number;
  corDoNumero: string;
  detalhe: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '12px 14px',
        background: destacado ? 'var(--bg-brand)' : 'var(--bg-card)',
        border: destacado ? '1px solid var(--border-brand)' : 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <span style={{ ...rotuloLabel, display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name={icone} size={15} color={corDoIcone} />
        {rotulo}
      </span>
      <span style={{ ...numeroGrande, color: corDoNumero }}>{numero}</span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{detalhe}</span>
    </div>
  );
}
