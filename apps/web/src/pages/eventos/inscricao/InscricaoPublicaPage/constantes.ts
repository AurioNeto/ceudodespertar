import type { Novo } from './tipos';

export const NOVO_VAZIO: Novo = { nome: '', nascimento: '', telefone: '', cidade: '', email: '' };

export const IDADE_MINIMA_PELO_LINK = 18;

export const ANO_MAIS_ANTIGO_DE_NASCIMENTO = 1900;

export const MENSAGEM_DE_CPF_INVALIDO = 'O CPF não é válido. Confira os números.';

export const MENSAGEM_DE_NASCIMENTO_INVALIDO = 'Use o formato dd/mm/aaaa, com uma data que exista.';

export const MENSAGEM_DE_MENOR_PELO_LINK =
  'Este link é só para adultos. A criança é inscrita pela casa, com o responsável: fale com a recepção no WhatsApp.';

export const AVISO_DE_NASCIMENTO_A_CORRIGIR = 'Confira a data de nascimento.';
