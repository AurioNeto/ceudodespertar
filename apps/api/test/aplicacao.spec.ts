import type { AddressInfo } from 'node:net';
import { Controller, Get, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarAplicacao } from '../src/composicao/aplicacao.js';
import { AppModule } from '../src/composicao/app.module.js';
import { ApenasIdentificado, Publico } from '../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';

interface EstadoDaSonda {
  status: 'ok';
}

@Publico()
@Controller('sonda')
class SondaController {
  @Get()
  pingar(): EstadoDaSonda {
    return { status: 'ok' };
  }
}

@ApenasIdentificado()
@Controller('sonda-fechada')
class SondaFechadaController {
  @Get()
  pingar(): EstadoDaSonda {
    return { status: 'ok' };
  }
}

@Module({
  imports: [AppModule],
  controllers: [SondaController, SondaFechadaController],
})
class AppModuloComSonda {}

describe('esqueleto da API', () => {
  let app: INestApplication;
  let origem: string;

  beforeAll(async () => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('BANCO_URL', 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd');
    vi.stubEnv('BANCO_POOL_MAXIMO', '1');
    vi.stubEnv('LOG_NIVEL', 'fatal');
    app = await criarAplicacao(AppModuloComSonda);
    await app.listen(0, '127.0.0.1');
    const endereco = app.getHttpServer().address() as AddressInfo;
    origem = `http://127.0.0.1:${endereco.port}`;
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('GET /saude/viva responde 200 fora do prefixo /api/v1', async () => {
    const resposta = await fetch(`${origem}/saude/viva`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: 'viva' });
  });

  it('GET /api/v1/saude/viva responde 404 porque a rota fica fora do prefixo', async () => {
    const resposta = await fetch(`${origem}/api/v1/saude/viva`);

    expect(resposta.status).toBe(404);
  });

  it('GET /api/v1/sonda responde 200 porque a rota está sob o prefixo', async () => {
    const resposta = await fetch(`${origem}/api/v1/sonda`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: 'ok' });
  });

  it('GET /sonda responde 404 porque falta o prefixo', async () => {
    const resposta = await fetch(`${origem}/sonda`);

    expect(resposta.status).toBe(404);
  });

  it('rota inexistente sob /api/v1 responde 404', async () => {
    const resposta = await fetch(`${origem}/api/v1/qualquer-coisa`);

    expect(resposta.status).toBe(404);
  });

  it('a guarda global está ativa: rota identificada sem token responde 401 com desafio Bearer', async () => {
    const resposta = await fetch(`${origem}/api/v1/sonda-fechada`);

    expect(resposta.status).toBe(401);
    expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
    expect(await resposta.json()).toEqual({ erro: 'NAO_AUTENTICADO', correlacaoId: '' });
  });
});
