import { Button, PainelDeAcao, TextField, type Density, type VarianteDoPainel } from '@/ds';
import { ErroDoPainel } from '../ErroDoPainel';
import { SeletorDeGrupos } from '../SeletorDeGrupos';
import { AJUDA_DE_GRUPOS_DO_CONVITE, CONVITE_REGISTRADO } from './constantes';
import { usePainelDeConvite } from './hooks/usePainelDeConvite';

export interface PainelDeConviteProps {
  readonly aberto: boolean;
  readonly variante: VarianteDoPainel;
  readonly densidade: Density;
  readonly aoFechar: () => void;
  readonly focoDeReserva: () => HTMLElement | null;
}

export function PainelDeConvite({ aberto, ...resto }: PainelDeConviteProps) {
  return aberto ? <PainelDeConviteAberto {...resto} /> : null;
}

function PainelDeConviteAberto({ variante, densidade, aoFechar, focoDeReserva }: Omit<PainelDeConviteProps, 'aberto'>) {
  const {
    enviando,
    erro,
    nome,
    setNome,
    email,
    setEmail,
    grupos,
    setGrupos,
    errosDeCampo,
    registrado,
    formulario,
    conclusao,
    submeter,
  } = usePainelDeConvite();

  const conteudo = registrado ? (
    <div ref={conclusao}>
      <Button density={densidade} onClick={aoFechar}>
        Concluir
      </Button>
    </div>
  ) : (
    <form ref={formulario} noValidate onSubmit={submeter} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <TextField
        label="Nome"
        density={densidade}
        value={nome}
        maxLength={200}
        autoComplete="off"
        error={errosDeCampo.nome}
        onChange={(evento) => setNome(evento.target.value)}
      />
      <TextField
        label="E-mail"
        type="email"
        density={densidade}
        value={email}
        maxLength={320}
        autoComplete="off"
        error={errosDeCampo.email}
        onChange={(evento) => setEmail(evento.target.value)}
      />
      <SeletorDeGrupos selecionados={grupos} aoMudar={setGrupos} legenda="Grupos (opcional)" />
      <p style={{ margin: 0, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {AJUDA_DE_GRUPOS_DO_CONVITE}
      </p>
      {erro ? <ErroDoPainel>{erro}</ErroDoPainel> : null}
      <div>
        <Button type="submit" density={densidade} aria-disabled={enviando}>
          {enviando ? 'Enviando…' : 'Registrar convite'}
        </Button>
      </div>
    </form>
  );

  return (
    <PainelDeAcao
      aberto
      titulo="Convidar usuário"
      variante={variante}
      aoFechar={aoFechar}
      focoDeReserva={focoDeReserva}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p role="status" style={{ margin: 0, font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {registrado ? CONVITE_REGISTRADO : null}
        </p>
        {conteudo}
      </div>
    </PainelDeAcao>
  );
}
