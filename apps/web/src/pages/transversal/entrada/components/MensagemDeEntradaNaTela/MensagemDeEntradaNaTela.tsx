import { Aviso } from './components/Aviso';
import type { MensagemDeEntrada } from '../../tipos';

export function MensagemDeEntradaNaTela({ mensagem }: { mensagem: MensagemDeEntrada }) {
  return (
    <Aviso tom={mensagem.tom} titulo={mensagem.titulo}>
      {mensagem.corpo}
    </Aviso>
  );
}
