import { Aviso } from '@/ds';
import type { MensagemDeEntrada } from '../../tipos';

export function MensagemDeEntradaNaTela({ mensagem }: { mensagem: MensagemDeEntrada }) {
  return (
    <Aviso tom={mensagem.tom} titulo={mensagem.titulo} role="alert">
      {mensagem.corpo}
    </Aviso>
  );
}
