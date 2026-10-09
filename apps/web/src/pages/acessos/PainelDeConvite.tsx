import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ConvidarUsuario } from '@cdd/contracts';
import type { GrupoId, PedidoDeConvite } from '@cdd/contracts';
import { Button, PainelDeAcao, TextField, type Density, type VarianteDoPainel } from '../../ds';
import { useChaveDeIdempotencia } from '../../lib/chaveDeIdempotencia';
import { useComandosDeAcessos } from './comandosDeAcessos';
import { SeletorDeGrupos } from './SeletorDeGrupos';
import { useFocoNoPrimeiroCampoInvalido } from './useFocoNoPrimeiroCampoInvalido';
import { AJUDA_DE_GRUPOS_DO_CONVITE, CONVITE_REGISTRADO } from './textosDeAcessos';
import { useAcaoNoUsuario } from './useAcaoNoUsuario';

export interface PainelDeConviteProps {
  readonly aberto: boolean;
  readonly variante: VarianteDoPainel;
  readonly densidade: Density;
  readonly aoFechar: () => void;
  readonly focoDeReserva: () => HTMLElement | null;
}

interface ErrosDeCampo {
  readonly nome?: string;
  readonly email?: string;
}

function validarConvite(nome: string, email: string): ErrosDeCampo {
  const resultado = ConvidarUsuario.safeParse({ nome, email });
  if (resultado.success) return {};
  const camposInvalidos = new Set(resultado.error.issues.map((problema) => problema.path[0]));
  return {
    ...(camposInvalidos.has('nome') ? { nome: 'Informe o nome.' } : {}),
    ...(camposInvalidos.has('email') ? { email: 'Informe um e-mail válido.' } : {}),
  };
}

export function PainelDeConvite({ aberto, ...resto }: PainelDeConviteProps) {
  return aberto ? <PainelDeConviteAberto {...resto} /> : null;
}

function PainelDeConviteAberto({ variante, densidade, aoFechar, focoDeReserva }: Omit<PainelDeConviteProps, 'aberto'>) {
  const comandos = useComandosDeAcessos();
  const chavePara = useChaveDeIdempotencia();
  const { enviando, erro, enviar } = useAcaoNoUsuario<'convidar'>({ usuarioId: null });
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [grupos, setGrupos] = useState<readonly GrupoId[]>([]);
  const [errosDeCampo, setErrosDeCampo] = useState<ErrosDeCampo>({});
  const [registrado, setRegistrado] = useState(false);
  const { raiz: formulario, focarPrimeiroCampoInvalido } = useFocoNoPrimeiroCampoInvalido<HTMLFormElement>();

  const conclusao = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (registrado) conclusao.current?.querySelector('button')?.focus();
  }, [registrado]);

  const submeter = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    const erros = validarConvite(nomeLimpo, emailLimpo);
    setErrosDeCampo(erros);
    if (erros.nome || erros.email) {
      focarPrimeiroCampoInvalido();
      return;
    }
    const pedido: PedidoDeConvite = {
      nome: nomeLimpo,
      email: emailLimpo,
      ...(grupos.length > 0 ? { grupos: [...grupos] } : {}),
    };
    void enviar(
      'convidar',
      () => comandos.convidar(pedido, { chaveDeIdempotencia: chavePara(pedido) }),
      () => setRegistrado(true),
    );
  };

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
      {erro ? (
        <p role="alert" style={{ margin: 0, font: 'var(--text-small)', color: 'var(--color-attention)' }}>
          {erro}
        </p>
      ) : null}
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
