import { useState } from 'react';
import { Cartao, Icon, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import type { CadastroEncontrado } from '../../../../mocks/inscricaoPublica';

export interface HerdadasProps {
  cadastro: CadastroEncontrado;
  densidade: Density;
}

export function Herdadas({ cadastro, densidade }: HerdadasProps) {
  const campo = densidade === 'field';
  const [aberto, setAberto] = useState(false);
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', textAlign: 'left' }}
      >
        <Icon name={aberto ? 'chevron-down' : 'chevron-right'} size={17} color="var(--text-meta)" />
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {pluralizar(cadastro.herdadas.length, 'resposta sua', 'respostas suas')} que a casa já tem
        </span>
      </button>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Estas perguntas só mudaram de redação desde que você respondeu. A casa não pergunta de novo o que você já
        disse — e também não finge que a resposta é nova.
      </span>
      {aberto
        ? cadastro.herdadas.map((h) => (
            <div
              key={h.perguntaId}
              style={{ borderTop: '1px solid var(--color-line)', paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span style={{ font: 'var(--text-small)', color: 'var(--text-field-label)' }}>{h.texto}</span>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{h.valor}</span>
            </div>
          ))
        : null}
    </Cartao>
  );
}
