import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { GrupoId, PedidoDeConvite } from '@cdd/contracts';
import { useChaveDeIdempotencia } from '../../../hooks/useChaveDeIdempotencia';
import { useComandosDeAcessos } from '../../../comandos';
import { useFocoNoPrimeiroCampoInvalido } from '../../../hooks/useFocoNoPrimeiroCampoInvalido';
import { useAcaoNoUsuario } from '../../../hooks/useAcaoNoUsuario';
import { validarConvite } from '../utils/validarConvite';
import type { ErrosDeCampo } from '../utils/validarConvite';

export function usePainelDeConvite() {
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

  return {
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
  };
}
