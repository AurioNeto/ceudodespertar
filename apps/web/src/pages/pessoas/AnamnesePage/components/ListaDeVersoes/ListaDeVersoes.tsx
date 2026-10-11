import { StatusBadge } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { TOM_DA_SITUACAO } from '../../constantes';
import type { VersaoDoFormulario } from '../../mocks/anamnese';

export interface ListaDeVersoesProps {
  versoes: readonly VersaoDoFormulario[];
  selecionadaId: string;
  onSelecionar: (id: string) => void;
}

export function ListaDeVersoes({ versoes, selecionadaId, onSelecionar }: ListaDeVersoesProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {versoes.map((v) => {
        const on = v.id === selecionadaId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelecionar(v.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              padding: '11px 13px',
              border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
              background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  font: 'var(--text-body-strong)',
                  color: on ? 'var(--color-royal-deep)' : 'var(--text-primary)',
                }}
              >
                {v.rotulo}
              </span>
              <StatusBadge tone={TOM_DA_SITUACAO[v.situacao]}>
                {v.situacao[0]!.toUpperCase()}
                {v.situacao.slice(1)}
              </StatusBadge>
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {pluralizar(v.perguntas.length, 'pergunta')} · {pluralizar(v.respostas, 'resposta')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
