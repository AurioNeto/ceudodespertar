import type { CodigoDeErro } from '@cdd/contracts';

const MENSAGENS_POR_CODIGO: Partial<Record<CodigoDeErro, string>> = {
  BOOTSTRAP_JA_EXECUTADO:
    'O bootstrap já foi executado neste banco (existe instituição ou marcador de execução). Este comando só roda uma vez.',
  EMAIL_DO_SUJEITO_DIVERGENTE: 'O e-mail do sujeito informado no provedor de identidade difere de --admin-email.',
  SUJEITO_INEXISTENTE: 'O sujeito informado em --sujeito não existe no provedor de identidade.',
  PROVEDOR_DE_IDENTIDADE_INDISPONIVEL:
    'O provedor de identidade está indisponível; nada foi gravado. Tente novamente quando ele responder.',
  GRUPO_INEXISTENTE: 'O grupo de sistema ADMINISTRADOR não existe; nada foi gravado.',
  SUJEITO_JA_VINCULADO: 'O sujeito informado já está vinculado a outro usuário; nada foi gravado.',
};

export function mensagemDoCodigoDeErro(codigo: CodigoDeErro): string {
  return MENSAGENS_POR_CODIGO[codigo] ?? `Operação recusada pela regra de negócio (${codigo}); nada foi gravado.`;
}

export function mensagemDeBootstrapGravadoSemConvite(
  instituicaoId: string,
  usuarioId: string,
  causa: string,
): string[] {
  return [
    `O bootstrap foi gravado (instituição ${instituicaoId}, administrador ${usuarioId}), mas o convite não foi enviado (${causa}).`,
    'O comando não pode ser repetido neste banco. Recuperação: em ambiente local, rode `pnpm infra:zerar`, suba a infraestrutura, migre e refaça o bootstrap;',
    'em outro ambiente, a recuperação é manual e exige intervenção de DBA.',
  ];
}

export function linhasDeSucessoPorConvite(instituicaoId: string, usuarioId: string, email: string): string[] {
  return [
    'Bootstrap concluído.',
    `Instituição: ${instituicaoId}`,
    `Administrador: ${usuarioId}`,
    `Convite enviado para ${email}.`,
    'Próximo passo: o administrador abre o e-mail, define a senha e entra no sistema.',
  ];
}

export function linhasDeSucessoPorVinculo(instituicaoId: string, usuarioId: string): string[] {
  return [
    'Bootstrap concluído.',
    `Instituição: ${instituicaoId}`,
    `Administrador: ${usuarioId}`,
    'Próximo passo: o administrador entra no sistema com a conta do provedor de identidade informada.',
  ];
}
