import { Aviso } from './Aviso';
import type { MensagemDeEntrada } from './mensagens';

export function MensagemDeEntradaNaTela({ mensagem }: { mensagem: MensagemDeEntrada }) {
  return (
    <Aviso tom={mensagem.tom} titulo={mensagem.titulo}>
      {mensagem.corpo}
    </Aviso>
  );
}
