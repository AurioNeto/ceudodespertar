import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarAplicacao, PREFIXO_GLOBAL, ROTAS_FORA_DO_PREFIXO } from '../../../src/composicao/aplicacao.js';
import { AppModule } from '../../../src/composicao/app.module.js';
import { descobrirRotas, rotasRegistradasNoExpress } from './descobrir-rotas.js';
import type { Descoberta } from './descobrir-rotas.js';
import { PISO_DE_ROTAS, ROTA_DE_ATIVACAO_DO_CONVITE, ROTA_DE_USUARIO_ATIVO, ROTAS_SEM_PERMISSAO } from './politica-de-rotas.js';
import { verificarRotas } from './verificar-rotas.js';

describe('T30 — rotas reais da aplicação', () => {
  let app: INestApplication;
  let descoberta: Descoberta;

  beforeAll(async () => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('BANCO_URL', 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd');
    vi.stubEnv('BANCO_POOL_MAXIMO', '1');
    vi.stubEnv('LOG_NIVEL', 'fatal');
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    app = await criarAplicacao(AppModule);
    await app.init();
    descoberta = descobrirRotas(
      app.get(DiscoveryService),
      app.get(MetadataScanner),
      app.get(Reflector),
      { prefixoGlobal: PREFIXO_GLOBAL, foraDoPrefixo: ROTAS_FORA_DO_PREFIXO },
    );
  });

  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('todas as rotas — verificação das regras de acesso — não encontra violação', () => {
    const violacoes = verificarRotas(descoberta, {
      rotasSemPermissao: ROTAS_SEM_PERMISSAO,
      rotaDeUsuarioAtivo: ROTA_DE_USUARIO_ATIVO,
      pisoDeRotas: PISO_DE_ROTAS,
      rotasObrigatorias: [ROTA_DE_USUARIO_ATIVO, ROTA_DE_ATIVACAO_DO_CONVITE],
    });

    expect(violacoes).toEqual([]);
  });

  it('rotas registradas no Express — comparação com a descoberta — são as mesmas', () => {
    const idsDescobertos = descoberta.rotas.map((rota) => rota.id).toSorted();

    const registradas = rotasRegistradasNoExpress(app, { prefixoGlobal: PREFIXO_GLOBAL, foraDoPrefixo: ROTAS_FORA_DO_PREFIXO });

    expect(registradas.toSorted()).toEqual(idsDescobertos);
  });

  it('exceções da tabela — comparação com a descoberta — cada uma tem a rota com a mesma marca', () => {
    const semRota = ROTAS_SEM_PERMISSAO.filter(
      (excecao) =>
        !descoberta.rotas.some(
          (rota) =>
            rota.metodoHttp === excecao.metodo &&
            rota.caminho === excecao.caminho &&
            rota.marcas.length === 1 &&
            rota.marcas[0]!.tipo === excecao.marca,
        ),
    );

    expect(semRota).toEqual([]);
  });

  it('rotas de saúde — caminho descoberto — ficam fora do prefixo global', () => {
    const ids = descoberta.rotas.map((rota) => rota.id);

    expect(ids).toEqual(expect.arrayContaining(['GET /saude/viva', 'GET /saude/pronta']));
  });
});
