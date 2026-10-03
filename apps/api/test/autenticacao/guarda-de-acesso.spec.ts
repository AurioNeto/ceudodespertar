import type { AddressInfo } from 'node:net';
import { Controller, Get, Global, Module } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AutenticacaoModule } from '../../src/shared/infrastructure/autenticacao/autenticacao.module.js';
import { ResolvedorDeContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { ContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { IdentidadeAutenticada } from '../../src/shared/infrastructure/autenticacao/identidade-autenticada.js';
import {
  ApenasIdentificado,
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
  SUB_DE_TESTE,
} from './chaves-de-teste.js';
import type { ChavesDeTeste } from './chaves-de-teste.js';
import {
  INSTITUICAO_DE_TESTE,
  ResolvedorDeContextoDeAcessoFake,
  USUARIO_DE_TESTE,
} from './resolvedor-de-contexto-de-acesso-fake.js';

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

@Global()
@Module({
  providers: [
    {
      provide: AMBIENTE,
      useValue: { OIDC_EMISSOR: EMISSOR_DE_TESTE, OIDC_AUDIENCIA: AUDIENCIA_DE_TESTE },
    },
  ],
  exports: [AMBIENTE],
})
class AmbienteDeTesteModule {}

const CONTROLLERS: Type[] = [
  SemMarcaController,
  DuasMarcasController,
  PublicoController,
  IdentificadoController,
  PermissaoController,
  AlgumaController,
  ClasseIdentificadaController,
  ClasseDuasMarcasController,
  MetodoDuasMarcasController,
];

interface AplicacaoDeTeste {
  readonly app: INestApplication;
  readonly origem: string;
}

async function subirAplicacao(chaves: ChavesDeTeste, resolvedor?: ResolvedorDeContextoDeAcesso): Promise<AplicacaoDeTeste> {
  let construtor = Test.createTestingModule({
    imports: [AmbienteDeTesteModule, AutenticacaoModule],
    controllers: CONTROLLERS,
  }).overrideProvider(CHAVES_DE_VERIFICACAO).useValue(chaves.chaves);
  if (resolvedor !== undefined) {
    construtor = construtor.overrideProvider(ResolvedorDeContextoDeAcesso).useValue(resolvedor);
  }
  const modulo = await construtor.compile();
  const app = modulo.createNestApplication();
  await app.listen(0);
  const origem = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  return { app, origem };
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
    await aplicacao.app.close();
  });

  const pedir = (caminho: string, cabecalhos: Record<string, string> = {}): Promise<Response> =>
    fetch(`${aplicacao.origem}${caminho}`, { headers: cabecalhos });

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

describe('resolvedor vazio registrado por padrão', () => {
  let aplicacao: AplicacaoDeTeste;
  let chaves: ChavesDeTeste;

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
    aplicacao = await subirAplicacao(chaves);
    return () => aplicacao.app.close();
  });

  it('recusa com 401 USUARIO_DESCONHECIDO uma rota que exige permissão, mesmo com token válido', async () => {
    const resposta = await fetch(`${aplicacao.origem}/permissao`, { headers: await bearer(chaves) });

    expect(resposta.status).toBe(401);
    expect(await resposta.json()).toEqual({ erro: 'USUARIO_DESCONHECIDO', correlacaoId: '' });
  });

  it('segue aceitando rota apenas identificada e pública', async () => {
    expect((await fetch(`${aplicacao.origem}/identificado`, { headers: await bearer(chaves) })).status).toBe(200);
    expect((await fetch(`${aplicacao.origem}/publico`)).status).toBe(200);
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
