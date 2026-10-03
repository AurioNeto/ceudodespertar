import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createLocalJWKSet, errors, exportJWK, generateKeyPair, jwtVerify } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  AUDIENCIA_DE_TESTE,
  CASOS_DE_TOKEN_INVALIDO,
  criarChavesDeTeste,
  EMISSOR_DE_TESTE,
  emitirToken,
  KID_CONHECIDO,
  SUB_DE_TESTE,
} from './chaves-de-teste.js';
import type { ChavesDeTeste } from './chaves-de-teste.js';
import { criarChavesRemotas } from '../../src/shared/infrastructure/autenticacao/chaves-remotas.js';
import { ErroDeTokenInvalido, VerificadorDeToken } from '../../src/shared/infrastructure/autenticacao/verificador-de-token.js';

describe('VerificadorDeToken', () => {
  let chaves: ChavesDeTeste;
  let verificador: VerificadorDeToken;

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
    verificador = new VerificadorDeToken({
      emissor: EMISSOR_DE_TESTE,
      audiencia: AUDIENCIA_DE_TESTE,
      chaves: chaves.chaves,
    });
  });

  it('aceita access token válido e devolve só sub e expiração', async () => {
    const token = await emitirToken(chaves);

    const identidade = await verificador.verificar(token);

    expect(Object.keys(identidade).toSorted()).toEqual(['expiraEm', 'sub']);
    expect(identidade.sub).toBe(SUB_DE_TESTE);
  });

  it('aceita aud em lista que contém a audiência', async () => {
    const token = await emitirToken(chaves, { payload: { aud: ['account', AUDIENCIA_DE_TESTE] } });

    await expect(verificador.verificar(token)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
  });

  it('aceita expiração dentro da tolerância de relógio', async () => {
    const token = await emitirToken(chaves, { payload: { exp: Math.floor(Date.now() / 1000) - 1 } });

    await expect(verificador.verificar(token)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
  });

  it('aceita expiração três segundos no passado', async () => {
    const token = await emitirToken(chaves, { payload: { exp: Math.floor(Date.now() / 1000) - 3 } });

    await expect(verificador.verificar(token)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
  });

  it('recusa expiração dez segundos no passado', async () => {
    const token = await emitirToken(chaves, { payload: { exp: Math.floor(Date.now() / 1000) - 10 } });

    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(errors.JWTExpired);
  });

  it.each(CASOS_DE_TOKEN_INVALIDO)('recusa $nome', async ({ emitir }) => {
    const token = await emitir(chaves);

    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(Error);
  });

  it('recusa algoritmo fora de RS256 mesmo quando a chave do JWKS o permitiria', async () => {
    const par = await generateKeyPair('RS512');
    const jwkSemAlg = { ...(await exportJWK(par.publicKey)), kid: KID_CONHECIDO };
    const chavesSemAlg = createLocalJWKSet({ keys: [jwkSemAlg] });
    const token = await emitirToken(chaves, { alg: 'RS512', chave: par.privateKey });
    const verificadorSemAlg = new VerificadorDeToken({
      emissor: EMISSOR_DE_TESTE,
      audiencia: AUDIENCIA_DE_TESTE,
      chaves: chavesSemAlg,
    });

    await expect(jwtVerify(token, chavesSemAlg, { algorithms: ['RS512'] })).resolves.toBeDefined();
    await expect(verificadorSemAlg.verificar(token)).rejects.toBeInstanceOf(Error);
  });

  it('recusa ID token com ErroDeTokenInvalido e motivo explícito', async () => {
    const token = await emitirToken(chaves, { payload: { typ: 'ID' } });

    await expect(verificador.verificar(token)).rejects.toBeInstanceOf(ErroDeTokenInvalido);
  });
});

describe('criarChavesRemotas', () => {
  let servidor: Server;
  let emissor: string;
  let chaves: ChavesDeTeste;
  const caminhosPedidos: string[] = [];

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
    servidor = createServer((requisicao, resposta) => {
      caminhosPedidos.push(requisicao.url ?? '');
      if (requisicao.url === '/realms/cdd/protocol/openid-connect/certs') {
        resposta.setHeader('content-type', 'application/json');
        resposta.end(JSON.stringify(chaves.conjunto));
        return;
      }
      resposta.statusCode = 404;
      resposta.end();
    });
    await new Promise<void>((resolver) => servidor.listen(0, '127.0.0.1', resolver));
    emissor = `http://localhost:${(servidor.address() as AddressInfo).port}/realms/cdd`;
    return () => servidor.close();
  });

  it('busca o JWKS no endpoint de certificados do realm e valida o token', async () => {
    const verificador = new VerificadorDeToken({
      emissor,
      audiencia: AUDIENCIA_DE_TESTE,
      chaves: criarChavesRemotas(emissor),
    });
    const token = await emitirToken(chaves, { payload: { iss: emissor } });

    const identidade = await verificador.verificar(token);

    expect(identidade.sub).toBe(SUB_DE_TESTE);
    expect(caminhosPedidos).toContain('/realms/cdd/protocol/openid-connect/certs');
  });
});
