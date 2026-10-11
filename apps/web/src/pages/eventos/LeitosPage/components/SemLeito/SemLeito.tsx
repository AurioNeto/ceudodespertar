import { Cartao, Icon, Rotulo, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import type { Pendencia } from '../../tipos';
import { rotuloDaNoite } from '../../utils/noites';

export interface SemLeitoProps {
  lista: readonly Pendencia[];
  densidade: Density;
}

export function SemLeito({ lista, densidade }: SemLeitoProps) {
  const campo = densidade === 'field';
  if (lista.length === 0) {
    return (
      <Cartao campo={campo} style={{ gap: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="circle-check" size={19} color="var(--color-confirmed)" />
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Todo mundo com leito</span>
        </div>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Ninguém que pediu hospedagem ficou de fora. Inscrição com leito pendente não confirma.
        </span>
      </Cartao>
    );
  }

  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
        <Rotulo>Ainda sem leito</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--color-pending)' }}>
          {pluralizar(lista.length, 'pessoa')} — e inscrição com leito pendente não confirma
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lista.map(({ hospede: h, faltam }, i) => (
          <div
            key={h.inscricaoId}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '9px 0',
              borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
              {h.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 170 }}>
              {h.hospedagem === 'QUARTO' ? 'quarto' : 'beliche'} · falta{faltam.length === 1 ? '' : 'm'}{' '}
              {faltam.map((n) => rotuloDaNoite(n)).join(' e ')}
            </span>
            {h.observacao ? (
              <span style={{ font: 'var(--text-small)', color: 'var(--color-suggest)' }}>{h.observacao}</span>
            ) : null}
          </div>
        ))}
      </div>
    </Cartao>
  );
}
