import type { UsuarioListado } from '@cdd/contracts';
import { Aviso, Button, PainelDeAcao, type Density, type VarianteDoPainel } from '@/ds';
import { CampoDeMotivo } from './components/CampoDeMotivo';
import { ErroDoPainel } from '../../../ErroDoPainel';
import { SeletorDeGrupos } from '../../../SeletorDeGrupos';
import { CONVITE_REENVIADO } from './constantes';
import { usePainelDoUsuario } from './hooks/usePainelDoUsuario';

export interface PainelDoUsuarioProps {
  readonly usuario: UsuarioListado | null;
  readonly variante: VarianteDoPainel;
  readonly densidade: Density;
  readonly aoFechar: () => void;
  readonly aoAtualizarUsuario: (usuario: UsuarioListado) => void;
  readonly focoDeReserva: () => HTMLElement | null;
}

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
  const {
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
  } = usePainelDoUsuario({ usuario, aoFechar, aoAtualizarUsuario });

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
