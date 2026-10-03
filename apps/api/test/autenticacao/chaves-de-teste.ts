import { createLocalJWKSet, exportJWK, exportSPKI, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JSONWebKeySet, JWK, JWTVerifyGetKey } from 'jose';

export const EMISSOR_DE_TESTE = 'https://idp.teste.local/realms/cdd';
export const AUDIENCIA_DE_TESTE = 'cdd-api';
export const KID_CONHECIDO = 'chave-1';
export const SUB_DE_TESTE = '7f3c2c8e-6c1f-4e0b-9a5e-1d2f3a4b5c6d';

export interface ChavesDeTeste {
  readonly privada: CryptoKey;
  readonly outraPrivada: CryptoKey;
  readonly chavePublicaPem: string;
  readonly jwk: JWK;
  readonly conjunto: JSONWebKeySet;
  readonly chaves: JWTVerifyGetKey;
}

export async function criarChavesDeTeste(): Promise<ChavesDeTeste> {
  const par = await generateKeyPair('RS256');
  const outro = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(par.publicKey)), kid: KID_CONHECIDO, alg: 'RS256', use: 'sig' };
  const conjunto: JSONWebKeySet = { keys: [jwk] };
  return {
    privada: par.privateKey,
    outraPrivada: outro.privateKey,
    chavePublicaPem: await exportSPKI(par.publicKey),
    jwk,
    conjunto,
    chaves: createLocalJWKSet(conjunto),
  };
}

export interface OpcoesDeEmissao {
  readonly chave?: CryptoKey | Uint8Array;
  readonly alg?: string;
  readonly kid?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export function payloadValido(agora = Math.floor(Date.now() / 1000)): Record<string, unknown> {
  return {
    iss: EMISSOR_DE_TESTE,
    aud: AUDIENCIA_DE_TESTE,
    sub: SUB_DE_TESTE,
    typ: 'Bearer',
    iat: agora,
    exp: agora + 300,
  };
}

export async function emitirToken(chaves: ChavesDeTeste, opcoes: OpcoesDeEmissao = {}): Promise<string> {
  const payload = { ...payloadValido(), ...opcoes.payload };
  const definidos = Object.fromEntries(Object.entries(payload).filter(([, valor]) => valor !== undefined));
  return new SignJWT(definidos)
    .setProtectedHeader({ alg: opcoes.alg ?? 'RS256', kid: opcoes.kid ?? KID_CONHECIDO, typ: 'JWT' })
    .sign(opcoes.chave ?? chaves.privada);
}

function emBase64Url(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url');
}

export function emitirTokenSemAssinatura(): string {
  return `${emBase64Url({ alg: 'none', typ: 'JWT' })}.${emBase64Url(payloadValido())}.`;
}

export interface CasoDeTokenInvalido {
  readonly nome: string;
  readonly emitir: (chaves: ChavesDeTeste) => Promise<string>;
}

export interface CasoDeRequisicaoInvalida {
  readonly nome: string;
  readonly montar: (chaves: ChavesDeTeste) => Promise<{ authorization?: string; consulta?: string }>;
}

const agora = (): number => Math.floor(Date.now() / 1000);

export const TOLERANCIA_ESPERADA_EM_SEGUNDOS = 5;

export const CASOS_DE_TOKEN_INVALIDO: readonly CasoDeTokenInvalido[] = [
  { nome: 'alg none', emitir: () => Promise.resolve(emitirTokenSemAssinatura()) },
  {
    nome: 'HS256 assinado com a chave pública como segredo',
    emitir: (chaves) =>
      emitirToken(chaves, { alg: 'HS256', chave: new TextEncoder().encode(chaves.chavePublicaPem) }),
  },
  {
    nome: 'RS256 assinado com outra chave e kid conhecido',
    emitir: (chaves) => emitirToken(chaves, { chave: chaves.outraPrivada }),
  },
  { nome: 'kid desconhecido', emitir: (chaves) => emitirToken(chaves, { kid: 'outra-kid' }) },
  {
    nome: 'iss errado',
    emitir: (chaves) =>
      emitirToken(chaves, { payload: { iss: 'https://idp.teste.local/realms/outro' } }),
  },
  {
    nome: 'iss com barra final',
    emitir: (chaves) => emitirToken(chaves, { payload: { iss: `${EMISSOR_DE_TESTE}/` } }),
  },
  { nome: 'aud errado', emitir: (chaves) => emitirToken(chaves, { payload: { aud: 'cdd-web' } }) },
  { nome: 'aud ausente', emitir: (chaves) => emitirToken(chaves, { payload: { aud: undefined } }) },
  {
    nome: 'ID token (typ ID)',
    emitir: (chaves) => emitirToken(chaves, { payload: { typ: 'ID' } }),
  },
  { nome: 'typ ausente', emitir: (chaves) => emitirToken(chaves, { payload: { typ: undefined } }) },
  {
    nome: 'expirado há uma hora',
    emitir: (chaves) =>
      emitirToken(chaves, { payload: { iat: agora() - 3900, exp: agora() - 3600 } }),
  },
  {
    nome: 'expirado além da tolerância',
    emitir: (chaves) =>
      emitirToken(chaves, { payload: { exp: agora() - TOLERANCIA_ESPERADA_EM_SEGUNDOS - 30 } }),
  },
  { nome: 'sem exp', emitir: (chaves) => emitirToken(chaves, { payload: { exp: undefined } }) },
  {
    nome: 'nbf no futuro',
    emitir: (chaves) => emitirToken(chaves, { payload: { nbf: agora() + 3600 } }),
  },
  { nome: 'sem sub', emitir: (chaves) => emitirToken(chaves, { payload: { sub: undefined } }) },
  { nome: 'sub vazio', emitir: (chaves) => emitirToken(chaves, { payload: { sub: '' } }) },
  { nome: 'malformado sem pontos', emitir: () => Promise.resolve('abc') },
  { nome: 'malformado com três partes inválidas', emitir: () => Promise.resolve('a.b.c') },
];

export const CASOS_DE_REQUISICAO_INVALIDA: readonly CasoDeRequisicaoInvalida[] = [
  { nome: 'sem cabeçalho Authorization', montar: () => Promise.resolve({}) },
  { nome: 'cabeçalho Authorization vazio', montar: () => Promise.resolve({ authorization: '' }) },
  { nome: 'Bearer sem token', montar: () => Promise.resolve({ authorization: 'Bearer ' }) },
  {
    nome: 'esquema Basic',
    montar: async (chaves) => ({ authorization: `Basic ${await emitirToken(chaves)}` }),
  },
  {
    nome: 'token cru sem esquema',
    montar: async (chaves) => ({ authorization: await emitirToken(chaves) }),
  },
  {
    nome: 'token válido apenas na query string',
    montar: async (chaves) => ({ consulta: `?access_token=${await emitirToken(chaves)}` }),
  },
];
