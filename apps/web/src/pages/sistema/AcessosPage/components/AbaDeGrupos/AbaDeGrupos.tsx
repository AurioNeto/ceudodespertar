import { useQuery } from '@tanstack/react-query';
import { EmptyState, InfraError, SkeletonList } from '@/ds';
import { useConsultasDeAcessos } from '../../consultas';
import { CartaoDeGrupo } from './components/CartaoDeGrupo';

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
