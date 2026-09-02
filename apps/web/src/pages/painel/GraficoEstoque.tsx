import { Icon } from '../../ds';
import { cerimoniasPassadas } from '../../mocks/cerimonias';
import { conferidoEm, feitioRecente, lotesDeDaime } from '../../mocks/estoque';
import { formatarDiaMes, formatarLitros } from '../../lib/formato';

const BASE = 226;
const TOPO_PLOT = 46;
const ESCALA = (BASE - TOPO_PLOT) / 120;
const LARGURA_BARRA = 54;
const PASSO_X = 96;

interface Retangulo {
  chave: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
}

interface RotuloDaBarra {
  chave: string;
  cx: number;
  data: string;
  nome: string;
  total: string;
  totalY: number;
  consumo: string;
  consumoY: number;
}

/**
 * A barra sólida é o estoque após a cerimônia, empilhado por lote; a parte
 * hachurada acima é o que aquela cerimônia consumiu de cada lote. Os números
 * de estoque são derivados dos consumos, não valores soltos.
 */
function derivar() {
  const saldo = lotesDeDaime.map((l) => l.saldoInicial);
  const solidos: Retangulo[] = [];
  const consumos: Retangulo[] = [];
  const rotulos: RotuloDaBarra[] = [];
  let consumoTotal = 0;

  cerimoniasPassadas.forEach((c, i) => {
    c.entrada?.forEach((litros, j) => {
      saldo[j] = (saldo[j] ?? 0) + litros;
    });

    const bx = 55 + i * PASSO_X;
    const gasto = c.consumo.reduce((a, b) => a + b, 0);
    consumoTotal += gasto;

    let empilhado = 0;
    lotesDeDaime.forEach((lote, j) => {
      const restante = +((saldo[j] ?? 0) - (c.consumo[j] ?? 0)).toFixed(1);
      if (restante > 0.05) {
        solidos.push({
          chave: `${c.data}-${j}`,
          x: bx,
          w: LARGURA_BARRA,
          y: +(BASE - (empilhado + restante) * ESCALA).toFixed(1),
          h: +(restante * ESCALA).toFixed(1),
          fill: lote.cor,
        });
      }
      empilhado += Math.max(restante, 0);
    });

    const topoSolido = empilhado;
    let topoConsumo = empilhado;
    lotesDeDaime.forEach((lote, j) => {
      const gastoDoLote = c.consumo[j] ?? 0;
      if (gastoDoLote > 0.05) {
        consumos.push({
          chave: `${c.data}-${j}`,
          x: bx,
          w: LARGURA_BARRA,
          y: +(BASE - (topoConsumo + gastoDoLote) * ESCALA).toFixed(1),
          h: +(gastoDoLote * ESCALA).toFixed(1),
          fill: `url(#hachura-${j})`,
          stroke: lote.cor,
        });
        topoConsumo += gastoDoLote;
      }
    });

    rotulos.push({
      chave: c.data,
      cx: bx + LARGURA_BARRA / 2,
      data: formatarDiaMes(c.data),
      nome: c.nome,
      total: formatarLitros(topoSolido),
      totalY: +(BASE - topoSolido * ESCALA + 18).toFixed(1),
      consumo: `− ${formatarLitros(gasto)}`,
      consumoY: +(BASE - topoConsumo * ESCALA - 7).toFixed(1),
    });

    c.consumo.forEach((gastoDoLote, j) => {
      saldo[j] = +((saldo[j] ?? 0) - gastoDoLote).toFixed(1);
    });
  });

  const totalAtual = saldo.reduce((a, b) => a + b, 0);
  const media = consumoTotal / cerimoniasPassadas.length;

  return {
    solidos,
    consumos,
    rotulos,
    totalAtual,
    media,
    cobertura: Math.floor(totalAtual / media),
    legenda: lotesDeDaime.map((lote, j) => ({
      nome: lote.nome,
      cor: lote.cor,
      saldo: (saldo[j] ?? 0) > 0.05 ? `${formatarLitros(saldo[j] ?? 0)} L` : 'esgotado',
    })),
  };
}

const ESCALA_Y = [
  { y: 226, rotulo: '0' },
  { y: 181, rotulo: '30' },
  { y: 136, rotulo: '60' },
  { y: 91, rotulo: '90' },
  { y: 46, rotulo: '120' },
] as const;

export function GraficoEstoque() {
  const { solidos, consumos, rotulos, totalAtual, media, cobertura, legenda } = derivar();
  // A marca do feitio cai no vão antes da cerimônia em que o lote entrou.
  const xFeitio = 55 + feitioRecente.apos * PASSO_X - (PASSO_X - LARGURA_BARRA) / 2;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'baseline' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              font: 'var(--text-amount-lg)',
              letterSpacing: 'var(--tracking-amount)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--color-royal-deep)',
            }}
          >
            {formatarLitros(totalAtual)}
          </span>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>litros hoje</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              font: 'var(--text-amount)',
              letterSpacing: 'var(--tracking-amount)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)',
            }}
          >
            {formatarLitros(media)} L
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            consumo médio por cerimônia
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              font: 'var(--text-amount)',
              letterSpacing: 'var(--tracking-amount)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)',
            }}
          >
            {cobertura}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            cerimônias de folga no ritmo atual
          </span>
        </div>
      </div>

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
          stroke="var(--color-pending)"
          strokeWidth={1}
          strokeDasharray="5 4"
        />
        <text x={xFeitio + 6} y={18} fill="var(--color-pending)" fontSize={13} fontFamily="var(--font-data)">
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

      <div style={{ display: 'grid', gridTemplateColumns: '5.5% repeat(6,minmax(0,1fr))', marginTop: 2 }}>
        <div />
        {rotulos.map((r) => (
          <div
            key={r.chave}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
            }}
          >
            <span style={{ font: 'var(--text-code)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
              {r.data}
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
              {r.nome}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 18,
          paddingTop: 12,
          borderTop: 'var(--border-hairline)',
        }}
      >
        {legenda.map((l) => (
          <div key={l.nome} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 14, height: 14, borderRadius: 2, flex: '0 0 auto', background: l.cor }} />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{l.nome}</span>
            <span
              style={{
                font: 'var(--text-amount)',
                letterSpacing: 'var(--tracking-amount)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-secondary)',
              }}
            >
              {l.saldo}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 'auto' }}>
          <svg width={16} height={16} aria-hidden="true">
            <rect
              x={0.5}
              y={0.5}
              width={15}
              height={15}
              fill="url(#hachura-1)"
              stroke="var(--color-royal)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </svg>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            hachura: consumido na própria cerimônia
          </span>
        </div>
      </div>
    </div>
  );
}
