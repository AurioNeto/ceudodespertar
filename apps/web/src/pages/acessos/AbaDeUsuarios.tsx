import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { GrupoId, SituacaoUsuario, UsuarioId, UsuarioListado } from '@cdd/contracts';
import { Button, EmptyState, InfraError, SkeletonList, varianteDoPainel } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { useValorComAtraso } from '../../lib/useValorComAtraso';
import { useConsultasDeAcessos, temFiltroAplicado } from './consultasDeAcessos';
import { focarTitulo } from './focarTitulo';
import { FiltrosDeUsuarios } from './FiltrosDeUsuarios';
import { LinhaDeUsuario } from './LinhaDeUsuario';
import { PainelDoUsuario } from './PainelDoUsuario';

export const ATRASO_DA_BUSCA_EM_MS = 300;

function semRepetidos(usuarios: readonly UsuarioListado[]): readonly UsuarioListado[] {
  const vistos = new Set<UsuarioId>();
  return usuarios.filter((usuario) => {
    if (vistos.has(usuario.id)) return false;
    vistos.add(usuario.id);
    return true;
  });
}

interface OpcoesDoFocoDaLinhaGerenciada {
  readonly painelAberto: boolean;
  readonly ultimoUsuarioGerenciado: RefObject<UsuarioId | null>;
  readonly itens: readonly UsuarioListado[];
}

function useDevolverFocoAoTituloQuandoLinhaGerenciadaSome({
  painelAberto,
  ultimoUsuarioGerenciado,
  itens,
}: OpcoesDoFocoDaLinhaGerenciada) {
  useEffect(() => {
    const id = ultimoUsuarioGerenciado.current;
    if (painelAberto || id === null) return;
    if (itens.some((usuario) => usuario.id === id)) return;
    ultimoUsuarioGerenciado.current = null;
    if (document.activeElement === document.body) focarTitulo()?.focus();
  }, [painelAberto, ultimoUsuarioGerenciado, itens]);
}

export function AbaDeUsuarios() {
  const densidade = useDensidade();
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioListado | null>(null);
  const ultimoUsuarioGerenciado = useRef<UsuarioId | null>(null);
  const consultas = useConsultasDeAcessos();
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [situacao, setSituacao] = useState<SituacaoUsuario | null>(null);
  const [grupoId, setGrupoId] = useState<GrupoId | null>(null);
  const busca = useValorComAtraso(buscaDigitada, ATRASO_DA_BUSCA_EM_MS);
  const filtro = useMemo(() => ({ situacao, grupoId, busca }), [situacao, grupoId, busca]);

  const grupos = useQuery(consultas.grupos());
  const usuarios = useInfiniteQuery(consultas.usuarios(filtro));
  const itens = useMemo(() => semRepetidos(usuarios.data?.pages.flatMap((pagina) => pagina.itens) ?? []), [usuarios.data]);

  const gerenciar = (usuario: UsuarioListado) => {
    ultimoUsuarioGerenciado.current = usuario.id;
    setUsuarioEmEdicao(usuario);
  };

  useDevolverFocoAoTituloQuandoLinhaGerenciadaSome({
    painelAberto: usuarioEmEdicao !== null,
    ultimoUsuarioGerenciado,
    itens,
  });

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
        aoFechar={() => setUsuarioEmEdicao(null)}
        aoAtualizarUsuario={setUsuarioEmEdicao}
        focoDeReserva={focarTitulo}
      />
    </>
  );
}
