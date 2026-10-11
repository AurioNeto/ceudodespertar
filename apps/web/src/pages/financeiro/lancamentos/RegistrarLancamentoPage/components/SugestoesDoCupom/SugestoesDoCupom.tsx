import { Button, Icon, SuggestionChip, type Density } from '@/ds';
import type { FormularioDeLancamento } from '../../tipos';

export interface SugestoesDoCupomProps {
  sugestoes: FormularioDeLancamento['sugestoesPendentes'];
  densidade: Density;
  onAceitar: FormularioDeLancamento['aceitarSugestao'];
  onDescartar: FormularioDeLancamento['descartarSugestao'];
  onAceitarTodas: () => void;
}

export function SugestoesDoCupom({
  sugestoes,
  densidade,
  onAceitar,
  onDescartar,
  onAceitarTodas,
}: SugestoesDoCupomProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: campo ? 'transparent' : 'var(--color-suggest-soft)',
        border: campo ? 0 : '1px dashed var(--color-suggest-border)',
        borderRadius: 'var(--radius-lg)',
        padding: campo ? 0 : 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {campo ? null : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name="sparkles" size={17} color="var(--color-suggest)" />
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--color-suggest)' }}>
              A IA leu o cupom
            </span>
          </div>
          <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Nada foi preenchido sozinho. Aceite item por item — o que você aceitar fica com a marca de sugestão no
            histórico.
          </p>
        </>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        {sugestoes.map((s) => (
          <SuggestionChip
            key={s.chave}
            density={densidade}
            onAccept={() => onAceitar(s.chave)}
            onDismiss={() => onDescartar(s.chave)}
          >
            {s.texto}
          </SuggestionChip>
        ))}
      </div>
      {campo ? null : (
        <Button variant="suggest" iconName="check-check" onClick={onAceitarTodas} fullWidth>
          Aceitar as {sugestoes.length === 1 ? 'restantes' : `${sugestoes.length}`}
        </Button>
      )}
    </div>
  );
}
