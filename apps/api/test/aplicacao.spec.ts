import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarAplicacao } from '../src/main.js';

describe('esqueleto da API', () => {
  let app: INestApplication;
  let origem: string;

  beforeAll(async () => {
    app = await criarAplicacao();
    await app.listen(0);
    const endereco = app.getHttpServer().address() as AddressInfo;
    origem = `http://127.0.0.1:${endereco.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /saude/viva responde 200 fora do prefixo /api/v1', async () => {
    const resposta = await fetch(`${origem}/saude/viva`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: 'viva' });
  });

  it('rota inexistente sob /api/v1 responde 404', async () => {
    const resposta = await fetch(`${origem}/api/v1/qualquer-coisa`);

    expect(resposta.status).toBe(404);
  });
});
