import { Controller, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../src/composicao/app.module.js';
import { ModoDeTransacao } from '../../src/shared/infrastructure/http/modo-de-transacao.decorator.js';
import { SemIdempotencia } from '../../src/shared/infrastructure/idempotencia/sem-idempotencia.decorator.js';
import { ErroDeSemIdempotenciaEmRotaComInstituicao } from '../../src/shared/infrastructure/idempotencia/verificador-de-sem-idempotencia-das-rotas.js';
import { RequerPermissao } from '../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ErroDeRotaQueMudaEstadoSemModoGravavel } from '../../src/shared/infrastructure/http/verificador-de-modo-de-transacao-das-rotas.js';

@Controller('rota-de-escrita-sem-modo')
class RotaDeEscritaSemModoController {
  @RequerPermissao('financeiro.lancamento.registrar')
  @Post()
  criar(): void {}
}

@Controller('rota-sem-idempotencia-com-permissao')
class RotaSemIdempotenciaComPermissaoController {
  @RequerPermissao('financeiro.lancamento.registrar')
  @ModoDeTransacao('escrita')
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@Module({ imports: [AppModule], controllers: [RotaDeEscritaSemModoController] })
class AppComRotaSemModo {}

@Module({ imports: [AppModule], controllers: [RotaSemIdempotenciaComPermissaoController] })
class AppComRotaSemIdempotenciaComPermissao {}

describe('partida da aplicação real', () => {
  beforeAll(() => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('BANCO_URL', 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd');
    vi.stubEnv('BANCO_POOL_MAXIMO', '1');
    vi.stubEnv('LOG_NIVEL', 'fatal');
    vi.useFakeTimers({ toFake: ['setInterval'] });
  });

  afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('recusa partir quando uma rota POST não declara modo de transação gravável', async () => {
    const modulo = await Test.createTestingModule({ imports: [AppComRotaSemModo] }).compile();

    const falha = await modulo.init().then(
      () => undefined,
      (erro: unknown) => erro,
    );

    expect(falha).toBeInstanceOf(ErroDeRotaQueMudaEstadoSemModoGravavel);
    expect((falha as Error).message).toContain('RotaDeEscritaSemModoController.criar (POST)');
  });

  it('recusa partir quando uma rota com permissão é marcada como sem idempotência', async () => {
    const modulo = await Test.createTestingModule({ imports: [AppComRotaSemIdempotenciaComPermissao] }).compile();

    const falha = await modulo.init().then(
      () => undefined,
      (erro: unknown) => erro,
    );

    expect(falha).toBeInstanceOf(ErroDeSemIdempotenciaEmRotaComInstituicao);
    expect((falha as Error).message).toContain('RotaSemIdempotenciaComPermissaoController.criar');
  });
});
