import { useQuery } from '@tanstack/react-query';
import type { GrupoDaGestao } from '@cdd/contracts';
import { EmptyState, InfraError, SkeletonList, StatusBadge, Cartao } from '@/ds';
import { PermissoesPorModulo } from '../../components/PermissoesPorModulo';
import { pluralizar } from '../../lib/formato';
import { useConsultasDeAcessos } from './consultasDeAcessos';

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
  return (
    <Cartao as="article" aria-label={`Grupo ${grupo.nome}`}>
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
      <PermissoesPorModulo
        codigos={grupo.permissoes}
        mostrarCodigo={false}
        vazio="Nenhuma permissão concedida."
        rotuloAcessivel={(modulo) => `Permissões de ${modulo} do grupo ${grupo.nome}`}
      />
    </Cartao>
  );
}
