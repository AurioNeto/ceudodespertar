import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { IdentidadeAutenticada } from './identidade-autenticada.js';

export const CHAVES_DE_VERIFICACAO = Symbol('CHAVES_DE_VERIFICACAO');

export const TOLERANCIA_DE_RELOGIO_EM_SEGUNDOS = 5;
const CAMINHO_DO_JWKS_DO_KEYCLOAK = '/protocol/openid-connect/certs';
const TIPO_DO_ACCESS_TOKEN = 'Bearer';
const ALGORITMOS_ACEITOS = ['RS256'];
const CLAIMS_OBRIGATORIAS = ['exp', 'sub'];
const ESPERA_ENTRE_RECARGAS_DO_JWKS_EM_MS = 30_000;
const VALIDADE_DO_CACHE_DO_JWKS_EM_MS = 600_000;
const LIMITE_DE_ESPERA_DO_JWKS_EM_MS = 5_000;

export class ErroDeTokenInvalido extends Error {
  constructor(readonly motivo: string) {
    super(motivo);
    this.name = 'ErroDeTokenInvalido';
  }
}

export interface OpcoesDoVerificador {
  readonly emissor: string;
  readonly audiencia: string;
  readonly chaves: JWTVerifyGetKey;
}

export function criarChavesRemotas(emissor: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`${emissor}${CAMINHO_DO_JWKS_DO_KEYCLOAK}`), {
    cooldownDuration: ESPERA_ENTRE_RECARGAS_DO_JWKS_EM_MS,
    cacheMaxAge: VALIDADE_DO_CACHE_DO_JWKS_EM_MS,
    timeoutDuration: LIMITE_DE_ESPERA_DO_JWKS_EM_MS,
  });
}

export class VerificadorDeToken {
  constructor(private readonly opcoes: OpcoesDoVerificador) {}

  async verificar(token: string): Promise<IdentidadeAutenticada> {
    const { payload } = await jwtVerify(token, this.opcoes.chaves, {
      algorithms: ALGORITMOS_ACEITOS,
      issuer: this.opcoes.emissor,
      audience: this.opcoes.audiencia,
      requiredClaims: CLAIMS_OBRIGATORIAS,
      clockTolerance: TOLERANCIA_DE_RELOGIO_EM_SEGUNDOS,
    });
    if (payload['typ'] !== TIPO_DO_ACCESS_TOKEN) {
      throw new ErroDeTokenInvalido('typ diferente de Bearer');
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || typeof payload.exp !== 'number') {
      throw new ErroDeTokenInvalido('sub ou exp ausente');
    }
    return { sub: payload.sub, expiraEm: payload.exp };
  }
}
