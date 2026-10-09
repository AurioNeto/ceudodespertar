import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UsuarioId, UsuarioListado } from '@cdd/contracts';
import { ErroDaApi } from '../../dados/erros';
import { useConsultasDeAcessos } from './consultasDeAcessos';
import { mensagemDeErro } from './mensagemDeErroDeAcessos';
import { AVISO_DE_VERSAO_DESATUALIZADA } from './textosDeAcessos';

export interface OpcoesDaAcaoNoUsuario {
  readonly usuarioId: UsuarioId | null;
  readonly aoRecarregar?: (usuario: UsuarioListado) => void;
}

const CHAVE_DAS_CONSULTAS_DE_USUARIOS = ['acessos', 'usuarios'] as const;

const ehVersaoDesatualizada = (erro: unknown): boolean =>
  erro instanceof ErroDaApi && erro.codigo === 'VERSAO_DESATUALIZADA';

export function useAcaoNoUsuario({ usuarioId, aoRecarregar }: OpcoesDaAcaoNoUsuario) {
  const clienteDeConsultas = useQueryClient();
  const consultas = useConsultasDeAcessos();
  const emEnvio = useRef(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const recarregarUsuario = async (id: UsuarioId) => {
    const recarregado = await clienteDeConsultas.fetchQuery({ ...consultas.usuario(id), staleTime: 0 });
    void clienteDeConsultas.invalidateQueries({ queryKey: CHAVE_DAS_CONSULTAS_DE_USUARIOS });
    aoRecarregar?.(recarregado);
    setAviso(AVISO_DE_VERSAO_DESATUALIZADA);
  };

  const tratarFalha = async (falha: unknown) => {
    if (usuarioId && ehVersaoDesatualizada(falha)) {
      try {
        await recarregarUsuario(usuarioId);
      } catch (falhaAoRecarregar) {
        setErro(mensagemDeErro(falhaAoRecarregar));
      }
      return;
    }
    setErro(mensagemDeErro(falha));
  };

  const enviar = async <Saida,>(operacao: () => Promise<Saida>, aoSucesso: (saida: Saida) => void) => {
    if (emEnvio.current) return;
    emEnvio.current = true;
    setEnviando(true);
    setErro(null);
    setAviso(null);
    try {
      const saida = await operacao();
      await clienteDeConsultas.invalidateQueries({ queryKey: CHAVE_DAS_CONSULTAS_DE_USUARIOS });
      aoSucesso(saida);
    } catch (falha) {
      await tratarFalha(falha);
    } finally {
      emEnvio.current = false;
      setEnviando(false);
    }
  };

  return { enviando, erro, aviso, enviar };
}
