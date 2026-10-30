import type { CodigoDeErro } from '@cdd/contracts';

export const RESTRICAO_PARA_CODIGO: Readonly<Record<string, CodigoDeErro>> = {
  pessoa_documento_unico: 'DOCUMENTO_JA_CADASTRADO',
  usuario_email_unico: 'EMAIL_JA_CADASTRADO',
  usuario_pessoa_unica: 'PESSOA_JA_TEM_USUARIO',
  grupo_nome_unico: 'GRUPO_JA_EXISTE',
  convite_vigente_unico: 'CONVITE_JA_PENDENTE',
  usuario_grupo_grupo_fk: 'GRUPO_INEXISTENTE',
  unidade_codigo_unico: 'CODIGO_DE_SISTEMA_JA_EXISTE',
  grupo_de_custo_codigo_unico: 'CODIGO_DE_SISTEMA_JA_EXISTE',
  categoria_codigo_unico: 'CODIGO_DE_SISTEMA_JA_EXISTE',
  fundo_codigo_unico: 'CODIGO_DE_SISTEMA_JA_EXISTE',
  conta_identificador_unico: 'IDENTIFICADOR_BANCARIO_JA_CADASTRADO',
};
