import { Button, EmptyState, InfraError, SkeletonList, varianteDoPainel } from '@/ds';
import { temFiltroAplicado } from './utils/temFiltroAplicado';
import { focarTitulo } from '../../utils/focarTitulo';
import { FiltrosDeUsuarios } from './components/FiltrosDeUsuarios';
import { LinhaDeUsuario } from './components/LinhaDeUsuario';
import { PainelDoUsuario } from './components/PainelDoUsuario';
import { useAbaDeUsuarios } from './hooks/useAbaDeUsuarios';

export function AbaDeUsuarios() {
  const {
    densidade,
    usuarioEmEdicao,
    setUsuarioEmEdicao,
    buscaDigitada,
    setBuscaDigitada,
    situacao,
    setSituacao,
    grupoId,
    setGrupoId,
    filtro,
    grupos,
    usuarios,
    itens,
    gerenciar,
    fecharPainel,
  } = useAbaDeUsuarios();

  return (
    <>
      <FiltrosDeUsuarios
        busca={buscaDigitada}
        situacao={situacao}
        grupoId={grupoId}
        grupos={grupos.data?.itens ?? []}
        aoMudarBusca={setBuscaDigitada}
        aoMudarSituacao={setSituacao}
        aoMudarGrupo={setGrupoId}
      />

      {usuarios.isPending ? <SkeletonList rows={5} /> : null}

      {usuarios.isError && !usuarios.data ? (
        <InfraError
          description="Não foi possível carregar os usuários agora. Tente de novo em instantes."
          onRetry={() => void usuarios.refetch()}
        />
      ) : null}

      {usuarios.data && itens.length === 0 ? (
        <EmptyState
          title="Nenhum usuário encontrado"
          description={
            temFiltroAplicado(filtro)
              ? 'Nenhum usuário combina com os filtros escolhidos. Ajuste a busca ou limpe os filtros.'
              : 'Ainda não há usuários com acesso ao sistema.'
          }
        />
      ) : null}

      {itens.length > 0 ? (
        <ul aria-label="Usuários" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itens.map((usuario) => (
            <LinhaDeUsuario key={usuario.id} usuario={usuario} aoGerenciar={gerenciar} />
          ))}
        </ul>
      ) : null}

      {usuarios.isFetchNextPageError ? (
        <InfraError
          description="Não foi possível carregar mais usuários."
          onRetry={() => void usuarios.fetchNextPage()}
        />
      ) : null}

      {usuarios.hasNextPage && !usuarios.isFetchNextPageError ? (
        <div>
          <Button variant="quiet" disabled={usuarios.isFetchingNextPage} onClick={() => void usuarios.fetchNextPage()}>
            {usuarios.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
          </Button>
        </div>
      ) : null}
      <PainelDoUsuario
        usuario={usuarioEmEdicao}
        variante={varianteDoPainel(densidade)}
        densidade={densidade}
        aoFechar={fecharPainel}
        aoAtualizarUsuario={setUsuarioEmEdicao}
        focoDeReserva={focarTitulo}
      />
    </>
  );
}
