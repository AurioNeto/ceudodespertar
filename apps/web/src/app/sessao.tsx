import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Usuario } from '@cdd/contracts';
import { ROTAS_PUBLICAS } from './navegacao';

/**
 * A sessão do front-end. Guarda quem entrou e nada mais — o token de verdade
 * virá do Keycloak, e é ele que o cliente HTTP vai carregar quando existir API.
 *
 * `sessionStorage` e não `localStorage`: fechar a aba encerra a sessão, que é o
 * comportamento certo para um sistema aberto no notebook da secretaria.
 */

const CHAVE = 'cdd.sessao';

interface Sessao {
  readonly usuario: Usuario | null;
  abrir(usuario: Usuario): void;
  encerrar(): void;
}

const Contexto = createContext<Sessao | null>(null);

function ler(): Usuario | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Usuario) : null;
  } catch {
    return null;
  }
}

function gravar(usuario: Usuario | null): void {
  try {
    if (usuario) sessionStorage.setItem(CHAVE, JSON.stringify(usuario));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // Navegador com armazenamento bloqueado ainda navega; só não sobrevive ao F5.
  }
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(ler);

  const abrir = useCallback((entrante: Usuario) => {
    gravar(entrante);
    setUsuario(entrante);
  }, []);

  const encerrar = useCallback(() => {
    gravar(null);
    setUsuario(null);
  }, []);

  const valor = useMemo<Sessao>(() => ({ usuario, abrir, encerrar }), [usuario, abrir, encerrar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const sessao = useContext(Contexto);
  if (!sessao) throw new Error('useSessao fora do SessaoProvider');
  return sessao;
}

/**
 * Porta das telas internas. Guarda o caminho pedido para devolver a pessoa
 * exatamente onde ela tentou entrar — quem clica num link de lançamento e
 * esbarra no login espera voltar para aquele lançamento, não para o painel.
 */
export function ExigeSessao({ children }: { children: ReactNode }) {
  const { usuario } = useSessao();
  const { pathname, search } = useLocation();

  if (!usuario) {
    return <Navigate to={ROTAS_PUBLICAS.entrar} replace state={{ de: `${pathname}${search}` }} />;
  }
  return <>{children}</>;
}
