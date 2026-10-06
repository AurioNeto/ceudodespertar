import type { AddressInfo } from 'node:net';
import { Controller, Get, Module } from '@nestjs/common';
import type { DynamicModule, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AutenticacaoModule } from '../../src/shared/infrastructure/autenticacao/autenticacao.module.js';
import { criarChavesRemotas } from '../../src/shared/infrastructure/autenticacao/chaves-remotas.js';
import { ResolvedorDeContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { ApenasUsuarioAtivo } from '../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { CHAVES_DE_VERIFICACAO } from '../../src/shared/infrastructure/autenticacao/verificador-de-token.js';
import { AMBIENTE } from '../../src/shared/infrastructure/configuracao/esquema-de-ambiente.js';
import { FiltroDeErrosModule } from '../../src/shared/infrastructure/http/filtro-de-erros.module.js';
import { CABECALHO_DE_CORRELACAO, middlewareDeCorrelacao } from '../../src/shared/infrastructure/log/correlacao.js';
import { SaudeController } from '../../src/shared/infrastructure/saude/saude.controller.js';
import { VerificadorDeProntidao } from '../../src/shared/infrastructure/saude/verificador-de-prontidao.js';
import { AUDIENCIA_DE_TESTE, criarChavesDeTeste, emitirToken } from './chaves-de-teste.js';
import type { ChavesDeTeste } from './chaves-de-teste.js';
import { pedir } from './cliente-http.js';
import { ResolvedorDeContextoDeAcessoFake } from './resolvedor-de-contexto-de-acesso-fake.js';
import { ServidorDeJwks } from './servidor-de-jwks.js';

@ApenasUsuarioAtivo()
@Controller('protegida')
class RotaProtegidaController {
  @Get()
  rota(): { ok: true } {
    return { ok: true };
  }
}

const PRONTIDAO_SEMPRE_PRONTA = { verificar: () => Promise.resolve({ pronta: true }) };
const LIMITE_DE_ESPERA_DO_PROVEDOR_EM_MS = 250;

@Module({})
class AmbienteDeTesteModule {
  static com(emissor: string): DynamicModule {
    return {
      module: AmbienteDeTesteModule,
      global: true,
      providers: [{ provide: AMBIENTE, useValue: { OIDC_EMISSOR: emissor, OIDC_AUDIENCIA: AUDIENCIA_DE_TESTE } }],
      exports: [AMBIENTE],
    };
  }
}

@Module({
  imports: [FiltroDeErrosModule],
  controllers: [SaudeController, RotaProtegidaController],
  providers: [{ provide: VerificadorDeProntidao, useValue: PRONTIDAO_SEMPRE_PRONTA }],
})
class RotasDeTesteModule {}

describe('guarda de acesso com filtro global de erros', () => {
  let chaves: ChavesDeTeste;
  let servidor: ServidorDeJwks;
  let fake: ResolvedorDeContextoDeAcessoFake;
  let app: INestApplication;
  let origem: string;

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
  });

  beforeEach(async () => {
    servidor = new ServidorDeJwks(chaves.conjunto);
    await servidor.iniciar();
    fake = new ResolvedorDeContextoDeAcessoFake();
    const modulo = await Test.createTestingModule({
      imports: [AmbienteDeTesteModule.com(servidor.emissor), AutenticacaoModule, RotasDeTesteModule],
    })
      .overrideProvider(CHAVES_DE_VERIFICACAO)
      .useValue(criarChavesRemotas(servidor.emissor, { limiteDeEsperaEmMs: LIMITE_DE_ESPERA_DO_PROVEDOR_EM_MS }))
      .overrideProvider(ResolvedorDeContextoDeAcesso)
      .useValue(fake)
      .compile();
    app = modulo.createNestApplication();
    app.use(middlewareDeCorrelacao);
    await app.listen(0, '127.0.0.1');
    origem = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await app.close();
    await servidor.derrubar();
  });

  const pedirAutenticado = async (): Promise<Response> => {
    const token = await emitirToken(chaves, { payload: { iss: servidor.emissor } });
    return pedir(origem, '/protegida', { authorization: `Bearer ${token}` });
  };

  const lerErro = async (resposta: Response): Promise<{ erro: string; correlacaoId: string }> => {
    const corpo = (await resposta.json()) as { erro: string; correlacaoId: string };
    expect(corpo.correlacaoId).not.toBe('');
    expect(corpo.correlacaoId).toBe(resposta.headers.get(CABECALHO_DE_CORRELACAO));
    return corpo;
  };

  it('usuário suspenso responde 401 USUARIO_SUSPENSO', async () => {
    fake.recusarCom('USUARIO_SUSPENSO');

    const resposta = await pedirAutenticado();

    expect(resposta.status).toBe(401);
    expect((await lerErro(resposta)).erro).toBe('USUARIO_SUSPENSO');
  });

  it('usuário desconhecido responde 401 USUARIO_DESCONHECIDO', async () => {
    fake.recusarCom('USUARIO_DESCONHECIDO');

    const resposta = await pedirAutenticado();

    expect(resposta.status).toBe(401);
    expect((await lerErro(resposta)).erro).toBe('USUARIO_DESCONHECIDO');
  });

  it('provedor de identidade indisponível responde 503 PROVEDOR_DE_IDENTIDADE_INDISPONIVEL', async () => {
    servidor.modo = 'indisponivel';

    const resposta = await pedirAutenticado();

    expect(resposta.status).toBe(503);
    expect((await lerErro(resposta)).erro).toBe('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL');
  });

  it('sem token responde 401 NAO_AUTENTICADO', async () => {
    const resposta = await pedir(origem, '/protegida');

    expect(resposta.status).toBe(401);
    expect((await lerErro(resposta)).erro).toBe('NAO_AUTENTICADO');
  });

  it('as rotas de saúde seguem acessíveis sem token', async () => {
    const viva = await pedir(origem, '/saude/viva');
    const pronta = await pedir(origem, '/saude/pronta');

    expect(viva.status).toBe(200);
    expect(pronta.status).toBe(200);
    expect(await pronta.json()).toEqual({ status: 'pronta' });
  });
});
