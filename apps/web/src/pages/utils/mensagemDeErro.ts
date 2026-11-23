import type { CodigoDeErro } from '@cdd/contracts';
import { ErroDaApi, ErroDeRede } from '@/dados';

export const MENSAGEM_DE_PERMISSAO_PERDIDA = 'Você não tem mais permissão para esta ação.';
export const MENSAGEM_GENERICA = 'Não foi possível concluir agora. Tente de novo em instantes.';
export const MENSAGEM_DE_REDE =
  'Sem conexão com o servidor. Verifique sua internet e tente de novo; o que você digitou foi mantido.';
export const MENSAGEM_DE_INDISPONIBILIDADE =
  'O serviço está indisponível no momento. Tente de novo em instantes; o que você digitou foi mantido.';

export type MensagemDoCodigo = string | ((erro: ErroDaApi) => string);

export type MensagensPorCodigo = Partial<Record<CodigoDeErro, MensagemDoCodigo>>;

const resolver = (mensagem: MensagemDoCodigo, erro: ErroDaApi) =>
  typeof mensagem === 'function' ? mensagem(erro) : mensagem;

export function criarMensagemDeErro(mensagens: MensagensPorCodigo) {
  return function mensagemDeErro(erro: unknown): string {
    if (erro instanceof ErroDaApi) {
      const doCodigo = mensagens[erro.codigo];
      if (doCodigo) return resolver(doCodigo, erro);
      return erro.ehIndisponibilidadeTemporaria ? MENSAGEM_DE_INDISPONIBILIDADE : MENSAGEM_GENERICA;
    }
    if (erro instanceof ErroDeRede) return MENSAGEM_DE_REDE;
    return MENSAGEM_GENERICA;
  };
}
