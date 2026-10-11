import { AttachmentCapture, type Density } from '@/ds';
import { rotuloLabel } from '../../constantes';
import { TEXTOS_DO_ANEXO } from './constantes';

export interface ComprovanteDoLancamentoProps {
  anexo: string | null;
  densidade: Density;
  onAlterarAnexo: (anexo: string | null) => void;
}

export function ComprovanteDoLancamento({ anexo, densidade, onAlterarAnexo }: ComprovanteDoLancamentoProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: campo ? 0 : 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {campo ? null : <div style={rotuloLabel}>Comprovante</div>}
      {anexo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {campo ? null : (
            <div
              style={{
                height: 210,
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: 'var(--bg-sunken)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...rotuloLabel,
              }}
            >
              foto do cupom
            </div>
          )}
          <AttachmentCapture
            {...TEXTOS_DO_ANEXO}
            density={densidade}
            filename={anexo}
            onRemove={() => onAlterarAnexo(null)}
          />
        </div>
      ) : (
        <AttachmentCapture
          {...TEXTOS_DO_ANEXO}
          density={densidade}
          onCapture={() => onAlterarAnexo('IMG_2481.jpg')}
        />
      )}
    </div>
  );
}
