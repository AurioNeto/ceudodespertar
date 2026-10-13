import type { Leito } from '@cdd/contracts';
import { fundoComVidro, type Density } from '@/ds';
import { conflitoDeAgenda, hospedes, liberadoPorCancelamento, type eventoDoMapa } from '../../../../../../mocks/leitos';
import { ESTILO_DO_OCUPANTE } from './constantes';

export interface CelulaProps {
  leito: Leito;
  noite: (typeof eventoDoMapa.noites)[number];
  densidade: Density;
  ocupantes: readonly string[];
  selecionada: boolean;
  mostrarLiberado: boolean;
  onEscolher?: () => void;
  onLiberar?: (inscricaoId: string) => void;
}

/**
 * Uma vaga-noite. Deixou de ser um botão só quando a casa mostrou que tem uma
 * cama de casal: a célula passou a caber mais de uma pessoa, e cada uma sai
 * sozinha de lá.
 */
export function Celula({
  leito: l,
  noite: n,
  densidade,
  ocupantes,
  selecionada,
  mostrarLiberado,
  onEscolher,
  onLiberar,
}: CelulaProps) {
  const campo = densidade === 'field';
  const conflita = n.chave === conflitoDeAgenda.noite;
  const temVaga = ocupantes.length < l.capacidade;
  const estiloDaVagaLivre = {
    padding: '3px 5px',
    borderRadius: 'var(--radius-sm)',
    border: ocupantes.length > 0 ? '1px dashed var(--color-line-strong)' : 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  } as const;
  const vagaLivre = (
    <>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {ocupantes.length > 0 ? `livre · cabe mais ${l.capacidade - ocupantes.length}` : 'livre'}
      </span>
      {mostrarLiberado ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)', textAlign: 'center' }}>
          liberado em {liberadoPorCancelamento.quando}
        </span>
      ) : null}
    </>
  );

  if (!l.ativo) {
    return (
      <div
        style={{
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-line)',
          background: 'var(--bg-sunken)',
          minHeight: campo ? 52 : 48,
        }}
      />
    );
  }

  return (
    <div
      style={{
        borderRadius: 'var(--radius-sm)',
        border: `1px ${ocupantes.length > 0 || selecionada ? 'solid' : 'dashed'} ${
          selecionada
            ? 'var(--color-royal)'
            : conflita
              ? 'var(--color-pending)'
              : ocupantes.length > 0
                ? 'var(--color-royal)'
                : 'var(--color-line-strong)'
        }`,
        ...fundoComVidro(
          ocupantes.length > 0
            ? 'var(--color-royal-soft)'
            : selecionada
              ? 'var(--color-royal-soft)'
              : conflita
                ? 'var(--color-pending-soft)'
                : 'var(--bg-card-solid)',
        ),
        minHeight: campo ? 52 : 48,
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      {ocupantes.map((inscricaoId) => {
        const nome = hospedes.find((h) => (h.inscricaoId as string) === inscricaoId)?.nome ?? inscricaoId;
        const nomeEmDuasLinhas = (
          <>
            <span style={{ font: 'var(--text-small)', fontWeight: 600 }}>{nome.split(' ')[0]}</span>
            <span style={{ font: 'var(--text-small)', opacity: 0.7 }}>{nome.split(' ').slice(1).join(' ')}</span>
          </>
        );
        return onLiberar ? (
          <button
            key={inscricaoId}
            type="button"
            aria-label={`liberar ${l.identificacao} na ${n.rotulo} — ${nome}`}
            onClick={() => onLiberar(inscricaoId)}
            style={{ ...ESTILO_DO_OCUPANTE, cursor: 'pointer' }}
          >
            {nomeEmDuasLinhas}
          </button>
        ) : (
          <div key={inscricaoId} style={ESTILO_DO_OCUPANTE}>
            {nomeEmDuasLinhas}
          </div>
        );
      })}

      {temVaga ? (
        onEscolher ? (
          <button
            type="button"
            aria-label={`alocar em ${l.identificacao} na ${n.rotulo}`}
            onClick={onEscolher}
            style={{ ...estiloDaVagaLivre, cursor: 'pointer' }}
          >
            {vagaLivre}
          </button>
        ) : (
          <div style={estiloDaVagaLivre}>{vagaLivre}</div>
        )
      ) : null}
    </div>
  );
}
