import { useState } from 'react';
import type { GrupoId, UsuarioListado } from '@cdd/contracts';
import { Button, PainelDeAcao, type Density, type VarianteDoPainel } from '../../ds';
import { useChaveDeIdempotencia } from '../../lib/chaveDeIdempotencia';
import { CampoDeMotivo } from './CampoDeMotivo';
import { useComandosDeAcessos } from './comandosDeAcessos';
import { SeletorDeGrupos } from './SeletorDeGrupos';
import { SITUACAO_DE_USUARIO } from './situacaoDeUsuario';
import { useAcaoNoUsuario } from './useAcaoNoUsuario';

export interface PainelDoUsuarioProps {
  readonly usuario: UsuarioListado | null;
  readonly variante: VarianteDoPainel;
  readonly densidade: Density;
  readonly aoFechar: () => void;
  readonly aoAtualizarUsuario: (usuario: UsuarioListado) => void;
  readonly focoDeReserva: () => HTMLElement | null;
}

const MOTIVO_OBRIGATORIO = 'Informe o motivo.';

type AcaoDeSituacao = 'suspender' | 'reativar';
type AcaoDoPainel = 'grupos' | AcaoDeSituacao;

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
  const acaoDeSituacao = acaoDeSituacaoDisponivel(usuario);
  const situacao = SITUACAO_DE_USUARIO[usuario.situacao];

  const salvarGrupos = () =>
    void enviar(
      'grupos',
      () => comandos.definirGrupos({ usuarioId: usuario.id, versao: usuario.versao, grupos }),
      aoFechar,
    );

  const mudarSituacao = (acao: AcaoDeSituacao) => {
    const motivoLimpo = motivo.trim();
    if (!motivoLimpo) {
      setErroDeMotivo(MOTIVO_OBRIGATORIO);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {aviso ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: 'var(--space-3)',
            font: 'var(--text-small)',
            color: 'var(--text-primary)',
            background: 'var(--color-attention-soft)',
            border: '1px solid var(--color-attention-border)',
            borderRadius: 'var(--radius)',
          }}
        >
          {aviso}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" style={{ margin: 0, font: 'var(--text-small)', color: 'var(--color-attention)' }}>
          {erro}
        </p>
      ) : null}

      <section aria-label="Grupos" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
      </section>
    </div>
    </PainelDeAcao>
  );
}
