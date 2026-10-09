import { useQuery } from '@tanstack/react-query';
import type { GrupoDaGestao } from '@cdd/contracts';
import { EmptyState, InfraError, SkeletonList, StatusBadge } from '../../ds';
import { agruparPermissoes } from '../../lib/permissoesAgrupadas';
import { pluralizar } from '../../lib/formato';
import { useConsultasDeAcessos } from './consultasDeAcessos';

const rotuloDeModulo = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

export function AbaDeGrupos() {
  const consultas = useConsultasDeAcessos();
  const grupos = useQuery(consultas.grupos());

  if (grupos.isPending) return <SkeletonList rows={3} />;

  if (grupos.isError) {
    return (
      <InfraError
        description="Não foi possível carregar os grupos agora. Tente de novo em instantes."
        onRetry={() => void grupos.refetch()}
      />
    );
  }

  if (grupos.data.itens.length === 0) {
    return <EmptyState title="Nenhum grupo cadastrado" description="Os grupos de acesso aparecem aqui." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {grupos.data.itens.map((grupo) => (
        <CartaoDeGrupo key={grupo.id} grupo={grupo} />
      ))}
    </div>
  );
}

function CartaoDeGrupo({ grupo }: { grupo: GrupoDaGestao }) {
  const modulos = agruparPermissoes(grupo.permissoes);
  return (
    <article
      aria-label={`Grupo ${grupo.nome}`}
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{grupo.nome}</h3>
        {grupo.protegido ? <StatusBadge tone="neutral">protegido</StatusBadge> : null}
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(grupo.usuarios, 'usuário')}
        </span>
      </div>
      {grupo.descricao ? (
        <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{grupo.descricao}</p>
      ) : null}
      {modulos.length === 0 ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>Nenhuma permissão concedida.</span>
      ) : (
        modulos.map((modulo) => (
          <section
            key={modulo.modulo}
            aria-label={`Permissões de ${modulo.modulo} do grupo ${grupo.nome}`}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <span style={rotuloDeModulo}>{modulo.modulo}</span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {modulo.permissoes.map((permissao) => (
                <li key={permissao.codigo} style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                  {permissao.descricao ?? permissao.codigo}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </article>
  );
}
