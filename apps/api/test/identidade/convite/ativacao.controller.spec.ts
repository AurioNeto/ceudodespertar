import type { AddressInfo } from 'node:net';
import { Module } from '@nestjs/common';
import type { DynamicModule, INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { CodigoDeErro } from '@cdd/contracts';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AtivarConvite } from '../../../src/modules/identidade/application/convite/ativar-convite.js';
import type { ComandoDeAtivacao } from '../../../src/modules/identidade/application/convite/ativar-convite.js';
import { ObterEu } from '../../../src/modules/identidade/application/obter-eu.js';
import { EuController } from '../../../src/modules/identidade/interface/http/eu.controller.js';
import { AutenticacaoModule } from '../../../src/shared/infrastructure/autenticacao/autenticacao.module.js';
import { criarChavesRemotas } from '../../../src/shared/infrastructure/autenticacao/chaves-remotas.js';
import { ResolvedorDeContextoDeAcesso } from '../../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { CHAVES_DE_VERIFICACAO } from '../../../src/shared/infrastructure/autenticacao/verificador-de-token.js';
import { UnidadeDeTrabalho } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { AMBIENTE } from '../../../src/shared/infrastructure/configuracao/esquema-de-ambiente.js';
import { BordaTransacionalInterceptor } from '../../../src/shared/infrastructure/http/borda-transacional.interceptor.js';
import { FiltroDeErrosModule } from '../../../src/shared/infrastructure/http/filtro-de-erros.module.js';
import { ProvedorDeContextoDeInstituicao } from '../../../src/shared/infrastructure/http/provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicaoDoAcesso } from '../../../src/shared/infrastructure/http/provedor-de-contexto-de-instituicao.do-acesso.js';
import { NOME_DO_CABECALHO_DE_IDEMPOTENCIA } from '../../../src/shared/infrastructure/idempotencia/cabecalho-de-idempotencia.js';
import { IdempotenciaInterceptor } from '../../../src/shared/infrastructure/idempotencia/idempotencia.interceptor.js';
import { middlewareDeCorrelacao } from '../../../src/shared/infrastructure/log/correlacao.js';
import { erroDeDominio, ErroDeDominioException } from '../../../src/shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../src/shared/kernel/erro-de-dominio.js';
import { err, ok } from '../../../src/shared/kernel/result.js';
import type { Result } from '../../../src/shared/kernel/result.js';
import { AUDIENCIA_DE_TESTE, criarChavesDeTeste, emitirToken } from '../../autenticacao/chaves-de-teste.js';
import type { ChavesDeTeste } from '../../autenticacao/chaves-de-teste.js';
import { pedir } from '../../autenticacao/cliente-http.js';
import { ResolvedorDeContextoDeAcessoFake } from '../../autenticacao/resolvedor-de-contexto-de-acesso-fake.js';
import { ServidorDeJwks } from '../../autenticacao/servidor-de-jwks.js';

const ROTA = '/eu/ativacao';
const SUJEITO = 'sub-do-token';
const CONVITE = 'aB3_-'.repeat(8) + 'aB3';

class AtivarConviteRoteirizado {
  readonly comandos: ComandoDeAtivacao[] = [];
  desfecho: () => Promise<Result<{ situacao: 'ATIVO' }, ErroDeDominio>> = () => Promise.resolve(ok({ situacao: 'ATIVO' }));

  executar(comando: ComandoDeAtivacao): Promise<Result<{ situacao: 'ATIVO' }, ErroDeDominio>> {
    this.comandos.push(comando);
    return this.desfecho();
  }
}

class UnidadeDeTrabalhoProibida extends UnidadeDeTrabalho {
  aberturas = 0;

  transacao<T>(): Promise<T> {
    this.aberturas += 1;
    return Promise.reject(new Error('a rota não pode abrir transação na borda'));
  }
}

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

