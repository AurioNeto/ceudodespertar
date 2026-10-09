import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UsuarioId, UsuarioListado } from '@cdd/contracts';
import { ErroDaApi } from '../../dados/erros';
import { CHAVE_DO_EU, useSessao } from '../../app/sessao';
import {
  RAIZ_DAS_CONSULTAS_DE_GRUPOS,
  RAIZ_DAS_CONSULTAS_DE_USUARIOS,
  useConsultasDeAcessos,
} from './consultasDeAcessos';
import { mensagemDeErro } from './mensagemDeErroDeAcessos';
import { AVISO_DE_VERSAO_DESATUALIZADA } from './textosDeAcessos';

export interface OpcoesDaAcaoNoUsuario {
  readonly usuarioId: UsuarioId | null;
  readonly aoRecarregar?: (usuario: UsuarioListado) => void;
}

const ehVersaoDesatualizada = (erro: unknown): boolean =>
  erro instanceof ErroDaApi && erro.codigo === 'VERSAO_DESATUALIZADA';

export function useAcaoNoUsuario<Acao extends string>({ usuarioId, aoRecarregar }: OpcoesDaAcaoNoUsuario) {
  const clienteDeConsultas = useQueryClient();
  const consultas = useConsultasDeAcessos();
  const { usuario: usuarioLogado } = useSessao();
  const emEnvio = useRef(false);
  const montado = useRef(false);
  const [acaoEmCurso, setAcaoEmCurso] = useState<Acao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregarUsuario = async (id: UsuarioId) => {
    const recarregado = await clienteDeConsultas.fetchQuery({ ...consultas.usuario(id), staleTime: 0 });
    void clienteDeConsultas.invalidateQueries({ queryKey: RAIZ_DAS_CONSULTAS_DE_USUARIOS });
    if (!montado.current) return;
    aoRecarregar?.(recarregado);
    setAviso(AVISO_DE_VERSAO_DESATUALIZADA);
  };

  const tratarFalha = async (falha: unknown) => {
    if (usuarioId && ehVersaoDesatualizada(falha)) {
      try {
        await recarregarUsuario(usuarioId);
      } catch (falhaAoRecarregar) {
        if (montado.current) setErro(mensagemDeErro(falhaAoRecarregar));
      }
      return;
    }
    if (montado.current) setErro(mensagemDeErro(falha));
  };

  const atualizarTelasEmSegundoPlano = () => {
    void clienteDeConsultas.invalidateQueries({ queryKey: RAIZ_DAS_CONSULTAS_DE_USUARIOS });
    void clienteDeConsultas.invalidateQueries({ queryKey: RAIZ_DAS_CONSULTAS_DE_GRUPOS });
    if (usuarioId !== null && usuarioId === usuarioLogado?.id) {
      void clienteDeConsultas.invalidateQueries({ queryKey: CHAVE_DO_EU });
    }
  };

  const enviar = async <Saida,>(acao: Acao, operacao: () => Promise<Saida>, aoSucesso: (saida: Saida) => void) => {
    if (emEnvio.current) return;
    emEnvio.current = true;
    setAcaoEmCurso(acao);
    setErro(null);
    setAviso(null);
    try {
      const saida = await operacao();
      atualizarTelasEmSegundoPlano();
      if (montado.current) aoSucesso(saida);
    } catch (falha) {
      await tratarFalha(falha);
    } finally {
      emEnvio.current = false;
      if (montado.current) setAcaoEmCurso(null);
    }
  };

  return { enviando: acaoEmCurso !== null, acaoEmCurso, erro, aviso, enviar };
}
