import type { CodigoDeErro } from '@cdd/contracts';
import type { ResumoDaSemeadura } from '../modules/identidade/public-api.js';
import type { RecusaDoSeedDemo } from '../shared/infrastructure/configuracao/ambiente-permite-seed-demo.js';

const MENSAGENS_POR_CODIGO: Partial<Record<CodigoDeErro, string>> = {
  BOOTSTRAP_JA_EXECUTADO:
    'O bootstrap já foi executado neste banco (existe instituição ou marcador de execução). Este comando só roda uma vez.',
  EMAIL_DO_SUJEITO_DIVERGENTE: 'O e-mail do sujeito informado no provedor de identidade difere de --admin-email.',
  SUJEITO_INEXISTENTE: 'O sujeito informado em --sujeito não existe no provedor de identidade.',
  PROVEDOR_DE_IDENTIDADE_INDISPONIVEL:
    'O provedor de identidade está indisponível; nada foi gravado. Tente novamente quando ele responder.',
  GRUPO_INEXISTENTE: 'O grupo de sistema ADMINISTRADOR não existe; nada foi gravado.',
  SUJEITO_JA_VINCULADO: 'O sujeito informado já está vinculado a outro usuário; nada foi gravado.',
  INSTITUICAO_NAO_DEMO_EXISTENTE:
    'Existe uma instituição que não é a de demonstração neste banco; o seed de demonstração não roda aqui e nada foi gravado.',
  SUJEITO_DO_DEV_DIVERGENTE:
    'O sujeito do dev@cdd.local no Keycloak mudou desde o seed anterior; nada foi alterado. Rode `pnpm infra:zerar`, depois `pnpm infra:subir`, `pnpm db:migrar` e refaça o seed.',
  DEV_NAO_ENCONTRADO_NO_PROVEDOR:
    'O usuário dev@cdd.local não existe no realm do Keycloak; suba a infraestrutura com `pnpm infra:subir` para importar o realm. Nada foi gravado.',
};

const MENSAGENS_DA_RECUSA_DO_SEED: Record<RecusaDoSeedDemo, string> = {
  AMBIENTE_AUSENTE: 'CDD_AMBIENTE não está definida; o seed de demonstração só roda com CDD_AMBIENTE=local ou ci.',
  AMBIENTE_INVALIDO: 'CDD_AMBIENTE tem valor desconhecido; o seed de demonstração só roda com CDD_AMBIENTE=local ou ci.',
  AMBIENTE_NAO_PERMITE_SEED: 'O seed de demonstração só roda com CDD_AMBIENTE=local ou ci.',
  KEYCLOAK_FORA_DO_LOOPBACK:
    'KEYCLOAK_URL_BASE ausente ou fora do loopback (localhost, 127.0.0.1 ou [::1]); o seed de demonstração recusa.',
  BANCO_FORA_DO_LOOPBACK:
    'BANCO_URL ausente ou fora do loopback (localhost, 127.0.0.1 ou [::1]); o seed de demonstração recusa.',
};

export function mensagemDaRecusaDoSeed(recusa: RecusaDoSeedDemo): string {
  return MENSAGENS_DA_RECUSA_DO_SEED[recusa];
}

export function linhasDeSucessoDaSemeadura(resumo: ResumoDaSemeadura): string[] {
  return [
    'Seed de demonstração concluído.',
    `Instituição de demonstração: ${resumo.instituicaoId} (${resumo.instituicaoCriada ? 'criada' : 'já existia'})`,
    `Usuários criados: ${resumo.usuariosCriados}; já existentes: ${resumo.usuariosJaExistentes}`,
    'Próximo passo: entre no sistema com a conta dev@cdd.local do realm local.',
  ];
}

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
