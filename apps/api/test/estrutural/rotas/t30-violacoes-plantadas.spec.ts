import { All, Controller, Get, Patch, Post, Put } from '@nestjs/common';
import type { HttpException, Type } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ROTAS_FORA_DO_PREFIXO, PREFIXO_GLOBAL } from '../../../src/composicao/aplicacao.js';
import { GuardaDeAcesso } from '../../../src/shared/infrastructure/autenticacao/guarda-de-acesso.js';
import {
  ApenasIdentificado,
  ApenasUsuarioAtivo,
  Publico,
  RequerPermissao,
} from '../../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import type { ResolvedorDeContextoDeAcesso } from '../../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { VerificadorDeToken } from '../../../src/shared/infrastructure/autenticacao/verificador-de-token.js';
import { ModoDeTransacao } from '../../../src/shared/infrastructure/http/modo-de-transacao.decorator.js';
import { descobrirRotas } from './descobrir-rotas.js';
import type { Descoberta, Rota } from './descobrir-rotas.js';
import { ROTA_DE_USUARIO_ATIVO, ROTAS_SEM_PERMISSAO } from './politica-de-rotas.js';
import { verificarRotas } from './verificar-rotas.js';
import type { OpcoesDeVerificacao } from './verificar-rotas.js';

@Controller('sem-marca')
class SemMarcaController {
  @Get()
  rota(): void {}
}

@Controller('duas-marcas')
class DuasMarcasController {
  @Publico()
  @ApenasIdentificado()
  @Get()
  rota(): void {}
}

@Controller('identificado-em-post')
class IdentificadoEmPostController {
  @ApenasIdentificado()
  @Post()
  rota(): void {}
}

@Controller('publico-em-put')
class PublicoEmPutController {
  @Publico()
  @Put()
  rota(): void {}
}

@Controller('patch-sem-marca')
class PatchSemMarcaController {
  @Patch()
  rota(): void {}
}

@Controller('todos-os-metodos')
class TodosOsMetodosController {
  @ApenasIdentificado()
  @All()
  rota(): void {}
}

@Controller('get-que-escreve')
class GetQueEscreveController {
  @ApenasIdentificado()
  @ModoDeTransacao('escrita')
  @Get()
  rota(): void {}
}

@Controller('get-que-le-e-grava')
class GetQueLeEGravaController {
  @ApenasIdentificado()
  @ModoDeTransacao('leitura-que-grava')
  @Get()
  rota(): void {}
}

@Controller('usuario-ativo-fora-do-eu')
class UsuarioAtivoForaDoEuController {
  @ApenasUsuarioAtivo()
  @Get('outra')
  rota(): void {}
}

@RequerPermissao('financeiro.lancamento.registrar')
@Controller('classe-com-permissao')
class ClasseComPermissaoController {
  @Publico()
  @Post()
  rota(): void {}
}

@Publico()
class BaseComMarcaNaClasse {
  @Get('herdada')
  rota(): void {}
}

@Controller('filho-sem-marca-propria')
class FilhoSemMarcaPropriaController extends BaseComMarcaNaClasse {}

@Controller('qualquer')
class PublicoForaDaTabelaController {
  @Publico()
  @Get()
  rota(): void {}
}

@Controller('escrita-com-permissao')
class EscritaComPermissaoController {
  @RequerPermissao('financeiro.lancamento.registrar')
  @Post()
  rota(): void {}
}

@Controller('saude')
class SaudeNaTabelaController {
  @Publico()
  @Get('viva')
  rota(): void {}
}

@Controller('eu')
class UsuarioAtivoNoEuController {
  @ApenasUsuarioAtivo()
  @Get()
  rota(): void {}
}

@Controller('saude')
class PostPublicoNaSaudeController {
  @Publico()
  @Post('viva')
  rota(): void {}
}

@Controller('eu')
class PublicoNoEuController {
  @Publico()
  @Get()
  rota(): void {}
}

@ModoDeTransacao('escrita')
@Controller('modo-na-classe')
class ModoNaClasseController {
  @ApenasIdentificado()
  @Get()
  rota(): void {}
}

@Controller('saude-admin')
class SaudeAdminController {
  @Publico()
  @Get('viva')
  rota(): void {}
}

@Controller('sem-rotas')
class SemRotasController {}

