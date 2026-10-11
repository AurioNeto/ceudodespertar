import type { CSSProperties } from 'react';
import type { RegistroDeAcesso } from '@cdd/contracts';
import { Icon } from '@/ds';
import { formatarData } from '@/pages/utils/formato';
import { CONTEXTO_ROTULO } from './constantes';
import type { Agrupamento } from '../../../../../../tipos';
import { dia, hora } from '../../../../../../utils/instante';

export interface LinhaDeAcessoProps {
  registro: RegistroDeAcesso;
  agrupamento: Agrupamento;
  primeira: boolean;
}

export function LinhaDeAcesso({ registro: r, agrupamento, primeira }: LinhaDeAcessoProps) {
  const outro = agrupamento === 'leitor' ? r.pessoaNome : `${r.leitorNome} · ${r.leitorGrupo}`;
  const estilo: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 12px',
    alignItems: 'baseline',
    padding: '9px 0',
    borderTop: primeira ? undefined : '1px solid var(--color-line)',
  };

  return (
    <div style={estilo}>
      <span data-numeric style={{ font: 'var(--text-code)', color: 'var(--text-meta)', minWidth: 108 }}>
        {formatarData(dia(r.em))} {hora(r.em)}
      </span>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 160 }}>{outro}</span>
      {r.contexto ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 2, minWidth: 200 }}>
          <span style={{ color: 'var(--text-field-label)' }}>{CONTEXTO_ROTULO[r.contexto.tipo]} · </span>
          {r.contexto.descricao}
        </span>
      ) : (
        <span
          style={{
            font: 'var(--text-small)',
            color: 'var(--color-pending)',
            flex: 2,
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="message-circle-question" size={14} color="var(--color-pending)" />
          Sem contexto vinculado — leitura direta na ficha
        </span>
      )}
    </div>
  );
}
