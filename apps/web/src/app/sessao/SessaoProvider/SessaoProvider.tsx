import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Eu, Permissao } from '@cdd/contracts';
import type { ServicoDeEntrada } from '@/dados';
import { destinoSeguro } from '@/app/rotas';
import { usuarioDaSessao } from '../estadoDaSessao';
import type { EstadoDaSessao, UsuarioDaSessao } from '../estadoDaSessao';
import { useExisteUsuarioOidc } from '../hooks/useExisteUsuarioOidc';
import { derivarEstado, intervaloDeNovaTentativaDoEu } from '../utils/derivarEstado';

export const CHAVE_DO_EU = ['eu'] as const;

export interface Sessao {
  readonly estado: EstadoDaSessao;
  readonly usuario: UsuarioDaSessao | null;
  pode(permissao: Permissao): boolean;
  entrar(destino: string): Promise<void>;
  concluirEntrada(urlDeRetorno: string): Promise<string>;
  receberConvite(convite: string): void;
  encerrar(): void;
  tentarDeNovo(): void;
}

export interface SessaoProviderProps {
  readonly entrada: ServicoDeEntrada;
  readonly aoEncerrar: (ouvinte: () => void) => () => void;
  readonly aoAcessoRecusado: (ouvinte: () => void) => () => void;
  readonly buscarEu: (sinal: AbortSignal) => Promise<Eu>;
  readonly guardarConvite: (convite: string) => void;
  readonly children: ReactNode;
}

const Contexto = createContext<Sessao | null>(null);

export function SessaoProvider({
  entrada,
  aoEncerrar,
  aoAcessoRecusado,
  buscarEu,
  guardarConvite,
  children,
}: SessaoProviderProps) {
  const clienteDeConsultas = useQueryClient();
  const [temUsuario, setTemUsuario] = useExisteUsuarioOidc(entrada);

  const consulta = useQuery({
    queryKey: CHAVE_DO_EU,
    queryFn: ({ signal }) => buscarEu(signal),
    enabled: temUsuario === true,
    refetchInterval: ({ state }) => intervaloDeNovaTentativaDoEu(state),
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

  useEffect(
    () =>
      aoAcessoRecusado(() => {
        if (clienteDeConsultas.getQueryState(CHAVE_DO_EU)?.fetchStatus !== 'idle') return;
        void clienteDeConsultas.invalidateQueries({ queryKey: CHAVE_DO_EU });
      }),
    [aoAcessoRecusado, clienteDeConsultas],
  );

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

  const receberConvite = useCallback(
    (convite: string) => {
      guardarConvite(convite);
      if (temUsuario) void clienteDeConsultas.resetQueries({ queryKey: CHAVE_DO_EU });
    },
    [guardarConvite, temUsuario, clienteDeConsultas],
  );

  const encerrar = useCallback(() => {
    void entrada
      .sair()
      .catch(() => undefined)
      .then(limparSessao);
  }, [entrada, limparSessao]);

  const { refetch: buscarOEuDeNovo } = consulta;
  const tentarDeNovo = useCallback(() => {
    void buscarOEuDeNovo();
  }, [buscarOEuDeNovo]);

  const eu = estado.tipo === 'ativa' ? estado.eu : null;

  const pode = useCallback((permissao: Permissao) => eu?.permissoes.includes(permissao) ?? false, [eu]);

  const usuario = useMemo(() => (eu ? usuarioDaSessao(eu) : null), [eu]);

  const valor = useMemo<Sessao>(
    () => ({ estado, usuario, pode, entrar, concluirEntrada, receberConvite, encerrar, tentarDeNovo }),
    [estado, usuario, pode, entrar, concluirEntrada, receberConvite, encerrar, tentarDeNovo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const sessao = useContext(Contexto);
  if (!sessao) throw new Error('useSessao fora do SessaoProvider');
  return sessao;
}
