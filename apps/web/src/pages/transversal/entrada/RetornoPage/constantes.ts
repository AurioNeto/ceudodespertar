import type { MensagemDeEntrada } from '../tipos';

export const MENSAGEM_DE_ERRO_NO_RETORNO: MensagemDeEntrada = {
  tom: 'atencao',
  titulo: 'A entrada não foi concluída',
  corpo: 'O login foi interrompido ou expirou. Comece de novo; a sua senha não foi afetada.',
};
