import type { CodigoDeErro } from '@cdd/contracts';
import { ErroDaApi, ErroDeRede } from '../../dados/erros';
import { AVISO_DE_VERSAO_DESATUALIZADA } from './textosDeAcessos';

export const MENSAGEM_GENERICA_DE_ACESSOS = 'Não foi possível concluir agora. Tente de novo em instantes.';
export const MENSAGEM_DE_REDE_DE_ACESSOS =
  'Sem conexão com o servidor. Verifique sua internet e tente de novo; o que você digitou foi mantido.';
export const MENSAGEM_DE_INDISPONIBILIDADE_DE_ACESSOS =
  'O serviço está indisponível no momento. Tente de novo em instantes; o que você digitou foi mantido.';

const MENSAGENS_POR_CODIGO: Partial<Record<CodigoDeErro, string>> = {
  ULTIMO_ADMINISTRADOR:
    'Este é o último administrador ativo. Mantenha ao menos uma pessoa com acesso de administração antes de continuar.',
  VERSAO_DESATUALIZADA: AVISO_DE_VERSAO_DESATUALIZADA,
  SITUACAO_DO_USUARIO_NAO_PERMITE: 'A situação atual deste usuário não permite esta ação.',
  CONVITE_JA_USADO: 'Este convite já foi usado; o usuário já ativou o acesso.',
  GRUPO_INEXISTENTE: 'Um dos grupos escolhidos não existe mais. Atualize a lista de grupos e escolha de novo.',
  EMAIL_JA_CADASTRADO: 'Já existe um usuário com este e-mail.',
  CONVITE_JA_PENDENTE: 'Já existe um convite pendente para este e-mail.',
  MOTIVO_OBRIGATORIO: 'Informe o motivo.',
  MOTIVO_LONGO_DEMAIS: 'O motivo passou de 500 caracteres. Resuma e tente de novo.',
};

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroDaApi) {
    const mensagem = MENSAGENS_POR_CODIGO[erro.codigo];
    if (mensagem) return mensagem;
    return erro.ehIndisponibilidadeTemporaria
      ? MENSAGEM_DE_INDISPONIBILIDADE_DE_ACESSOS
      : MENSAGEM_GENERICA_DE_ACESSOS;
  }
  if (erro instanceof ErroDeRede) return MENSAGEM_DE_REDE_DE_ACESSOS;
  return MENSAGEM_GENERICA_DE_ACESSOS;
}
