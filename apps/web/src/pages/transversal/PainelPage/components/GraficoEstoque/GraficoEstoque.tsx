import { Icon } from '@/ds';
import { conferidoEm, feitioRecente, lotesDeDaime } from './mocks/estoque';
import { formatarDiaMes, formatarLitros } from '@/pages/utils/formato';
import { BASE, ESCALA_Y, LARGURA_BARRA, PASSO_X } from './constantes';
import { derivar } from './utils/derivarEstoque';
import { EixoDeCerimonias } from '../EixoDeCerimonias';
import { IndicadoresDoEstoque } from './components/IndicadoresDoEstoque';
import { LegendaDoEstoque } from './components/LegendaDoEstoque';

export function GraficoEstoque() {
  const { solidos, consumos, rotulos, totalAtual, media, cobertura, legenda } = derivar();
  // A marca do feitio cai no vão antes da cerimônia em que o lote entrou.
  const xFeitio = 55 + feitioRecente.apos * PASSO_X - (PASSO_X - LARGURA_BARRA) / 2;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--leaf-lg)',
        padding: '16px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Icon name="flask-conical" size={18} color="var(--color-royal)" />
        <h2 style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}>
          Ayahuasca em estoque
        </h2>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          estoque após cada cerimônia, por lote · litros
        </span>
        <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-link)' }}>
          conferido {formatarDiaMes(conferidoEm)}
        </span>
      </div>

      <IndicadoresDoEstoque totalAtual={totalAtual} media={media} cobertura={cobertura} />

      <svg
        viewBox="0 0 620 240"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Estoque de ayahuasca por lote após cada cerimônia, com a parcela consumida em hachura"
      >
        <defs>
          {lotesDeDaime.map((lote, j) => (
            <pattern
              key={lote.nome}
              id={`hachura-${j}`}
              width={7}
              height={7}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width={7} height={7} fill="var(--bg-card)" />
              <line x1={0} y1={0} x2={0} y2={7} stroke={lote.cor} strokeWidth={2.6} />
            </pattern>
          ))}
        </defs>

        {ESCALA_Y.map((linha) => (
          <g key={linha.rotulo}>
            <line
              x1={34}
              x2={612}
              y1={linha.y}
              y2={linha.y}
              stroke="var(--border-subtle)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <text x={0} y={linha.y + 4} fill="var(--text-meta)" fontSize={13} fontFamily="var(--font-data)">
              {linha.rotulo}
            </text>
          </g>
        ))}
        <line x1={34} x2={612} y1={BASE} y2={BASE} stroke="var(--border-section)" strokeWidth={1} />

        <line
          x1={xFeitio}
          x2={xFeitio}
          y1={26}
          y2={BASE}
          stroke="var(--text-secondary)"
          strokeWidth={1}
          strokeDasharray="5 4"
        />
        <text x={xFeitio + 6} y={18} fill="var(--text-secondary)" fontSize={13} fontFamily="var(--font-data)">
          feitio {feitioRecente.data} · + {formatarLitros(feitioRecente.litros)} L
        </text>

        {solidos.map((r) => (
          <rect key={`s-${r.chave}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
        ))}
        {consumos.map((r) => (
          <rect
            key={`c-${r.chave}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={r.fill}
            stroke={r.stroke}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}

        {rotulos.map((r) => (
          <g key={`r-${r.chave}`}>
            <text
              x={r.cx}
              y={r.consumoY}
              textAnchor="middle"
              fill="var(--text-secondary)"
              fontSize={13}
              fontFamily="var(--font-data)"
            >
              {r.consumo}
            </text>
            <text
              x={r.cx}
              y={r.totalY}
              textAnchor="middle"
              fill="var(--color-ink-inverse)"
              fontSize={13}
              fontWeight={600}
              fontFamily="var(--font-data)"
            >
              {r.total}
            </text>
          </g>
        ))}
      </svg>

      <EixoDeCerimonias cerimonias={rotulos} corDaData="var(--text-primary)" recuo="5.5%" />

      <LegendaDoEstoque legenda={legenda} />
    </div>
  );
}
