import { Button, Icon, Rotulo, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import type { NoiteId } from '../../../../mocks/leitos';
import type { Pendencia } from '../../../../tipos';
import { rotuloDaNoite } from '../../../../utils/noites';

export interface EscolhaDeHospedeProps {
  leito: string;
  noite: NoiteId;
  pendencias: readonly Pendencia[];
  densidade: Density;
  onFechar: () => void;
  onAlocar: (inscricaoId: string, nome: string) => void;
}

export function EscolhaDeHospede({
  leito,
  noite,
  pendencias,
  densidade,
  onFechar,
  onAlocar,
}: EscolhaDeHospedeProps) {
  const campo = densidade === 'field';
  const candidatos = pendencias.filter((p) => p.faltam.includes(noite));

  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius)',
        padding: campo ? '14px 15px' : '15px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
        <Rotulo>
          Quem dorme em {leito} na {rotuloDaNoite(noite)}
        </Rotulo>
        <span style={{ flex: 1 }} />
        <Button variant="quiet" onClick={onFechar}>
          Fechar
        </Button>
      </div>

      {candidatos.length === 0 ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Ninguém sem leito nesta noite. Quem pediu hospedagem já está alocado.
        </span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidatos.map(({ hospede: h }) => (
            <button
              key={h.inscricaoId}
              type="button"
              onClick={() => onAlocar(h.inscricaoId as string, h.nome)}
              style={{
                textAlign: 'left',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-card)',
                padding: campo ? '13px 14px' : '11px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                minHeight: campo ? 'var(--target-field)' : undefined,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{h.nome}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  {h.hospedagem === 'QUARTO' ? 'Pediu quarto' : 'Pediu beliche'} ·{' '}
                  {pluralizar(h.noites.length, 'noite')}
                  {h.observacao ? ` · ${h.observacao}` : ''}
                </span>
              </span>
              <Icon name="chevron-right" size={17} color="var(--text-meta)" />
            </button>
          ))}
        </div>
      )}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '74ch' }}>
        Só aparece quem pediu hospedagem nesta inscrição. Quem vai de colchonete ou vai embora depois do trabalho não
        entra no mapa — não é esquecimento, é que não ocupa leito.
      </span>
    </div>
  );
}
