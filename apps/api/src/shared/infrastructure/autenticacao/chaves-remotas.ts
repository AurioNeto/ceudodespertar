import { createLocalJWKSet, createRemoteJWKSet, errors, jwksCache } from 'jose';
import type { ExportedJWKSCache, JWKSCacheInput, JWTVerifyGetKey } from 'jose';

const CAMINHO_DO_JWKS_DO_KEYCLOAK = '/protocol/openid-connect/certs';
const ESPERA_ENTRE_RECARGAS_DO_JWKS_EM_MS = 30_000;
const CODIGOS_DE_FALHA_NA_BUSCA: ReadonlySet<string> = new Set([
  errors.JOSEError.code,
  errors.JWKSTimeout.code,
  errors.JWKSInvalid.code,
]);

export const PADROES_DAS_CHAVES_REMOTAS = {
  validadeDoCacheEmMs: 600_000,
  limiteDeEsperaEmMs: 5_000,
  esperaAposFalhaEmMs: 30_000,
  idadeMaximaDoJwksVelhoEmMs: 3_600_000,
} as const;

export interface OpcoesDasChavesRemotas {
  readonly validadeDoCacheEmMs?: number;
  readonly limiteDeEsperaEmMs?: number;
  readonly esperaAposFalhaEmMs?: number;
  readonly idadeMaximaDoJwksVelhoEmMs?: number;
}

export class ErroDeChavesIndisponiveis extends Error {
  constructor(readonly causa: unknown) {
    super('Chaves de verificação indisponíveis');
    this.name = 'ErroDeChavesIndisponiveis';
  }
}

export function criarChavesRemotas(emissor: string, opcoes: OpcoesDasChavesRemotas = {}): JWTVerifyGetKey {
  const { validadeDoCacheEmMs, limiteDeEsperaEmMs, esperaAposFalhaEmMs, idadeMaximaDoJwksVelhoEmMs } = {
    ...PADROES_DAS_CHAVES_REMOTAS,
    ...opcoes,
  };
  const ultimaBuscaComSucesso: JWKSCacheInput = {};
  const remoto = createRemoteJWKSet(new URL(`${emissor}${CAMINHO_DO_JWKS_DO_KEYCLOAK}`), {
    cooldownDuration: ESPERA_ENTRE_RECARGAS_DO_JWKS_EM_MS,
    cacheMaxAge: validadeDoCacheEmMs,
    timeoutDuration: limiteDeEsperaEmMs,
    [jwksCache]: ultimaBuscaComSucesso,
  });
  let falhouEm: number | undefined;

  const emPausaAposFalha = (): boolean => falhouEm !== undefined && Date.now() - falhouEm < esperaAposFalhaEmMs;

  const chavesVelhasUtilizaveis = (): JWTVerifyGetKey | undefined => {
    const { jwks, uat }: Partial<ExportedJWKSCache> = ultimaBuscaComSucesso;
    if (jwks === undefined || uat === undefined) return undefined;
    if (Date.now() - uat > idadeMaximaDoJwksVelhoEmMs) return undefined;
    return createLocalJWKSet(jwks);
  };

  const comChavesVelhas = async (
    cabecalho: Parameters<JWTVerifyGetKey>[0],
    token: Parameters<JWTVerifyGetKey>[1],
    causa?: unknown,
  ): Promise<Awaited<ReturnType<JWTVerifyGetKey>>> => {
    const velhas = chavesVelhasUtilizaveis();
    if (velhas === undefined) throw new ErroDeChavesIndisponiveis(causa);
    try {
      return await velhas(cabecalho, token);
    } catch (erro) {
      if (erro instanceof errors.JWKSNoMatchingKey) throw new ErroDeChavesIndisponiveis(causa ?? erro);
      throw erro;
    }
  };

  return async (cabecalho, token) => {
    if (emPausaAposFalha()) return comChavesVelhas(cabecalho, token);
    try {
      return await remoto(cabecalho, token);
    } catch (erro) {
      if (!falhouAoBuscarChaves(erro)) throw erro;
      falhouEm = Date.now();
      return comChavesVelhas(cabecalho, token, erro);
    }
  };
}

function falhouAoBuscarChaves(erro: unknown): boolean {
  return !(erro instanceof errors.JOSEError) || CODIGOS_DE_FALHA_NA_BUSCA.has(erro.code);
}
