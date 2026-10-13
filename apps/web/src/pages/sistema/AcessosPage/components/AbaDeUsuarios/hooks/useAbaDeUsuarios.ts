import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { GrupoId, SituacaoUsuario, UsuarioId, UsuarioListado } from '@cdd/contracts';
import { useDensidade } from '@/ds';
import { useConsultasDeAcessos } from '../../../consultas';
import { focarTitulo } from '../../../utils/focarTitulo';
import { ATRASO_DA_BUSCA_EM_MS } from '../constantes';
import { semRepetidos } from '../utils/semRepetidos';
import { useValorComAtraso } from './useValorComAtraso';

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

export function useAbaDeUsuarios() {
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

  const fecharPainel = () => setUsuarioEmEdicao(null);

  useDevolverFocoAoTituloQuandoLinhaGerenciadaSome({
    painelAberto: usuarioEmEdicao !== null,
    ultimoUsuarioGerenciado,
    itens,
  });

  return {
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
  };
}
