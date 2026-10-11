export const ERRO = 'ERRO';
export const AVISO = 'AVISO';

export const erro = (caminho, mensagem) => ({ nivel: ERRO, caminho, mensagem });

export const aviso = (caminho, mensagem) => ({ nivel: AVISO, caminho, mensagem });