describe('POST /eu/ativacao — controller com a borda e a idempotência reais', () => {
  let chaves: ChavesDeTeste;
  let servidor: ServidorDeJwks;
  let ativar: AtivarConviteRoteirizado;
  let unidade: UnidadeDeTrabalhoProibida;
  let resolvedor: ResolvedorDeContextoDeAcessoFake;
  let app: INestApplication;
  let origem: string;

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
  });

  beforeEach(async () => {
    servidor = new ServidorDeJwks(chaves.conjunto);
    await servidor.iniciar();
    ativar = new AtivarConviteRoteirizado();
    unidade = new UnidadeDeTrabalhoProibida();
    resolvedor = new ResolvedorDeContextoDeAcessoFake();
    const modulo = await Test.createTestingModule({
      imports: [AmbienteDeTesteModule.com(servidor.emissor), AutenticacaoModule, FiltroDeErrosModule, RotasDoEu],
    })
      .overrideProvider(CHAVES_DE_VERIFICACAO)
      .useValue(criarChavesRemotas(servidor.emissor, { limiteDeEsperaEmMs: 250 }))
      .overrideProvider(ResolvedorDeContextoDeAcesso)
      .useValue(resolvedor)
      .overrideProvider(AtivarConvite)
      .useValue(ativar)
      .overrideProvider(UnidadeDeTrabalho)
      .useValue(unidade)
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

  async function ativarComo(
    corpo: unknown = { convite: CONVITE },
    cabecalhos: Record<string, string> = {},
  ): Promise<Response> {
    const token = await emitirToken(chaves, { payload: { iss: servidor.emissor, sub: SUJEITO } });
    return pedir(origem, ROTA, { authorization: `Bearer ${token}`, ...cabecalhos }, { metodo: 'POST', corpo });
  }

  it('sucesso responde 200 com a situação ATIVO e entrega ao caso de uso o token do corpo e o sub do bearer', async () => {
    const resposta = await ativarComo();

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ situacao: 'ATIVO' });
    expect(ativar.comandos).toEqual([{ token: CONVITE, sujeito: SUJEITO }]);
  });

  it('com Idempotency-Key presente responde 200, não 500, e nunca abre transação na borda', async () => {
    const resposta = await ativarComo({ convite: CONVITE }, { [NOME_DO_CABECALHO_DE_IDEMPOTENCIA]: 'chave-do-front-0001' });

    expect(resposta.status).toBe(200);
    expect(unidade.aberturas).toBe(0);
  });

  it('a rota é só identificada: não consulta o resolvedor de acesso, mesmo com usuário desconhecido', async () => {
    resolvedor.recusarCom('USUARIO_DESCONHECIDO');

    expect((await ativarComo()).status).toBe(200);
    expect(resolvedor.identidadesResolvidas).toEqual([]);
  });

  it.each([
    ['CONVITE_INVALIDO', 400],
    ['CONVITE_EXPIRADO', 410],
    ['CONVITE_JA_USADO', 409],
    ['USUARIO_SUSPENSO', 401],
    ['USUARIO_REVOGADO', 401],
    ['SUJEITO_JA_VINCULADO', 409],
    ['CONVITE_DE_OUTRO_SUJEITO', 403],
    ['PROVEDOR_DE_IDENTIDADE_INDISPONIVEL', 503],
    ['VERSAO_DESATUALIZADA', 409],
  ] as const satisfies ReadonlyArray<readonly [CodigoDeErro, number]>)(
    'Result de erro %s sai como %d com o código no corpo, nunca como 200',
    async (codigo, status) => {
      ativar.desfecho = () => Promise.resolve(err(erroDeDominio(codigo)));

      const resposta = await ativarComo();

      expect(resposta.status).not.toBe(200);
      expect(resposta.status).toBe(status);
      expect(((await resposta.json()) as { erro: string }).erro).toBe(codigo);
    },
  );

  it('exceção de domínio lançada pelo caso de uso também sai com o código e o status do catálogo', async () => {
    ativar.desfecho = () => Promise.reject(new ErroDeDominioException(erroDeDominio('SUJEITO_JA_VINCULADO')));

    const resposta = await ativarComo();

    expect(resposta.status).toBe(409);
    expect(((await resposta.json()) as { erro: string }).erro).toBe('SUJEITO_JA_VINCULADO');
  });

  it.each([
    ['nulo', null],
    ['sem o campo convite', {}],
    ['com o nome antigo token', { token: CONVITE }],
    ['token curto', { convite: CONVITE.slice(1) }],
    ['token longo', { convite: `${CONVITE}a` }],
    ['token fora do alfabeto', { convite: `${CONVITE.slice(1)}+` }],
    ['token que não é texto', { convite: 12345 }],
  ])('corpo %s responde 400 CORPO_INVALIDO sem chamar o caso de uso', async (_descricao, corpo) => {
    const resposta = await ativarComo(corpo);

    expect(resposta.status).toBe(400);
    expect(((await resposta.json()) as { erro: string }).erro).toBe('CORPO_INVALIDO');
    expect(ativar.comandos).toEqual([]);
  });

  it('sem bearer responde 401 NAO_AUTENTICADO sem chamar o caso de uso', async () => {
    const resposta = await pedir(origem, ROTA, {}, { metodo: 'POST', corpo: { convite: CONVITE } });

    expect(resposta.status).toBe(401);
    expect(((await resposta.json()) as { erro: string }).erro).toBe('NAO_AUTENTICADO');
    expect(ativar.comandos).toEqual([]);
  });
});

@Module({
  controllers: [EuController],
  providers: [
    { provide: ObterEu, useValue: {} },
    AtivarConvite,
    { provide: UnidadeDeTrabalho, useValue: {} },
    { provide: ProvedorDeContextoDeInstituicao, useClass: ProvedorDeContextoDeInstituicaoDoAcesso },
    { provide: APP_INTERCEPTOR, useClass: BordaTransacionalInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotenciaInterceptor },
  ],
})
class RotasDoEu {}
