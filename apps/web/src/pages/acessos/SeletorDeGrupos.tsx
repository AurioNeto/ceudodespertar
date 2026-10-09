import { useQuery } from '@tanstack/react-query';
import type { GrupoId } from '@cdd/contracts';
import { InfraError, SkeletonList } from '../../ds';
import { useConsultasDeAcessos } from './consultasDeAcessos';

export interface SeletorDeGruposProps {
  readonly selecionados: readonly GrupoId[];
  readonly aoMudar: (selecionados: readonly GrupoId[]) => void;
  readonly desabilitado?: boolean;
  readonly legenda?: string;
}

const ALVO_MINIMO_DE_TOQUE = 44;

export function SeletorDeGrupos({ selecionados, aoMudar, desabilitado = false, legenda = 'Grupos' }: SeletorDeGruposProps) {
  const consultas = useConsultasDeAcessos();
  const grupos = useQuery(consultas.grupos());

  const alternar = (id: GrupoId) =>
    aoMudar(selecionados.includes(id) ? selecionados.filter((atual) => atual !== id) : [...selecionados, id]);

  return (
    <fieldset
      disabled={desabilitado}
      style={{ margin: 0, padding: 0, border: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
    >
      <legend
        style={{
          padding: 0,
          marginBottom: 'var(--space-2)',
          font: 'var(--text-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--text-field-label)',
        }}
      >
        {legenda}
      </legend>
      {grupos.isPending ? <SkeletonList rows={3} /> : null}
      {grupos.isError ? (
        <InfraError description="Não foi possível carregar os grupos agora." onRetry={() => void grupos.refetch()} />
      ) : null}
      {grupos.data && grupos.data.itens.length === 0 ? (
        <p style={{ margin: 0, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Ainda não há grupos cadastrados.
        </p>
      ) : null}
      {grupos.data?.itens.map((grupo) => (
        <label
          key={grupo.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            minHeight: ALVO_MINIMO_DE_TOQUE,
            font: 'var(--text-body)',
            color: 'var(--text-primary)',
          }}
        >
          <input
            type="checkbox"
            checked={selecionados.includes(grupo.id)}
            onChange={() => alternar(grupo.id)}
            style={{ width: 20, height: 20 }}
          />
          {grupo.nome}
        </label>
      ))}
    </fieldset>
  );
}
