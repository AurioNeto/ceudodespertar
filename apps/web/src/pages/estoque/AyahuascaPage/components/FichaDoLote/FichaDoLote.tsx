import { createPortal } from 'react-dom';
import { BotaoDeIcone, Button, Leitura, Rotulo, StatusBadge, type Density, vidroLeve } from '@/ds';
import { rotuloDoMovimento, SITUACAO, valorTabular } from '../../constantes';
import type { LoteDeDaime, MovimentoDeDaime } from '../../mocks/ayahuasca';
import { corDoMovimento } from '../../utils/corDoMovimento';
import { litros } from '../../utils/litros';

export interface FichaDoLoteProps {
  lote: LoteDeDaime;
  movimentos: readonly MovimentoDeDaime[];
  densidade: Density;
  onFechar: () => void;
  onQuarentena: () => void;
}

export function FichaDoLote({ lote, movimentos, densidade, onFechar, onQuarentena }: FichaDoLoteProps) {
  const campo = densidade === 'field';
  return createPortal(
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-scrim)',
        display: 'flex',
        alignItems: campo ? 'flex-end' : 'stretch',
        justifyContent: 'flex-end',
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: campo ? '100%' : 'min(460px, 100%)',
          maxHeight: campo ? '86%' : '100%',
          overflow: 'auto',
          background: 'var(--bg-app)',
          borderLeft: campo ? 0 : '1px solid var(--color-line-strong)',
          borderRadius: campo ? 'var(--leaf-xl-espelhada)' : 0,
          boxShadow: 'var(--shadow-sheet)',
          padding: '18px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)', flex: 1 }}>{lote.codigo}</span>
          <StatusBadge tone={SITUACAO[lote.situacao].tone}>{SITUACAO[lote.situacao].label}</StatusBadge>
          <BotaoDeIcone icone="x" tamanhoDoIcone={20} aria-label="Fechar ficha" onClick={onFechar} />
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            ...vidroLeve,
            border: 'var(--border-hairline)',
            borderRadius: 'var(--leaf-lg)',
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: 12,
          }}
        >
          <Leitura rotulo="Restante" valor={litros(lote.restante)} />
          <Leitura rotulo="Entrada" valor={litros(lote.litros)} />
          <Leitura rotulo="Força" valor={lote.forca} />
          <Leitura rotulo="Origem" valor={lote.origem} />
          <Leitura rotulo="Local" valor={lote.local} />
          <Leitura rotulo="Guardião" valor={lote.guardiao} />
          <Leitura rotulo="Envase" valor={lote.garrafas} />
          <Leitura rotulo="Análise" valor={lote.analise} />
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            ...vidroLeve,
            border: 'var(--border-hairline)',
            borderRadius: 'var(--leaf-lg)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <Rotulo>Movimentos deste lote</Rotulo>
          {movimentos.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span
                style={{ font: 'var(--text-code)', color: 'var(--text-meta)', fontVariantNumeric: 'tabular-nums' }}
              >
                {m.data}
              </span>
              <span style={{ flex: 1, minWidth: 0, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {rotuloDoMovimento[m.tipo]} · {m.destino}
              </span>
              <span style={{ ...valorTabular, color: corDoMovimento(m.tipo) }}>
                {m.tipo === 'entrada' ? '+ ' : '− '}
                {litros(m.litros)}
              </span>
            </div>
          ))}
        </div>

        <Button variant="quiet" iconName="shield-alert" onClick={onQuarentena} style={{ alignSelf: 'flex-start' }}>
          {lote.situacao === 'quarentena' ? 'Tirar da quarentena' : 'Pôr em quarentena'}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
