import type { useSessao } from '@/app/sessao';
import { MENSAGENS_DE_RECUSA, MENSAGEM_DE_FALHA, MENSAGEM_DE_INDISPONIBILIDADE } from '../constantes';
import type { MensagemDeEntrada } from '../../tipos';

export function mensagemDoEstado(estado: ReturnType<typeof useSessao>['estado']): MensagemDeEntrada {
  if (estado.tipo === 'recusada') return MENSAGENS_DE_RECUSA[estado.codigo];
  if (estado.tipo === 'indisponivel') return MENSAGEM_DE_INDISPONIBILIDADE;
  return MENSAGEM_DE_FALHA;
}