@Controller('eu')
class UsuarioAtivoEmCaminhosDoMetodoController {
  @ApenasUsuarioAtivo()
  @Get(['', 'outra'])
  rota(): void {}
}

@Controller(['saude', 'admin'])
class PublicoEmCaminhosDaClasseController {
  @Publico()
  @Get('viva')
  rota(): void {}
}

const PLANTADOS_COM_VIOLACAO: readonly Type[] = [
  SemMarcaController,
  DuasMarcasController,
  IdentificadoEmPostController,
  PublicoEmPutController,
  PatchSemMarcaController,
  TodosOsMetodosController,
  GetQueEscreveController,
  GetQueLeEGravaController,
  UsuarioAtivoForaDoEuController,
  ClasseComPermissaoController,
  FilhoSemMarcaPropriaController,
  PublicoForaDaTabelaController,
  PostPublicoNaSaudeController,
  PublicoNoEuController,
  ModoNaClasseController,
  SaudeAdminController,
  UsuarioAtivoEmCaminhosDoMetodoController,
  PublicoEmCaminhosDaClasseController,
];

const PLANTADOS_SEM_VIOLACAO: readonly Type[] = [
  EscritaComPermissaoController,
  SaudeNaTabelaController,
  UsuarioAtivoNoEuController,
];

const OPCOES: OpcoesDeVerificacao = {
  rotasSemPermissao: ROTAS_SEM_PERMISSAO,
  rotaDeUsuarioAtivo: ROTA_DE_USUARIO_ATIVO,
  pisoDeRotas: 0,
  rotasObrigatorias: [],
};

async function descobrirDe(controllers: readonly Type[]): Promise<Descoberta> {
  const modulo = await Test.createTestingModule({
    imports: [DiscoveryModule],
    controllers: [...controllers],
  }).compile();
  return descobrirRotas(modulo.get(DiscoveryService), modulo.get(MetadataScanner), modulo.get(Reflector), {
    prefixoGlobal: PREFIXO_GLOBAL,
    foraDoPrefixo: ROTAS_FORA_DO_PREFIXO,
  });
}

function resumir(violacoes: readonly { regra: string; alvo: string }[]): string[] {
  return violacoes.map(({ regra, alvo }) => `${regra} | ${alvo}`).toSorted();
}

