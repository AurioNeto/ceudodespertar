import {
  MENSAGEM_DE_INDISPONIBILIDADE,
  MENSAGEM_DE_PERMISSAO_PERDIDA,
  MENSAGEM_DE_REDE,
  MENSAGEM_GENERICA,
  criarMensagemDeErro,
} from '@/pages/utils/mensagemDeErro';
import type { MensagensPorCodigo } from '@/pages/utils/mensagemDeErro';
import { AVISO_DE_VERSAO_DESATUALIZADA } from '../constantes';

export const MENSAGEM_DE_PERMISSAO_PERDIDA_DE_ACESSOS = MENSAGEM_DE_PERMISSAO_PERDIDA;
export const MENSAGEM_GENERICA_DE_ACESSOS = MENSAGEM_GENERICA;
export const MENSAGEM_DE_REDE_DE_ACESSOS = MENSAGEM_DE_REDE;
export const MENSAGEM_DE_INDISPONIBILIDADE_DE_ACESSOS = MENSAGEM_DE_INDISPONIBILIDADE;

export const MENSAGEM_DE_REENVIO_RECENTE_SEM_ESPERA =
  'O convite acabou de ser enviado. Aguarde um pouco antes de reenviar.';

const SEGUNDOS_POR_MINUTO = 60;

const plural = (quantidade: number, singular: string) => `${quantidade} ${singular}${quantidade === 1 ? '' : 's'}`;

function duracaoDaEspera(segundos: number): string {
  if (segundos < SEGUNDOS_POR_MINUTO) return plural(segundos, 'segundo');
  return plural(Math.ceil(segundos / SEGUNDOS_POR_MINUTO), 'minuto');
}

export function mensagemDeReenvioRecente(esperaEmSegundos: number | null): string {
  if (!esperaEmSegundos) return MENSAGEM_DE_REENVIO_RECENTE_SEM_ESPERA;
  return `O convite acabou de ser enviado. Aguarde ${duracaoDaEspera(esperaEmSegundos)} para reenviar.`;
}

const MENSAGENS_POR_CODIGO: MensagensPorCodigo = {
  CONVITE_REENVIADO_RECENTEMENTE: (erro) => mensagemDeReenvioRecente(erro.esperaEmSegundos),
  ULTIMO_ADMINISTRADOR:
    'Este é o último administrador ativo. Mantenha ao menos uma pessoa com acesso de administração antes de continuar.',
  SEM_PERMISSAO: MENSAGEM_DE_PERMISSAO_PERDIDA_DE_ACESSOS,
  VERSAO_DESATUALIZADA: AVISO_DE_VERSAO_DESATUALIZADA,
  SITUACAO_DO_USUARIO_NAO_PERMITE: 'A situação atual deste usuário não permite esta ação.',
  GRUPO_INEXISTENTE: 'Um dos grupos escolhidos não existe mais. Atualize a lista de grupos e escolha de novo.',
  EMAIL_JA_CADASTRADO: 'Já existe um usuário com este e-mail.',
  CONVITE_JA_PENDENTE: 'Já existe um convite pendente para este e-mail.',
};

export const mensagemDeErro = criarMensagemDeErro(MENSAGENS_POR_CODIGO);
