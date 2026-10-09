import type { CodigoDeErro } from '@cdd/contracts';

export const RESTRICAO_PARA_CODIGO: Readonly<Record<string, CodigoDeErro>> = {
  usuario_email_unico: 'EMAIL_JA_CADASTRADO',
  usuario_pessoa_unica: 'PESSOA_JA_TEM_USUARIO',
  grupo_nome_unico: 'GRUPO_JA_EXISTE',
  convite_vigente_unico: 'CONVITE_JA_PENDENTE',
  usuario_grupo_grupo_fk: 'GRUPO_INEXISTENTE',
};
