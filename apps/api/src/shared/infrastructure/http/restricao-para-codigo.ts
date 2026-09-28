import type { CodigoDeErro } from '@cdd/contracts';

export const RESTRICAO_PARA_CODIGO: Readonly<Record<string, CodigoDeErro>> = {
  usuario_email_unico: 'EMAIL_JA_CADASTRADO',
  usuario_pessoa_unica: 'PESSOA_JA_TEM_USUARIO',
};