describe('T30 — controllers plantados', () => {
  it('rotas com violação — verificação — devolve exatamente as violações esperadas', async () => {
    const descoberta = await descobrirDe(PLANTADOS_COM_VIOLACAO);

    const violacoes = verificarRotas(descoberta, OPCOES);

    expect(resumir(violacoes)).toEqual(
      [
        'marca-ausente-ou-duplicada | GET /api/v1/sem-marca',
        'marca-ausente-ou-duplicada | GET /api/v1/duas-marcas',
        'marca-ausente-ou-duplicada | PATCH /api/v1/patch-sem-marca',
        'marca-ausente-ou-duplicada | GET /api/v1/filho-sem-marca-propria/herdada',
        'escrita-sem-permissao | POST /api/v1/identificado-em-post',
        'sem-permissao-fora-da-tabela | POST /api/v1/identificado-em-post',
        'escrita-sem-permissao | PUT /api/v1/publico-em-put',
        'sem-permissao-fora-da-tabela | PUT /api/v1/publico-em-put',
        'escrita-sem-permissao | ALL /api/v1/todos-os-metodos',
        'sem-permissao-fora-da-tabela | ALL /api/v1/todos-os-metodos',
        'escrita-sem-permissao | GET /api/v1/get-que-escreve',
        'sem-permissao-fora-da-tabela | GET /api/v1/get-que-escreve',
        'escrita-sem-permissao | GET /api/v1/get-que-le-e-grava',
        'sem-permissao-fora-da-tabela | GET /api/v1/get-que-le-e-grava',
        'usuario-ativo-fora-do-eu | GET /api/v1/usuario-ativo-fora-do-eu/outra',
        'sem-permissao-fora-da-tabela | GET /api/v1/usuario-ativo-fora-do-eu/outra',
        'escrita-sem-permissao | POST /api/v1/classe-com-permissao',
        'sem-permissao-fora-da-tabela | POST /api/v1/classe-com-permissao',
        'sem-permissao-fora-da-tabela | GET /api/v1/qualquer',
        'escrita-sem-permissao | POST /saude/viva',
        'sem-permissao-fora-da-tabela | POST /saude/viva',
        'sem-permissao-fora-da-tabela | GET /api/v1/eu',
        'escrita-sem-permissao | GET /api/v1/modo-na-classe',
        'sem-permissao-fora-da-tabela | GET /api/v1/modo-na-classe',
        'sem-permissao-fora-da-tabela | GET /api/v1/saude-admin/viva',
        'usuario-ativo-fora-do-eu | GET /api/v1/eu/outra',
        'sem-permissao-fora-da-tabela | GET /api/v1/eu/outra',
        'sem-permissao-fora-da-tabela | GET /api/v1/admin/viva',
      ].toSorted(),
    );
  });

  it('rotas conformes — verificação — não devolve violação', async () => {
    const descoberta = await descobrirDe(PLANTADOS_SEM_VIOLACAO);

    expect(verificarRotas(descoberta, OPCOES)).toEqual([]);
  });

  it('rota da tabela em outro caminho — verificação — não herda a exceção', async () => {
    const descoberta = await descobrirDe([PublicoForaDaTabelaController]);
    const tabelaComOutroCaminho = ROTAS_SEM_PERMISSAO.map(({ marca, metodo }) => ({ marca, metodo, caminho: '/api/v1/outro' }));

    const violacoes = verificarRotas(descoberta, { ...OPCOES, rotasSemPermissao: tabelaComOutroCaminho });

    expect(resumir(violacoes)).toEqual(['sem-permissao-fora-da-tabela | GET /api/v1/qualquer']);
  });

  it('descoberta vazia — verificação com piso — acusa descoberta insuficiente', async () => {
    const descoberta = await descobrirDe([]);

    const violacoes = verificarRotas(descoberta, { ...OPCOES, pisoDeRotas: 1 });

    expect(resumir(violacoes)).toEqual(['descoberta-insuficiente | rotas descobertas: 0']);
  });

  it('rota obrigatória ausente — verificação — acusa a rota ausente', async () => {
    const descoberta = await descobrirDe(PLANTADOS_SEM_VIOLACAO);

    const violacoes = verificarRotas(descoberta, { ...OPCOES, rotasObrigatorias: ['GET /api/v1/inexistente'] });

    expect(resumir(violacoes)).toEqual(['descoberta-insuficiente | ausente: GET /api/v1/inexistente']);
  });

  it('controller sem rota — verificação — acusa a classe sem rota', async () => {
    const descoberta = await descobrirDe([SemRotasController]);

    const violacoes = verificarRotas(descoberta, OPCOES);

    expect(resumir(violacoes)).toEqual(['descoberta-insuficiente | sem rota: SemRotasController']);
  });
});

function contextoDe(rota: Rota): ExecutionContext {
  const requisicao = { headers: {} };
  const resposta = { setHeader: () => undefined };
  return {
    getHandler: () => rota.handler,
    getClass: () => rota.classe,
    switchToHttp: () => ({ getRequest: () => requisicao, getResponse: () => resposta }),
  } as unknown as ExecutionContext;
}

async function statusDaGuarda(rota: Rota): Promise<number | undefined> {
  const guarda = new GuardaDeAcesso({} as VerificadorDeToken, {} as ResolvedorDeContextoDeAcesso);
  const falha = await guarda.canActivate(contextoDe(rota)).then(
    () => undefined,
    (erro: unknown) => erro as HttpException,
  );
  return falha?.getStatus();
}

describe('T30 — paridade com a guarda de acesso real', () => {
  it('rota sem exatamente uma marca — guarda real — responde 500 se e somente se a verificação acusa', async () => {
    const descoberta = await descobrirDe([...PLANTADOS_COM_VIOLACAO, ...PLANTADOS_SEM_VIOLACAO]);
    const acusadasPelaVerificacao = new Set(
      verificarRotas(descoberta, OPCOES)
        .filter(({ regra }) => regra === 'marca-ausente-ou-duplicada')
        .map(({ alvo }) => alvo),
    );

    const status = await Promise.all(descoberta.rotas.map(async (rota) => ({ id: rota.id, status: await statusDaGuarda(rota) })));
    const rotasDaGuarda500 = status.filter((resultado) => resultado.status === 500).map(({ id }) => id);

    expect(rotasDaGuarda500.toSorted()).toEqual([...acusadasPelaVerificacao].toSorted());
  });
});
