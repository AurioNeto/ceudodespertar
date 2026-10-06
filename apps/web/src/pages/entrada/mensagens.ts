import type { CodigoDeRecusa } from '../../app/estadoDaSessao';
import type { TomDeAviso } from './Aviso';

export interface MensagemDeEntrada {
  readonly tom: TomDeAviso;
  readonly titulo: string;
  readonly corpo: string;
}

export const MENSAGENS_DE_RECUSA: Readonly<Record<CodigoDeRecusa, MensagemDeEntrada>> = {
  USUARIO_CONVITE_PENDENTE: {
    tom: 'pendente',
    titulo: 'Seu convite ainda não foi aceito',
    corpo:
      'Abra o e-mail do convite e defina sua senha por lá. Se o e-mail não chegou ou o link venceu, peça à administração da casa para reenviar.',
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

export const MENSAGEM_DE_ERRO_NO_RETORNO: MensagemDeEntrada = {
  tom: 'atencao',
  titulo: 'A entrada não foi concluída',
  corpo: 'O login foi interrompido ou expirou. Comece de novo; a sua senha não foi afetada.',
};
