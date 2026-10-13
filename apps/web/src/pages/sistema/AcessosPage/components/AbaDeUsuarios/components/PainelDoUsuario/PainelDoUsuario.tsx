import { useState } from 'react';
import type { GrupoId, UsuarioListado } from '@cdd/contracts';
import { Aviso, Button, PainelDeAcao, type Density, type VarianteDoPainel } from '@/ds';
import { useChaveDeIdempotencia } from '../../../../hooks/useChaveDeIdempotencia';
import { CampoDeMotivo } from './components/CampoDeMotivo';
import { useComandosDeAcessos } from '../../../../comandos';
import { ErroDoPainel } from '../../../ErroDoPainel';
import { SeletorDeGrupos } from '../../../SeletorDeGrupos';
import { SITUACAO_DE_USUARIO } from '../../situacaoDeUsuario';
import { CONVITE_REENVIADO, MOTIVO_OBRIGATORIO } from './constantes';
import { useAcaoNoUsuario } from '../../../../hooks/useAcaoNoUsuario';
import { useFocoNoPrimeiroCampoInvalido } from '../../../../hooks/useFocoNoPrimeiroCampoInvalido';

export interface PainelDoUsuarioProps {
  readonly usuario: UsuarioListado | null;
  readonly variante: VarianteDoPainel;
  readonly densidade: Density;
  readonly aoFechar: () => void;
  readonly aoAtualizarUsuario: (usuario: UsuarioListado) => void;
  readonly focoDeReserva: () => HTMLElement | null;
}

type AcaoDeSituacao = 'suspender' | 'reativar';
type AcaoDoPainel = 'grupos' | 'reenviar' | AcaoDeSituacao;

const acaoDeSituacaoDisponivel = (usuario: UsuarioListado): AcaoDeSituacao | null => {
  if (usuario.situacao === 'ATIVO') return 'suspender';
  if (usuario.situacao === 'SUSPENSO') return 'reativar';
  return null;
};

const idsDosGrupos = (usuario: UsuarioListado): GrupoId[] => usuario.grupos.map((grupo) => grupo.id);

export function PainelDoUsuario({ usuario, ...resto }: PainelDoUsuarioProps) {
  if (!usuario) return null;
  return <PainelDoUsuarioAberto key={usuario.id} usuario={usuario} {...resto} />;
}

interface PainelDoUsuarioAbertoProps extends Omit<PainelDoUsuarioProps, 'usuario'> {
  readonly usuario: UsuarioListado;
}

function PainelDoUsuarioAberto({
  usuario,
  variante,
  densidade,
  aoFechar,
  aoAtualizarUsuario,
  focoDeReserva,
}: PainelDoUsuarioAbertoProps) {
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

  return (
    <PainelDeAcao
      aberto
      titulo={`Gerenciar ${usuario.nome}`}
      descricao={usuario.email}
      variante={variante}
      aoFechar={aoFechar}
      focoDeReserva={focoDeReserva}
    >
    <div ref={raiz} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {aviso ? <Aviso tom="atencao" role="status">{aviso}</Aviso> : null}
      {erro ? <ErroDoPainel>{erro}</ErroDoPainel> : null}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <SeletorDeGrupos selecionados={grupos} aoMudar={setGrupos} desabilitado={revogado} />
        {revogado ? (
          <p style={{ margin: 0, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            O acesso deste usuário foi revogado; os grupos não podem mais ser alterados.
          </p>
        ) : (
          <div>
            <Button density={densidade} aria-disabled={enviando} onClick={salvarGrupos}>
              {acaoEmCurso === 'grupos' ? 'Salvando…' : 'Salvar grupos'}
            </Button>
          </div>
        )}
      </section>

      <section aria-label="Situação" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ margin: 0, font: 'var(--text-body)', color: 'var(--text-primary)' }}>
          Situação atual: <strong>{situacao.rotulo}</strong>
        </p>
        {acaoDeSituacao ? (
          <>
            <CampoDeMotivo valor={motivo} aoMudar={setMotivo} erro={erroDeMotivo} densidade={densidade} />
            <div>
              <Button
                variant={acaoDeSituacao === 'suspender' ? 'ghost' : 'primary'}
                density={densidade}
                aria-disabled={enviando}
                onClick={() => mudarSituacao(acaoDeSituacao)}
              >
                {acaoEmCurso === acaoDeSituacao ? 'Enviando…' : acaoDeSituacao === 'suspender' ? 'Suspender acesso' : 'Reativar acesso'}
              </Button>
            </div>
          </>
        ) : null}
        {convitePendente ? (
          <>
            {conviteReenviado && !erro ? (
              <Aviso tom="confirmado" role="status">
                {CONVITE_REENVIADO}
              </Aviso>
            ) : null}
            <div>
              <Button variant="ghost" density={densidade} aria-disabled={enviando} onClick={reenviarConvite}>
                {acaoEmCurso === 'reenviar' ? 'Reenviando…' : 'Reenviar convite'}
              </Button>
            </div>
          </>
        ) : null}
      </section>
    </div>
    </PainelDeAcao>
  );
}
