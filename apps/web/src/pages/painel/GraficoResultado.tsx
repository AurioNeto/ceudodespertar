import { cerimoniasPassadas } from '../../mocks/cerimonias';
import { formatarDiaMes, formatarValor } from '../../lib/formato';

const TOPO = 18;
const ALTURA = 132;
const MAX = 15500;
const MIN = -3000;

const y = (v: number) => +(TOPO + ((MAX - v) / (MAX - MIN)) * ALTURA).toFixed(1);
const x = (i: number) => +(56 + i * 106).toFixed(1);

/** Resultado por cerimônia: linha com área suave e o déficit cruzando o zero. */
export function GraficoResultado() {
  const pontos = cerimoniasPassadas.map((c, i) => {
    const valor = c.resultado / 100;
    return {
      x: x(i),
      y: y(valor),
      data: formatarDiaMes(c.data),
      nome: c.nome,
      rotulo: `${valor < 0 ? '− ' : '+ '}${formatarValor(Math.abs(valor) / 1000).replace(',00', '')} mil`,
      cor: valor < 0 ? 'var(--color-attention)' : 'var(--color-royal)',
    };
  });

  const zeroY = y(0);
  const linha = pontos.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `M ${x(0)},${zeroY} L ${pontos.map((p) => `${p.x},${p.y}`).join(' L ')} L ${x(pontos.length - 1)},${zeroY} Z`;

  return (
    <div style={{ padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}>
          Resultado por cerimônia
        </h2>
        <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          contribuições menos custos · seis últimas
        </span>
      </div>

      <div style={{ marginTop: 12 }}>
        <svg
          viewBox="0 0 620 172"
          width="100%"
          height={196}
          role="img"
          aria-label="Resultado por cerimônia nas seis últimas cerimônias"
        >
          <path d={area} fill="var(--color-royal-soft)" />
          <line x1={16} x2={612} y1={zeroY} y2={zeroY} stroke="var(--border-section)" strokeWidth={1} />
          <text x={16} y={zeroY - 5} fill="var(--text-secondary)" fontSize={12} fontFamily="var(--font-data)">
            0
          </text>
          <polyline
            points={linha}
            fill="none"
            stroke="var(--color-royal)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pontos.map((p) => (
            <circle key={p.data} cx={p.x} cy={p.y} r={4.5} fill="var(--bg-card)" stroke={p.cor} strokeWidth={2.5} />
          ))}
        </svg>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 8, marginTop: 2 }}>
        {pontos.map((p) => (
          <div
            key={p.data}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
            }}
          >
            <span
              style={{
                font: 'var(--text-amount)',
                letterSpacing: 'var(--tracking-amount)',
                fontVariantNumeric: 'tabular-nums',
                color: p.cor,
              }}
            >
              {p.rotulo}
            </span>
            <span style={{ font: 'var(--text-code)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-meta)' }}>
              {p.data}
            </span>
            <span
              style={{
                font: 'var(--text-small)',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {p.nome}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
