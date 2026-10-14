import { useState } from 'react';
import type { GrupoId, UsuarioListado } from '@cdd/contracts';
import { useChaveDeIdempotencia } from '../../../../../hooks/useChaveDeIdempotencia';
import { useComandosDeAcessos } from '../../../../../comandos';
import { SITUACAO_DE_USUARIO } from '../../../situacaoDeUsuario';
import { MOTIVO_OBRIGATORIO } from '../constantes';
import { useAcaoNoUsuario } from '../../../../../hooks/useAcaoNoUsuario';
import { useFocoNoPrimeiroCampoInvalido } from '../../../../../hooks/useFocoNoPrimeiroCampoInvalido';

type AcaoDeSituacao = 'suspender' | 'reativar';
type AcaoDoPainel = 'grupos' | 'reenviar' | AcaoDeSituacao;

const acaoDeSituacaoDisponivel = (usuario: UsuarioListado): AcaoDeSituacao | null => {
  if (usuario.situacao === 'ATIVO') return 'suspender';
  if (usuario.situacao === 'SUSPENSO') return 'reativar';
  return null;
};

const idsDosGrupos = (usuario: UsuarioListado): GrupoId[] => usuario.grupos.map((grupo) => grupo.id);

interface DadosDoPainelDoUsuario {
  readonly usuario: UsuarioListado;
  readonly aoFechar: () => void;
  readonly aoAtualizarUsuario: (usuario: UsuarioListado) => void;
}

export function usePainelDoUsuario({ usuario, aoFechar, aoAtualizarUsuario }: DadosDoPainelDoUsuario) {
  const comandos = useComandosDeAcessos();
  const chavePara = useChaveDeIdempotencia();
  const [grupos, setGrupos] = useState<readonly GrupoId[]>(() => idsDosGrupos(usuario));
  const [motivo, setMotivo] = useState('');
  const [erroDeMotivo, setErroDeMotivo] = useState<string | undefined>();
  const [conviteReenviado, setConviteReenviado] = useState(false);
  const { raiz, focarPrimeiroCampoInvalido } = useFocoNoPrimeiroCampoInvalido<HTMLDivElement>();

  const { enviando, acaoEmCurso, erro, aviso, enviar } = useAcaoNoUsuario<AcaoDoPainel>({
    usuarioId: usuario.id,
    aoRecarregar: (recarregado) => {
      aoAtualizarUsuario(recarregado);
      setGrupos(idsDosGrupos(recarregado));
      if (acaoDeSituacaoDisponivel(recarregado) !== acaoDeSituacaoDisponivel(usuario)) {
        setMotivo('');
      }
    },
  });

  const revogado = usuario.situacao === 'REVOGADO';
  const convitePendente = usuario.situacao === 'CONVITE_PENDENTE';
  const acaoDeSituacao = acaoDeSituacaoDisponivel(usuario);
  const situacao = SITUACAO_DE_USUARIO[usuario.situacao];

  const salvarGrupos = () =>
    void enviar(
      'grupos',
      () => comandos.definirGrupos({ usuarioId: usuario.id, versao: usuario.versao, grupos }),
      aoFechar,
    );

  const reenviarConvite = () => {
    setConviteReenviado(false);
    const reenvio = { usuarioId: usuario.id, versao: usuario.versao };
    void enviar(
      'reenviar',
      () => comandos.reenviarConvite(reenvio, { chaveDeIdempotencia: chavePara({ acao: 'reenviar', ...reenvio }) }),
      ({ versao }) => {
        aoAtualizarUsuario({ ...usuario, versao });
        setConviteReenviado(true);
      },
    );
  };

  const mudarSituacao = (acao: AcaoDeSituacao) => {
    const motivoLimpo = motivo.trim();
    if (!motivoLimpo) {
      setErroDeMotivo(MOTIVO_OBRIGATORIO);
      focarPrimeiroCampoInvalido();
      return;
    }
    setErroDeMotivo(undefined);
    const mudanca = { usuarioId: usuario.id, versao: usuario.versao, motivo: motivoLimpo };
    void enviar(
      acao,
      () => comandos[acao](mudanca, { chaveDeIdempotencia: chavePara({ acao, ...mudanca }) }),
      aoFechar,
    );
  };

  return {
    raiz,
    grupos,
    setGrupos,
    motivo,
    setMotivo,
    erroDeMotivo,
    conviteReenviado,
    enviando,
    acaoEmCurso,
    erro,
    aviso,
    revogado,
    convitePendente,
    acaoDeSituacao,
    situacao,
    salvarGrupos,
    reenviarConvite,
    mudarSituacao,
  };
}
