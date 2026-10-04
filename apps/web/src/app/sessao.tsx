import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import type { Eu, Permissao } from '@cdd/contracts';
import type { ServicoDeEntrada } from '../dados/oidc';
import { Portao } from '../pages/entrada/Portao';
import { SkeletonList } from '../ds';
import { destinoSeguro } from './destino';
import { estadoDoErroDoEu, usuarioDaSessao } from './estadoDaSessao';
import type { EstadoDaSessao, UsuarioDaSessao } from './estadoDaSessao';
import { ROTAS_PUBLICAS } from './navegacao';

export const CHAVE_DO_EU = ['eu'] as const;

export interface Sessao {
  readonly estado: EstadoDaSessao;
  readonly usuario: UsuarioDaSessao | null;
  pode(permissao: Permissao): boolean;
  entrar(destino: string): Promise<void>;
  concluirEntrada(urlDeRetorno: string): Promise<string>;
  encerrar(): void;
  tentarDeNovo(): void;
}

export interface SessaoProviderProps {
  readonly entrada: ServicoDeEntrada;
  readonly aoEncerrar: (ouvinte: () => void) => () => void;
  readonly buscarEu: (sinal: AbortSignal) => Promise<Eu>;
  readonly children: ReactNode;
}

const Contexto = createContext<Sessao | null>(null);

function derivarEstado(
  temUsuario: boolean | null,
  consulta: { status: 'pending' | 'error' | 'success'; data: Eu | undefined; error: unknown },
): EstadoDaSessao {
  if (temUsuario === null) return { tipo: 'verificando' };
  if (!temUsuario) return { tipo: 'sem-sessao' };
  if (consulta.status === 'pending') return { tipo: 'verificando' };
  if (consulta.status === 'error') return estadoDoErroDoEu(consulta.error);
  return consulta.data ? { tipo: 'ativa', eu: consulta.data } : { tipo: 'falha' };
}

function useExisteUsuarioOidc(entrada: ServicoDeEntrada) {
  const [temUsuario, setTemUsuario] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    void entrada.recuperarSessao().then((existe) => {
      if (vivo) setTemUsuario(existe);
    });
    return () => {
      vivo = false;
    };
  }, [entrada]);

  return [temUsuario, setTemUsuario] as const;
}

export function SessaoProvider({ entrada, aoEncerrar, buscarEu, children }: SessaoProviderProps) {
  const clienteDeConsultas = useQueryClient();
  const [temUsuario, setTemUsuario] = useExisteUsuarioOidc(entrada);

  const consulta = useQuery({
    queryKey: CHAVE_DO_EU,
    queryFn: ({ signal }) => buscarEu(signal),
    enabled: temUsuario === true,
  });

  const estado = useMemo(
    () => derivarEstado(temUsuario, { status: consulta.status, data: consulta.data, error: consulta.error }),
    [temUsuario, consulta.status, consulta.data, consulta.error],
  );

  const limparSessao = useCallback(() => {
    setTemUsuario(false);
    clienteDeConsultas.clear();
  }, [clienteDeConsultas, setTemUsuario]);

  useEffect(() => aoEncerrar(limparSessao), [aoEncerrar, limparSessao]);

  const entrar = useCallback(
    async (destino: string) => {
      await entrada.iniciarEntrada(destinoSeguro(destino));
      setTemUsuario(await entrada.recuperarSessao());
    },
    [entrada, setTemUsuario],
  );

  const concluirEntrada = useCallback(
    async (urlDeRetorno: string) => {
      const estadoDoRetorno = await entrada.concluirEntrada(urlDeRetorno);
      await clienteDeConsultas.resetQueries({ queryKey: CHAVE_DO_EU });
      setTemUsuario(true);
      return destinoSeguro(estadoDoRetorno);
    },
    [entrada, clienteDeConsultas, setTemUsuario],
  );

  const encerrar = useCallback(() => {
    void entrada.sair().then(limparSessao);
  }, [entrada, limparSessao]);

  const { refetch: buscarOEuDeNovo } = consulta;
  const tentarDeNovo = useCallback(() => {
    void buscarOEuDeNovo();
  }, [buscarOEuDeNovo]);

  const eu = estado.tipo === 'ativa' ? estado.eu : null;

  const pode = useCallback((permissao: Permissao) => eu?.permissoes.includes(permissao) ?? false, [eu]);

  const usuario = useMemo(() => (eu ? usuarioDaSessao(eu) : null), [eu]);

  const valor = useMemo<Sessao>(
    () => ({ estado, usuario, pode, entrar, concluirEntrada, encerrar, tentarDeNovo }),
    [estado, usuario, pode, entrar, concluirEntrada, encerrar, tentarDeNovo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const sessao = useContext(Contexto);
  if (!sessao) throw new Error('useSessao fora do SessaoProvider');
  return sessao;
}

export function ExigeSessao({ children }: { children: ReactNode }) {
  const { estado } = useSessao();
  const { pathname, search } = useLocation();

  if (estado.tipo === 'ativa') return <>{children}</>;

  if (estado.tipo === 'verificando') {
    return (
      <Portao titulo="Verificando seu acesso" descricao="Só um instante.">
        <SkeletonList rows={2} />
      </Portao>
    );
  }

  return <Navigate to={ROTAS_PUBLICAS.entrar} replace state={{ de: `${pathname}${search}` }} />;
}
