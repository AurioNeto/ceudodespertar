import type { RegistroDeAuditoria } from '@cdd/contracts';
import { Icon, StatusBadge, type Density } from '@/ds';
import { EXIGE_REGISTRO_EXTRA, FEICAO } from '../../constantes';
import { hora } from '../../../../utils/instante';

export interface LinhaDaTrilhaProps {
  registro: RegistroDeAuditoria;
  densidade: Density;
}

export function LinhaDaTrilha({ registro: r, densidade }: LinhaDaTrilhaProps) {
  const campo = densidade === 'field';
  const feicao = FEICAO[r.operacao];
  const exigencia = EXIGE_REGISTRO_EXTRA[r.operacao];

  const cor =
    feicao.tom === 'atencao'
      ? 'var(--color-attention)'
      : feicao.tom === 'sensivel'
        ? 'var(--color-suggest)'
        : 'var(--color-royal)';

  const fundo =
    feicao.tom === 'atencao'
      ? 'var(--color-attention-soft)'
      : feicao.tom === 'sensivel'
        ? 'var(--color-suggest-soft)'
        : 'var(--bg-sunken)';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: feicao.tom === 'neutro' ? undefined : `var(--edge-state) solid ${cor}`,
        borderRadius: feicao.tom === 'neutro' ? 'var(--radius)' : '0 var(--radius) var(--radius) 0',
        padding: campo ? '12px 14px' : '13px 16px',
        display: 'flex',
        gap: campo ? 11 : 13,
        minWidth: 0,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          background: fundo,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={feicao.icone} size={16} color={cor} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 8px' }}>
          <span data-numeric style={{ font: 'var(--text-code)', color: 'var(--text-meta)' }}>
            {hora(r.em)}
          </span>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{r.autorNome}</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>· {r.autorGrupo}</span>
        </div>

        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          {feicao.verbo} <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.alvo}</b>
        </span>

        {r.detalhes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 1 }}>
            {r.detalhes.map((d) => (
              <span key={d.rotulo} style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-field-label)' }}>{d.rotulo}: </span>
                {d.anterior ? (
                  <>
                    <s style={{ color: 'var(--text-meta)' }}>{d.anterior}</s>
                    <span style={{ color: 'var(--text-meta)' }}> → </span>
                    <b style={{ fontWeight: 500 }}>{d.valor}</b>
                  </>
                ) : (
                  d.valor
                )}
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 8px', alignItems: 'center', marginTop: 2 }}>
          <StatusBadge tone={feicao.tom === 'atencao' ? 'attention' : feicao.tom === 'sensivel' ? 'suggest' : 'neutral'}>
            {feicao.rotulo}
          </StatusBadge>
          {r.referencia ? <code style={{ font: 'var(--text-code)' }}>{r.referencia}</code> : null}
          {exigencia && r.detalhes.length === 0 ? (
            <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
              registro extra ausente — o domínio exige {exigencia}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
