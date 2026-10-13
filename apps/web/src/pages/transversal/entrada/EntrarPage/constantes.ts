import type { CodigoDeConviteRecusado, CodigoDeRecusa } from '@/app/sessao';
import type { MensagemDeEntrada } from '../tipos';

export const MENSAGENS_DE_RECUSA: Readonly<Record<CodigoDeRecusa, MensagemDeEntrada>> = {
  USUARIO_CONVITE_PENDENTE: {
    tom: 'pendente',
    titulo: 'Seu convite ainda não foi aceito',
    corpo:
      'Abra o e-mail do convite e defina sua senha pelo link. O link vale uma vez só: se você já definiu a senha mas fechou a página antes de voltar para cá, ou se o e-mail não chegou ou o link venceu, peça à administração da casa um novo convite.',
  },
  USUARIO_SUSPENSO: {
    tom: 'atencao',
    titulo: 'Seu acesso está suspenso',
    corpo: 'A administração da casa suspendeu este acesso. Fale com ela para reativá-lo.',
  },
  USUARIO_REVOGADO: {
    tom: 'atencao',
    titulo: 'Seu acesso foi encerrado',
    corpo: 'Este acesso não existe mais. Se isso for um engano, fale com a administração da casa.',
  },
  USUARIO_DESCONHECIDO: {
    tom: 'atencao',
    titulo: 'Não encontramos seu acesso',
    corpo:
      'Você entrou, mas esta conta não está cadastrada no sistema. Confira se usou o e-mail certo ou peça à administração da casa para convidar você.',
  },
};

export const MENSAGENS_DE_CONVITE_RECUSADO: Readonly<Record<CodigoDeConviteRecusado, MensagemDeEntrada>> = {
  CONVITE_INVALIDO: {
    tom: 'atencao',
    titulo: 'Este convite não foi reconhecido',
    corpo: 'O link do convite não vale. Peça à administração da casa para enviar um novo convite.',
  },
  CONVITE_EXPIRADO: {
    tom: 'atencao',
    titulo: 'O convite venceu',
    corpo: 'O prazo para aceitar este convite acabou. Peça à administração da casa para reenviá-lo.',
  },
  CONVITE_JA_USADO: {
    tom: 'atencao',
    titulo: 'Este convite já foi aceito',
    corpo:
      'O convite já foi usado por outra conta. Se você já tem acesso, continue ou saia e entre com ela; se não, peça um novo convite à administração da casa.',
  },
  SUJEITO_JA_VINCULADO: {
    tom: 'atencao',
    titulo: 'Esta conta já está em uso',
    corpo:
      'A conta com que você entrou já está ligada a outro acesso no sistema, e o convite não foi aceito. Fale com a administração da casa.',
  },
  CONVITE_DE_OUTRO_SUJEITO: {
    tom: 'atencao',
    titulo: 'O convite é para outra conta',
    corpo:
      'Você entrou com uma conta diferente da que recebeu o convite, e ele não foi aceito. Peça à administração da casa um novo convite e entre com o e-mail para o qual ele for enviado.',
  },
};

export const MENSAGEM_DE_CONVITE_RECEBIDO: MensagemDeEntrada = {
  tom: 'confirmado',
  titulo: 'Senha definida',
  corpo: 'Agora entre com o seu e-mail e a senha que você acabou de criar para ativar o seu acesso.',
};

export const MENSAGEM_DE_INDISPONIBILIDADE: MensagemDeEntrada = {
  tom: 'pendente',
  titulo: 'Acesso indisponível',
  corpo: 'Não conseguimos confirmar o seu acesso agora. Tente em instantes — você continua com a sessão aberta.',
};

export const MENSAGEM_DE_FALHA: MensagemDeEntrada = {
  tom: 'atencao',
  titulo: 'Não foi possível carregar o seu acesso',
  corpo: 'Algo deu errado do nosso lado. Tente de novo; se continuar, avise a administração da casa.',
};

export const MENSAGEM_DE_FALHA_AO_INICIAR: MensagemDeEntrada = {
  tom: 'atencao',
  titulo: 'Não conseguimos abrir o login',
  corpo: 'O serviço de acesso não respondeu. Tente de novo em instantes.',
};

export const DESCRICAO_DA_ENTRADA = 'O acesso é pessoal: cada lançamento fica no nome de quem o registrou.';
