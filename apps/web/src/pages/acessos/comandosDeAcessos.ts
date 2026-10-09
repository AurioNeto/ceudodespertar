import { useMemo } from 'react';
import type {
  GrupoId,
  GruposDoUsuarioDefinidos,
  PedidoDeConvite,
  SituacaoDoUsuarioAlterada,
  UsuarioConvidado,
  UsuarioId,
} from '@cdd/contracts';
import { criarComando } from '../../dados/consultaEComando';
import type { ClienteHttp } from '../../dados/clienteHttp';
import { useClienteHttp } from '../../app/clienteHttp';

export interface MudancaDeSituacao {
  readonly usuarioId: UsuarioId;
  readonly versao: number;
  readonly motivo: string;
}

export interface DefinicaoDeGrupos {
  readonly usuarioId: UsuarioId;
  readonly versao: number;
  readonly grupos: readonly GrupoId[];
}

const caminhoDoUsuario = (usuarioId: UsuarioId, acao: string) =>
  `/identidade/usuarios/${encodeURIComponent(usuarioId)}/${acao}`;

export function criarComandosDeAcessos(cliente: ClienteHttp) {
  const comando = criarComando(cliente);
  return {
    convidar: comando<PedidoDeConvite, UsuarioConvidado>({
      metodo: 'POST',
      caminho: '/identidade/usuarios',
      corpo: (pedido) => pedido,
    }),
    suspender: comando<MudancaDeSituacao, SituacaoDoUsuarioAlterada>({
      metodo: 'POST',
      caminho: ({ usuarioId }) => caminhoDoUsuario(usuarioId, 'desativar'),
      corpo: ({ motivo }) => ({ motivo }),
      versao: ({ versao }) => versao,
    }),
    reativar: comando<MudancaDeSituacao, SituacaoDoUsuarioAlterada>({
      metodo: 'POST',
      caminho: ({ usuarioId }) => caminhoDoUsuario(usuarioId, 'reativar'),
      corpo: ({ motivo }) => ({ motivo }),
      versao: ({ versao }) => versao,
    }),
    definirGrupos: comando<DefinicaoDeGrupos, GruposDoUsuarioDefinidos>({
      metodo: 'PUT',
      caminho: ({ usuarioId }) => caminhoDoUsuario(usuarioId, 'grupos'),
      corpo: ({ grupos }) => ({ grupos }),
      versao: ({ versao }) => versao,
    }),
  };
}

export function useComandosDeAcessos() {
  const cliente = useClienteHttp();
  return useMemo(() => criarComandosDeAcessos(cliente), [cliente]);
}
