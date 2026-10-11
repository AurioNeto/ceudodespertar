import { Cartao, Icon, Rotulo, StatusBadge, type Density } from '@/ds';
import { formatarBRL, formatarLitros, pluralizar } from '@/pages/utils/formato';
import type { FeitioNaTela } from '../../mocks/feitio';
import { custoDaMateriaPrima, custoDosLancamentos } from '../../utils/custoDoFeitio';
import { Secao } from './components/Secao';

export interface FeitioEmCursoProps {
  feitio: FeitioNaTela;
  densidade: Density;
  concluido: boolean;
  pendentes: number;
  confirmado: number;
  total: number;
}

export function FeitioEmCurso({
  feitio: f,
  densidade,
  concluido,
  pendentes,
  confirmado,
  total,
}: FeitioEmCursoProps) {
  const campo = densidade === 'field';
  const totalMateria = custoDaMateriaPrima(f);
  const totalCustos = custoDosLancamentos(f);

  return (
    <Cartao campo={campo} style={{ gap: 15 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{f.nome}</span>
        <StatusBadge tone={concluido ? 'confirmed' : 'royal'}>
          {concluido ? 'Concluído' : 'Em andamento'}
        </StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {f.dataInicio}
          {f.dataFim ? ` a ${f.dataFim}` : ' · ainda na panela'} · {f.local}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 8px', alignItems: 'center' }}>
        <Rotulo>Quem está fazendo</Rotulo>
        {f.participantes.map((p) => (
          <span
            key={p}
            style={{
              font: 'var(--text-small)',
              background: 'var(--bg-sunken)',
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-pill)',
              padding: '2px 10px',
              color: 'var(--text-secondary)',
            }}
          >
            {p}
          </span>
        ))}
      </div>

      {f.loteProduzido ? (
        <div
          style={{
            background: 'var(--color-confirmed-soft)',
            border: '1px solid var(--color-confirmed-border)',
            borderRadius: 'var(--radius)',
            padding: '12px 15px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 12px',
            alignItems: 'baseline',
          }}
        >
          <Icon name="circle-check" size={17} color="var(--color-confirmed)" />
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{f.loteProduzido}</span>
          <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
            {formatarLitros(f.litrosProduzidos ?? 0)} L
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{f.forca}</span>
          <span style={{ flex: 1 }} />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            Um feitio gera exatamente um lote.
          </span>
        </div>
      ) : null}

      <Secao
        titulo="Matéria-prima"
        total={totalMateria}
        nota="Saída de estoque, no mesmo evento — a folha que entrou na panela não está mais no galpão."
      >
        {f.materiaPrima.map((m) => (
          <div key={m.itemId} style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 110 }}>
              {m.nome}
            </span>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', minWidth: 70 }}>
              {m.quantidade} {m.unidade}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 170 }}>
              {m.origem}
            </span>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>
              {formatarBRL(m.custo)}
            </span>
          </div>
        ))}
      </Secao>

      <Secao
        titulo="O resto do custo"
        total={totalCustos}
        nota="Lançamentos vinculados a este evento. Eles existem no financeiro de qualquer jeito; o que muda é conseguir somá-los."
      >
        {f.custos.map((c) => (
          <div key={c.lancamentoId} style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', alignItems: 'baseline' }}>
            <Icon
              name={c.confirmado ? 'circle-check' : 'circle-alert'}
              size={13}
              color={c.confirmado ? 'var(--color-confirmed)' : 'var(--color-pending)'}
            />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
              {c.descricao}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 140 }}>
              {c.categoria}
            </span>
            <code style={{ font: 'var(--text-code)' }}>{c.lancamentoId}</code>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>
              {formatarBRL(c.valor)}
            </span>
          </div>
        ))}
      </Secao>

      {pendentes > 0 ? (
        <div
          style={{
            background: 'var(--color-pending-soft)',
            border: '1px solid var(--color-pending-border)',
            borderRadius: 'var(--radius)',
            padding: '12px 15px',
            display: 'flex',
            gap: 11,
            alignItems: 'flex-start',
          }}
        >
          <Icon name="circle-alert" size={17} color="var(--color-pending)" style={{ marginTop: 2 }} />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
            {pluralizar(pendentes, 'lançamento ainda na fila de verificação', 'lançamentos ainda na fila de verificação')}
            . O custo por litro que sair daqui é <b>parcial</b>: {formatarBRL(confirmado)} confirmados de{' '}
            {formatarBRL(total)} registrados. Conferir a fila antes de concluir fecha a conta de verdade.
          </span>
        </div>
      ) : null}
    </Cartao>
  );
}
