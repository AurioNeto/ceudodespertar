import { BotaoDeIcone, Icon } from '@/ds';
import { useCarrossel } from '@/pages/hooks/useCarrossel';
import { ESTILO_DA_SETA, PAINEIS } from './constantes';
import { GraficoResultado } from './components/GraficoResultado';
import { ResumoDaProxima } from './components/ResumoDaProxima';
import { ResumoDaUltima } from './components/ResumoDaUltima';

export function CarrosselDeCerimonias() {
  const { atual: slide, irPara } = useCarrossel(PAINEIS.length);

  return (
    <div
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'var(--glass)',
        WebkitBackdropFilter: 'var(--glass)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--leaf-lg)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px 14px 20px',
          borderBottom: 'var(--border-hairline)',
        }}
      >
        <Icon name="calendar-days" size={18} color="var(--color-royal)" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PAINEIS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => irPara(i)}
              aria-pressed={i === slide}
              style={{
                font: i === slide ? 'var(--text-body-strong)' : 'var(--text-body)',
                padding: '10px 14px',
                minHeight: 44,
                borderRadius: 'var(--leaf-sm)',
                cursor: 'pointer',
                border: `1px solid ${i === slide ? 'var(--color-royal-border)' : 'transparent'}`,
                background: i === slide ? 'var(--color-royal-soft)' : 'transparent',
                color: i === slide ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{ font: 'var(--text-code)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-meta)' }}
          >
            {slide + 1} / {PAINEIS.length}
          </span>
          <BotaoDeIcone icone="arrow-left" aria-label="Painel anterior" style={ESTILO_DA_SETA} onClick={() => irPara(slide - 1)} />
          <BotaoDeIcone icone="arrow-right" aria-label="Próximo painel" style={ESTILO_DA_SETA} onClick={() => irPara(slide + 1)} />
        </div>
      </div>

      {slide === 0 ? <ResumoDaProxima /> : null}
      {slide === 1 ? <GraficoResultado /> : null}
      {slide === 2 ? <ResumoDaUltima /> : null}
    </div>
  );
}
