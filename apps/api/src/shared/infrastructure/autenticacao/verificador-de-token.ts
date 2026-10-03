import { jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { IdentidadeAutenticada } from './identidade-autenticada.js';

export const CHAVES_DE_VERIFICACAO = Symbol('CHAVES_DE_VERIFICACAO');

export const TOLERANCIA_DE_RELOGIO_EM_SEGUNDOS = 5;
const TIPO_DO_ACCESS_TOKEN = 'Bearer';
const ALGORITMOS_ACEITOS = ['RS256'];
const CLAIMS_OBRIGATORIAS = ['exp', 'sub'];

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
