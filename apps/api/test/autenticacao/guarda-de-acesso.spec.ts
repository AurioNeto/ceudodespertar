import type { AddressInfo } from 'node:net';
import { Controller, Get, Logger, Module } from '@nestjs/common';
import type { DynamicModule, INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { JWTVerifyGetKey } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutenticacaoModule } from '../../src/shared/infrastructure/autenticacao/autenticacao.module.js';
import { criarChavesRemotas } from '../../src/shared/infrastructure/autenticacao/chaves-remotas.js';
import { ResolvedorDeContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { ContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { IdentidadeAutenticada } from '../../src/shared/infrastructure/autenticacao/identidade-autenticada.js';
import {
  ApenasIdentificado,
  ApenasUsuarioAtivo,
  Publico,
  RequerAlgumaPermissao,
  RequerPermissao,
} from '../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual, IdentidadeAtual } from '../../src/shared/infrastructure/autenticacao/requisicao-autenticada.js';
import { CHAVES_DE_VERIFICACAO } from '../../src/shared/infrastructure/autenticacao/verificador-de-token.js';
import { AMBIENTE } from '../../src/shared/infrastructure/configuracao/esquema-de-ambiente.js';
import {
  AUDIENCIA_DE_TESTE,
  CASOS_DE_REQUISICAO_INVALIDA,
  CASOS_DE_TOKEN_INVALIDO,
  criarChavesDeTeste,
  EMISSOR_DE_TESTE,
  emitirToken,
  emitirTokenComCritForjado,
  SUB_DE_TESTE,
} from './chaves-de-teste.js';
import type { ChavesDeTeste } from './chaves-de-teste.js';
import { pedir as pedirA } from './cliente-http.js';
import {
  INSTITUICAO_DE_TESTE,
  ResolvedorDeContextoDeAcessoFake,
  USUARIO_DE_TESTE,
} from './resolvedor-de-contexto-de-acesso-fake.js';
import { ServidorDeJwks } from './servidor-de-jwks.js';

@Controller('sem-marca')
class SemMarcaController {
  @Get()
  rota(): string {
    return 'x';
  }

  @Get('outra')
  outra(): string {
    return 'x';
  }
}

@Controller('duas-marcas')
class DuasMarcasController {
  @Publico()
  @ApenasIdentificado()
  @Get()
  rota(): string {
    return 'x';
  }
}

@Controller('publico')
class PublicoController {
  @Publico()
  @Get()
  rota(): { ok: true } {
    return { ok: true };
  }
}

@Controller('identificado')
class IdentificadoController {
  @ApenasIdentificado()
  @Get()
  rota(@IdentidadeAtual() identidade: IdentidadeAutenticada | undefined): IdentidadeAutenticada | undefined {
    return identidade;
  }
}

@Controller('usuario-ativo')
class UsuarioAtivoController {
  @ApenasUsuarioAtivo()
  @Get()
  rota(@ContextoAtual() contexto: ContextoDeAcesso | undefined): { usuarioId?: string; permissoes?: number } {
    return { usuarioId: contexto?.usuarioId, permissoes: contexto?.permissoes.size };
  }
}

@Controller('permissao')
class PermissaoController {
  @RequerPermissao('financeiro.periodo.fechar')
  @Get()
  rota(@ContextoAtual() contexto: ContextoDeAcesso | undefined): { usuarioId?: string; instituicaoId?: string } {
    return { usuarioId: contexto?.usuarioId, instituicaoId: contexto?.instituicaoId };
  }
}

@Controller('alguma')
class AlgumaController {
  @RequerAlgumaPermissao('financeiro.lancamento.ler', 'financeiro.lancamento.ler_proprios')
  @Get()
  rota(): { ok: true } {
    return { ok: true };
  }
}

@ApenasIdentificado()
@Controller('classe-identificada')
class ClasseIdentificadaController {
  @Get('herda')
  herda(): { ok: true } {
    return { ok: true };
  }

  @Publico()
  @Get('metodo-publico')
  metodoPublico(): { ok: true } {
    return { ok: true };
  }

  @RequerPermissao('financeiro.periodo.fechar')
  @Get('metodo-exige')
  metodoExige(): { ok: true } {
    return { ok: true };
  }
}

@Controller('filho-sem-marca-propria')
class FilhoSemMarcaPropriaController extends ClasseIdentificadaController {}

@Publico()
@ApenasIdentificado()
@Controller('classe-duas-marcas')
class ClasseDuasMarcasController {
  @Get('sem-marca-no-metodo')
  semMarcaNoMetodo(): { ok: true } {
    return { ok: true };
  }

  @Publico()
  @Get('metodo-decide')
  metodoDecide(): { ok: true } {
    return { ok: true };
  }
}

@Controller('metodo-duas-marcas-sob-classe-valida')
@Publico()
class MetodoDuasMarcasController {
  @ApenasIdentificado()
  @RequerPermissao('financeiro.periodo.fechar')
  @Get()
  rota(): { ok: true } {
    return { ok: true };
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

const CONTROLLERS: Type[] = [
  SemMarcaController,
  DuasMarcasController,
  PublicoController,
  IdentificadoController,
  UsuarioAtivoController,
  PermissaoController,
  AlgumaController,
  ClasseIdentificadaController,
  FilhoSemMarcaPropriaController,
  ClasseDuasMarcasController,
  MetodoDuasMarcasController,
];

interface AplicacaoDeTeste {
  readonly app: INestApplication;
  readonly origem: string;
}

interface OpcoesDaAplicacao {
  readonly emissor?: string;
  readonly chavesDeVerificacao?: JWTVerifyGetKey;
}

async function subirAplicacao(
  chaves: ChavesDeTeste,
  resolvedor?: ResolvedorDeContextoDeAcesso,
  opcoes: OpcoesDaAplicacao = {},
): Promise<AplicacaoDeTeste> {
  let construtor = Test.createTestingModule({
    imports: [AmbienteDeTesteModule.com(opcoes.emissor ?? EMISSOR_DE_TESTE), AutenticacaoModule],
    controllers: CONTROLLERS,
  })
    .overrideProvider(CHAVES_DE_VERIFICACAO)
    .useValue(opcoes.chavesDeVerificacao ?? chaves.chaves);
  if (resolvedor !== undefined) {
    construtor = construtor.overrideProvider(ResolvedorDeContextoDeAcesso).useValue(resolvedor);
  }
  const modulo = await construtor.compile();
  const app = modulo.createNestApplication();
  await app.listen(0, '127.0.0.1');
  const origem = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  return { app, origem };
}

type NivelDeLog = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';
const NIVEIS_DE_LOG: readonly NivelDeLog[] = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'];

function capturarLogs(): { linhas: (nivel?: NivelDeLog) => string[] } {
  const espioes = NIVEIS_DE_LOG.map((nivel) => [nivel, vi.spyOn(Logger.prototype, nivel).mockImplementation(() => undefined)] as const);
  return {
    linhas: (nivel) =>
      espioes
        .filter(([doNivel]) => nivel === undefined || doNivel === nivel)
        .flatMap(([, espiao]) => espiao.mock.calls.map((chamada) => chamada.map(String).join(' '))),
  };
}

async function bearer(chaves: ChavesDeTeste, payload: Record<string, unknown> = {}): Promise<Record<string, string>> {
  return { authorization: `Bearer ${await emitirToken(chaves, { payload })}` };
}

describe('guarda de acesso', () => {
  let chaves: ChavesDeTeste;
  let fake: ResolvedorDeContextoDeAcessoFake;
  let aplicacao: AplicacaoDeTeste;

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
  });

  beforeEach(async () => {
    fake = new ResolvedorDeContextoDeAcessoFake();
    aplicacao = await subirAplicacao(chaves, fake);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await aplicacao.app.close();
  });

  const pedir = (caminho: string, cabecalhos: Record<string, string> = {}): Promise<Response> =>
    pedirA(aplicacao.origem, caminho, cabecalhos);

  describe('marcas de acesso', () => {
    it('rota sem marca responde 500 fail-closed, mesmo sem credencial', async () => {
      const resposta = await pedir('/sem-marca');

      expect(resposta.status).toBe(500);
      expect(await resposta.json()).toEqual({ erro: 'ERRO_INTERNO', correlacaoId: '' });
    });

    it('controller sem nenhum método marcado responde 500 em todos os métodos, mesmo com token e permissão', async () => {
      fake.concederPermissoes('financeiro.periodo.fechar');
      const credencial = await bearer(chaves);

      expect((await pedir('/sem-marca', credencial)).status).toBe(500);
      expect((await pedir('/sem-marca/outra', credencial)).status).toBe(500);
    });

    it('rota com duas marcas responde 500', async () => {
      expect((await pedir('/duas-marcas', await bearer(chaves))).status).toBe(500);
    });

    it('classe com duas marcas e método sem marca responde 500', async () => {
      expect((await pedir('/classe-duas-marcas/sem-marca-no-metodo')).status).toBe(500);
    });

    it('método com duas marcas responde 500 mesmo sob classe com marca válida', async () => {
      expect((await pedir('/metodo-duas-marcas-sob-classe-valida')).status).toBe(500);
    });

    it('marca do método prevalece sobre a da classe, inclusive quando a classe tem duas', async () => {
      expect((await pedir('/classe-duas-marcas/metodo-decide')).status).toBe(200);
      expect((await pedir('/classe-identificada/metodo-publico')).status).toBe(200);
    });

    it('método sem marca herda a marca da classe', async () => {
      expect((await pedir('/classe-identificada/herda')).status).toBe(401);
      expect((await pedir('/classe-identificada/herda', await bearer(chaves))).status).toBe(200);
    });

    it('controller filho sem marca própria não herda a marca da classe pai e responde 500', async () => {
      fake.concederPermissoes();
      const credencial = await bearer(chaves);

      expect((await pedir('/filho-sem-marca-propria/herda', credencial)).status).toBe(500);
      expect((await pedir('/filho-sem-marca-propria/metodo-publico', credencial)).status).toBe(200);
      expect((await pedir('/filho-sem-marca-propria/metodo-exige', credencial)).status).toBe(403);
    });

    it('marca do método com permissão substitui a da classe identificada', async () => {
      fake.concederPermissoes();

      const resposta = await pedir('/classe-identificada/metodo-exige', await bearer(chaves));

      expect(resposta.status).toBe(403);
    });
  });

  describe('Publico', () => {
    it('responde 200 sem token', async () => {
      expect((await pedir('/publico')).status).toBe(200);
    });

    it('não autentica nem resolve, mesmo com token inválido', async () => {
      const resposta = await pedir('/publico', { authorization: 'Bearer lixo.lixo.lixo' });

      expect(resposta.status).toBe(200);
      expect(fake.identidadesResolvidas).toHaveLength(0);
    });
  });

  describe('autenticação', () => {
    it.each(CASOS_DE_TOKEN_INVALIDO)('recusa com 401 NAO_AUTENTICADO: $nome', async ({ emitir }) => {
      const resposta = await pedir('/identificado', { authorization: `Bearer ${await emitir(chaves)}` });

      expect(resposta.status).toBe(401);
      expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
      expect(await resposta.json()).toEqual({ erro: 'NAO_AUTENTICADO', correlacaoId: '' });
    });

    it.each(CASOS_DE_REQUISICAO_INVALIDA)('recusa com 401 NAO_AUTENTICADO: $nome', async ({ montar }) => {
      const { authorization, consulta } = await montar(chaves);

      const resposta = await pedir(`/identificado${consulta ?? ''}`, authorization === undefined ? {} : { authorization });

      expect(resposta.status).toBe(401);
      expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
      expect(await resposta.json()).toEqual({ erro: 'NAO_AUTENTICADO', correlacaoId: '' });
    });

    it('recusa na rota com permissão sem chegar ao resolvedor', async () => {
      fake.concederPermissoes('financeiro.periodo.fechar');

      const resposta = await pedir('/permissao', { authorization: 'Bearer lixo' });

      expect(resposta.status).toBe(401);
      expect(fake.identidadesResolvidas).toHaveLength(0);
    });

    it('não revela o motivo da recusa nem o token no corpo', async () => {
      const token = await emitirToken(chaves, { payload: { aud: 'cdd-web' } });

      const texto = await (await pedir('/identificado', { authorization: `Bearer ${token}` })).text();

      expect(texto).not.toContain('aud');
      expect(texto).not.toContain(token);
    });
  });

  describe('ApenasIdentificado', () => {
    it('com token válido responde 200 e entrega a identidade ao handler, sem resolver permissões', async () => {
      const resposta = await pedir('/identificado', await bearer(chaves));

      expect(resposta.status).toBe(200);
      const corpo = (await resposta.json()) as IdentidadeAutenticada;
      expect(corpo.sub).toBe(SUB_DE_TESTE);
      expect(Object.keys(corpo).toSorted()).toEqual(['expiraEm', 'sub']);
      expect(fake.identidadesResolvidas).toHaveLength(0);
    });

    it('responde 200 mesmo quando o resolvedor recusaria o usuário', async () => {
      fake.recusarCom('USUARIO_SUSPENSO');

      expect((await pedir('/identificado', await bearer(chaves))).status).toBe(200);
    });
  });

  describe('tabela de comportamento por marca', () => {
    type Cenario = 'sem token' | 'sem nenhuma permissão' | 'com a permissão' | 'usuário suspenso';
    const LINHAS: ReadonlyArray<readonly [string, string, Readonly<Record<Cenario, number>>, boolean]> = [
      ['Publico', '/publico', { 'sem token': 200, 'sem nenhuma permissão': 200, 'com a permissão': 200, 'usuário suspenso': 200 }, false],
      ['ApenasIdentificado', '/identificado', { 'sem token': 401, 'sem nenhuma permissão': 200, 'com a permissão': 200, 'usuário suspenso': 200 }, false],
      ['ApenasUsuarioAtivo', '/usuario-ativo', { 'sem token': 401, 'sem nenhuma permissão': 200, 'com a permissão': 200, 'usuário suspenso': 401 }, true],
      ['RequerPermissao', '/permissao', { 'sem token': 401, 'sem nenhuma permissão': 403, 'com a permissão': 200, 'usuário suspenso': 401 }, true],
    ];
    const CENARIOS: readonly Cenario[] = ['sem token', 'sem nenhuma permissão', 'com a permissão', 'usuário suspenso'];

    describe.each(LINHAS)('%s', (_marca, caminho, esperado, resolveContexto) => {
      it.each(CENARIOS)('%s', async (cenario) => {
        if (cenario === 'com a permissão') fake.concederPermissoes('financeiro.periodo.fechar');
        if (cenario === 'sem nenhuma permissão') fake.concederPermissoes();
        if (cenario === 'usuário suspenso') fake.recusarCom('USUARIO_SUSPENSO');
        const credencial = cenario === 'sem token' ? {} : await bearer(chaves);

        const resposta = await pedir(caminho, credencial);

        expect(resposta.status).toBe(esperado[cenario]);
        expect(fake.identidadesResolvidas).toHaveLength(resolveContexto && cenario !== 'sem token' ? 1 : 0);
      });
    });
  });

  describe('ApenasUsuarioAtivo', () => {
    it('usuário sem permissão nenhuma passa e recebe o contexto no handler', async () => {
      fake.concederPermissoes();

      const resposta = await pedir('/usuario-ativo', await bearer(chaves));

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({ usuarioId: USUARIO_DE_TESTE, permissoes: 0 });
    });

    it('usuário com permissões também passa', async () => {
      fake.concederPermissoes('financeiro.periodo.fechar', 'financeiro.lancamento.ler');

      const resposta = await pedir('/usuario-ativo', await bearer(chaves));

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({ usuarioId: USUARIO_DE_TESTE, permissoes: 2 });
    });

    it.each(['USUARIO_DESCONHECIDO', 'USUARIO_CONVITE_PENDENTE', 'USUARIO_SUSPENSO', 'USUARIO_REVOGADO'] as const)(
      'situação %s responde 401 com o código do resolvedor e o desafio Bearer',
      async (codigo) => {
        fake.recusarCom(codigo);

        const resposta = await pedir('/usuario-ativo', await bearer(chaves));

        expect(resposta.status).toBe(401);
        expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
        expect(await resposta.json()).toEqual({ erro: codigo, correlacaoId: '' });
      },
    );

    it('token inválido responde 401 sem chegar ao resolvedor', async () => {
      const resposta = await pedir('/usuario-ativo', { authorization: 'Bearer lixo' });

      expect(resposta.status).toBe(401);
      expect(await resposta.json()).toEqual({ erro: 'NAO_AUTENTICADO', correlacaoId: '' });
      expect(fake.identidadesResolvidas).toHaveLength(0);
    });
  });

  describe('cabeçalho Authorization', () => {
    it.each(['Bearer', 'bearer', 'BEARER', 'bEaReR'])('aceita o esquema %s sem diferenciar maiúsculas', async (esquema) => {
      const token = await emitirToken(chaves);

      expect((await pedir('/identificado', { authorization: `${esquema} ${token}` })).status).toBe(200);
    });

    it.each([
      ['dois espaços', (token: string) => `Bearer  ${token}`],
      ['tabulação', (token: string) => `Bearer\t${token}`],
      ['sem separador', (token: string) => `Bearer${token}`],
    ])('recusa o esquema separado do token por %s', async (_nome, montar) => {
      const token = await emitirToken(chaves);

      const resposta = await pedir('/identificado', { authorization: montar(token) });

      expect(resposta.status).toBe(401);
      expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
    });
  });

  describe('registro em log', () => {
    const CAUSAS_DE_RECUSA = [...CASOS_DE_TOKEN_INVALIDO];

    it('o valor de crit forjado no header não aparece em nenhuma linha logada', async () => {
      const logs = capturarLogs();
      const forjado = 'x"\n[Nest] 1  - 01/01/2026, 00:00:00     LOG [Auditoria] usuario admin autenticado com sucesso\n';

      const resposta = await pedir('/identificado', { authorization: `Bearer ${emitirTokenComCritForjado(forjado)}` });

      expect(resposta.status).toBe(401);
      const todas = logs.linhas();
      expect(todas.length).toBeGreaterThan(0);
      expect(todas.join('\n')).not.toContain('Auditoria');
      expect(todas.join('\n')).not.toContain('admin');
      expect(todas.every((linha) => !linha.includes('\n'))).toBe(true);
      expect(logs.linhas('warn')).toEqual(['Token recusado: ERR_JOSE_NOT_SUPPORTED']);
    });

    it('registra só o código do erro do jose, sem a mensagem', async () => {
      const logs = capturarLogs();
      const token = await emitirToken(chaves, { payload: { aud: 'cdd-web' } });

      await pedir('/identificado', { authorization: `Bearer ${token}` });

      expect(logs.linhas('warn')).toEqual(['Token recusado: ERR_JWT_CLAIM_VALIDATION_FAILED']);
    });

    it('registra o nome do erro quando ele não tem código', async () => {
      const logs = capturarLogs();
      const token = await emitirToken(chaves, { payload: { typ: 'ID' } });

      await pedir('/identificado', { authorization: `Bearer ${token}` });

      expect(logs.linhas('warn')).toEqual(['Token recusado: ErroDeTokenInvalido']);
    });

    it.each([
      ['código com quebra de linha', { code: 'ERR_X\n[Nest] LOG [Auditoria] forjado', name: 'Error' }],
      ['nome com quebra de linha', { name: 'Erro\n[Nest] LOG [Auditoria] forjado' }],
      ['código longo demais', { code: 'A'.repeat(65) }],
      ['código com aspas e espaço', { code: 'ERR "x" y' }],
    ])('motivo de recusa fora do formato (%s) é registrado como desconhecido', async (_nome, propriedades) => {
      const logs = capturarLogs();
      const falhaHostil = Object.assign(new Error('mensagem hostil'), propriedades);
      const hostil = await subirAplicacao(chaves, fake, {
        chavesDeVerificacao: () => Promise.reject(falhaHostil),
      });

      try {
        await pedirA(hostil.origem, '/identificado', await bearer(chaves));
      } finally {
        await hostil.app.close();
      }

      expect(logs.linhas('warn')).toEqual(['Token recusado: ERRO_DESCONHECIDO']);
    });

    it.each(CAUSAS_DE_RECUSA)('recusa de token ($nome) não registra o token nem o sub', async ({ emitir }) => {
      const logs = capturarLogs();
      const token = await emitir(chaves);

      await pedir('/identificado', { authorization: `Bearer ${token}` });

      const todas = logs.linhas().join('\n');
      expect(todas).not.toContain(token);
      expect(todas).not.toContain(SUB_DE_TESTE);
      for (const parte of token.split('.').filter((parte) => parte.length > 3)) expect(todas).not.toContain(parte);
    });

    it.each(['USUARIO_DESCONHECIDO', 'USUARIO_CONVITE_PENDENTE', 'USUARIO_SUSPENSO', 'USUARIO_REVOGADO'] as const)(
      'recusa do resolvedor (%s) registra o código e não o token nem o sub',
      async (codigo) => {
        const logs = capturarLogs();
        fake.recusarCom(codigo);
        const credencial = await bearer(chaves);

        await pedir('/permissao', credencial);

        const todas = logs.linhas();
        expect(logs.linhas('warn')).toEqual([`Acesso recusado pelo resolvedor: ${codigo}`]);
        expect(todas.join('\n')).not.toContain(SUB_DE_TESTE);
        expect(todas.join('\n')).not.toContain(credencial['authorization']?.slice('Bearer '.length));
      },
    );

    it('falta de permissão não registra o token nem o sub', async () => {
      const logs = capturarLogs();
      fake.concederPermissoes();
      const credencial = await bearer(chaves);

      await pedir('/permissao', credencial);

      const todas = logs.linhas().join('\n');
      expect(todas).not.toContain(SUB_DE_TESTE);
      expect(todas).not.toContain(credencial['authorization']?.slice('Bearer '.length));
    });
  });

  describe('RequerPermissao', () => {
    it('com a permissão responde 200 e entrega o contexto ao handler', async () => {
      fake.concederPermissoes('financeiro.periodo.fechar');

      const resposta = await pedir('/permissao', await bearer(chaves));

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({ usuarioId: USUARIO_DE_TESTE, instituicaoId: INSTITUICAO_DE_TESTE });
      expect(fake.identidadesResolvidas.map((identidade) => identidade.sub)).toEqual([SUB_DE_TESTE]);
    });

    it('sem a permissão responde 403 SEM_PERMISSAO', async () => {
      fake.concederPermissoes('financeiro.lancamento.ler');

      const resposta = await pedir('/permissao', await bearer(chaves));

      expect(resposta.status).toBe(403);
      expect(resposta.headers.get('www-authenticate')).toBeNull();
      expect(await resposta.json()).toEqual({ erro: 'SEM_PERMISSAO', correlacaoId: '' });
    });

    it.each(['USUARIO_DESCONHECIDO', 'USUARIO_CONVITE_PENDENTE', 'USUARIO_SUSPENSO', 'USUARIO_REVOGADO'] as const)(
      'recusa de situação %s responde 401 com o próprio código',
      async (codigo) => {
        fake.recusarCom(codigo);

        const resposta = await pedir('/permissao', await bearer(chaves));

        expect(resposta.status).toBe(401);
        expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
        expect(await resposta.json()).toEqual({ erro: codigo, correlacaoId: '' });
      },
    );
  });

  describe('RequerAlgumaPermissao', () => {
    it('com uma das permissões responde 200', async () => {
      fake.concederPermissoes('financeiro.lancamento.ler_proprios');

      expect((await pedir('/alguma', await bearer(chaves))).status).toBe(200);
    });

    it('com nenhuma das permissões responde 403', async () => {
      fake.concederPermissoes('financeiro.periodo.fechar');

      const resposta = await pedir('/alguma', await bearer(chaves));

      expect(resposta.status).toBe(403);
      expect(await resposta.json()).toEqual({ erro: 'SEM_PERMISSAO', correlacaoId: '' });
    });

    it('com conjunto vazio responde 403', async () => {
      fake.concederPermissoes();

      expect((await pedir('/alguma', await bearer(chaves))).status).toBe(403);
    });

    it('com recusa de situação responde 401 com o código', async () => {
      fake.recusarCom('USUARIO_REVOGADO');

      const resposta = await pedir('/alguma', await bearer(chaves));

      expect(resposta.status).toBe(401);
      expect(await resposta.json()).toEqual({ erro: 'USUARIO_REVOGADO', correlacaoId: '' });
    });
  });
});

describe('indisponibilidade do provedor de identidade', () => {
  const VALIDADE_DO_CACHE_EM_MS = 120;
  const LIMITE_DE_ESPERA_EM_MS = 250;
  const PAUSA_APOS_FALHA_EM_MS = 150;
  let chaves: ChavesDeTeste;
  let servidor: ServidorDeJwks;
  let aplicacao: AplicacaoDeTeste;
  let fake: ResolvedorDeContextoDeAcessoFake;

  const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms));

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
  });

  beforeEach(async () => {
    servidor = new ServidorDeJwks(chaves.conjunto);
    await servidor.iniciar();
    fake = new ResolvedorDeContextoDeAcessoFake();
    fake.concederPermissoes('financeiro.periodo.fechar');
    aplicacao = await subirAplicacao(chaves, fake, {
      emissor: servidor.emissor,
      chavesDeVerificacao: criarChavesRemotas(servidor.emissor, {
        validadeDoCacheEmMs: VALIDADE_DO_CACHE_EM_MS,
        limiteDeEsperaEmMs: LIMITE_DE_ESPERA_EM_MS,
        esperaAposFalhaEmMs: PAUSA_APOS_FALHA_EM_MS,
      }),
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await aplicacao.app.close();
    await servidor.derrubar();
  });

  const pedirAutenticado = async (caminho: string, payload: Record<string, unknown> = {}): Promise<Response> =>
    pedirA(aplicacao.origem, caminho, await bearer(chaves, { iss: servidor.emissor, ...payload }));

  it('nunca obteve chaves e o provedor responde 503: 503 PROVEDOR_DE_IDENTIDADE_INDISPONIVEL sem desafio e com log de erro', async () => {
    const logs = capturarLogs();
    servidor.modo = 'indisponivel';

    const resposta = await pedirAutenticado('/permissao');

    expect(resposta.status).toBe(503);
    expect(resposta.headers.get('www-authenticate')).toBeNull();
    expect(await resposta.json()).toEqual({ erro: 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL', correlacaoId: '' });
    expect(logs.linhas('error')).toEqual(['Provedor de identidade indisponível: ERR_JOSE_GENERIC']);
    expect(logs.linhas('warn')).toEqual([]);
    expect(fake.identidadesResolvidas).toHaveLength(0);
  });

  it('provedor recusando conexão e pendurado também resultam em 503', async () => {
    servidor.modo = 'pendurado';
    const inicio = Date.now();

    const pendurado = await pedirAutenticado('/identificado');

    expect(pendurado.status).toBe(503);
    expect(Date.now() - inicio).toBeLessThan(LIMITE_DE_ESPERA_EM_MS + 1_500);

    await servidor.derrubar();
    await esperar(PAUSA_APOS_FALHA_EM_MS + 60);
    const recusado = await pedirAutenticado('/identificado');
    expect(recusado.status).toBe(503);
  });

  it('o log do 503 por conexão recusada registra o nome e o código da causa, sem mensagem livre', async () => {
    const logs = capturarLogs();
    await servidor.derrubar();

    await pedirAutenticado('/identificado');

    expect(logs.linhas('error')).toEqual(['Provedor de identidade indisponível: TypeError ECONNREFUSED']);
  });

  it('o log do 503 não registra o token, o sub nem a URL do provedor', async () => {
    const logs = capturarLogs();
    servidor.modo = 'pendurado';
    const credencial = await bearer(chaves, { iss: servidor.emissor });

    await pedirA(aplicacao.origem, '/identificado', credencial);

    const todas = logs.linhas().join('\n');
    expect(logs.linhas('error')).toEqual(['Provedor de identidade indisponível: ERR_JWKS_TIMEOUT']);
    expect(todas).not.toContain(credencial['authorization']?.slice('Bearer '.length));
    expect(todas).not.toContain(SUB_DE_TESTE);
    expect(todas).not.toContain(servidor.emissor);
  });

  it('com chaves já obtidas, token válido segue passando depois da validade do cache com o provedor fora', async () => {
    expect((await pedirAutenticado('/permissao')).status).toBe(200);
    servidor.modo = 'indisponivel';
    await esperar(VALIDADE_DO_CACHE_EM_MS + 60);

    expect((await pedirAutenticado('/permissao')).status).toBe(200);
  });

  it('com chaves já obtidas, token inválido continua 401 com desafio durante a queda', async () => {
    await pedirAutenticado('/identificado');
    servidor.modo = 'indisponivel';
    await esperar(VALIDADE_DO_CACHE_EM_MS + 60);

    const resposta = await pedirAutenticado('/identificado', { aud: 'cdd-web' });

    expect(resposta.status).toBe(401);
    expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
    expect(await resposta.json()).toEqual({ erro: 'NAO_AUTENTICADO', correlacaoId: '' });
  });

  it('kid novo durante a queda responde 503, e com o provedor de volta passa a ser aceito', async () => {
    const novas = await criarChavesDeTeste('chave-nova');
    await pedirAutenticado('/identificado');
    servidor.modo = 'indisponivel';
    await esperar(VALIDADE_DO_CACHE_EM_MS + 60);
    const tokenNovo = { authorization: `Bearer ${await emitirToken(novas, { payload: { iss: servidor.emissor } })}` };

    expect((await pedirA(aplicacao.origem, '/identificado', tokenNovo)).status).toBe(503);

    servidor.conjunto = { keys: [...chaves.conjunto.keys, ...novas.conjunto.keys] };
    servidor.modo = 'responde';
    await esperar(PAUSA_APOS_FALHA_EM_MS + 60);

    expect((await pedirA(aplicacao.origem, '/identificado', tokenNovo)).status).toBe(200);
  });

  it('rota pública não depende do provedor', async () => {
    servidor.modo = 'indisponivel';

    expect((await pedirA(aplicacao.origem, '/publico')).status).toBe(200);
  });
});

describe('resolvedor vazio registrado por padrão', () => {
  let aplicacao: AplicacaoDeTeste;
  let chaves: ChavesDeTeste;

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
    aplicacao = await subirAplicacao(chaves);
    return () => aplicacao.app.close();
  });

  it('recusa com 401 USUARIO_DESCONHECIDO uma rota que exige permissão, mesmo com token válido', async () => {
    const resposta = await pedirA(aplicacao.origem, '/permissao', await bearer(chaves));

    expect(resposta.status).toBe(401);
    expect(await resposta.json()).toEqual({ erro: 'USUARIO_DESCONHECIDO', correlacaoId: '' });
  });

  it('segue aceitando rota apenas identificada e pública', async () => {
    expect((await pedirA(aplicacao.origem, '/identificado', await bearer(chaves))).status).toBe(200);
    expect((await pedirA(aplicacao.origem, '/publico')).status).toBe(200);
  });
});

describe('marcas de acesso inválidas na declaração', () => {
  it('RequerAlgumaPermissao sem argumentos falha ao carregar', () => {
    expect(() => RequerAlgumaPermissao()).toThrow();
  });

  it('RequerPermissao com permissão fora do catálogo falha ao carregar', () => {
    expect(() => RequerPermissao('financeiro.inexistente' as never)).toThrow();
    expect(() => RequerAlgumaPermissao('financeiro.lancamento.ler', 'x.y.z' as never)).toThrow();
  });
});
