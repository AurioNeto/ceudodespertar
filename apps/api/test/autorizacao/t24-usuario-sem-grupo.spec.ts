import type { ExecutionContext, HttpException } from '@nestjs/common';
import type { InstituicaoId, Permissao, UsuarioId } from '@cdd/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarContextoDeAcesso, ResolvedorDeContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { GuardaDeAcesso } from '../../src/shared/infrastructure/autenticacao/guarda-de-acesso.js';
import { VerificadorDeToken } from '../../src/shared/infrastructure/autenticacao/verificador-de-token.js';
import { subirAplicacaoEDescobrirRotas } from '../estrutural/rotas/aplicacao-real.js';
import type { AplicacaoDescoberta } from '../estrutural/rotas/aplicacao-real.js';
import type { Descoberta, Rota } from '../estrutural/rotas/descobrir-rotas.js';

const PISO_DE_ROTAS_COM_PERMISSAO = 12;
const ROTAS_ESPERADAS_NA_VARREDURA = ['GET /api/v1/identidade/grupos', 'PUT /api/v1/identidade/grupos/:id/permissoes/:codigo', 'GET /api/v1/identidade/auditoria'];
const MARCAS_SEM_PERMISSAO: ReadonlySet<string> = new Set(['publico', 'apenas-identificado', 'apenas-usuario-ativo']);

interface Resultado {
  readonly status: number;
  readonly erro?: string;
}

function marcaDe(rota: Rota): Rota['marcas'][number] | undefined {
  return rota.marcas.length === 1 ? rota.marcas[0] : undefined;
}

function exigePermissao(rota: Rota): boolean {
  const tipo = marcaDe(rota)?.tipo;
  return tipo === 'permissao' || tipo === 'alguma-permissao';
}

function permissoesExigidasPor(rota: Rota): ReadonlySet<Permissao> {
  const marca = marcaDe(rota);
  if (marca?.tipo === 'permissao') return new Set([marca.permissao]);
  if (marca?.tipo === 'alguma-permissao') return new Set(marca.permissoes);
  return new Set();
}

function contextoDe(rota: Rota): ExecutionContext {
  const requisicao = { headers: { authorization: 'Bearer token-de-teste' } };
  const resposta = { setHeader: () => undefined };
  return {
    getHandler: () => rota.handler,
    getClass: () => rota.classe,
    switchToHttp: () => ({ getRequest: () => requisicao, getResponse: () => resposta }),
  } as unknown as ExecutionContext;
}

function guardaComUsuarioQueTem(permissoes: ReadonlySet<Permissao>): GuardaDeAcesso {
  const verificador = { verificar: async () => ({ sub: 'usuario-sem-grupo', expiraEm: 4_102_444_800 }) } as unknown as VerificadorDeToken;
  const resolvedor: ResolvedorDeContextoDeAcesso = {
    resolver: async () =>
      criarContextoDeAcesso({ usuarioId: 'usuario-1' as UsuarioId, instituicaoId: 'instituicao-1' as InstituicaoId, permissoes }),
  };
  return new GuardaDeAcesso(verificador, resolvedor);
}

async function passarPelaGuarda(rota: Rota, permissoes: ReadonlySet<Permissao>): Promise<Resultado> {
  const falha = await guardaComUsuarioQueTem(permissoes)
    .canActivate(contextoDe(rota))
    .then(
      () => undefined,
      (erro: unknown) => erro as HttpException,
    );
  if (falha === undefined) return { status: 200 };
  return { status: falha.getStatus(), erro: (falha.getResponse() as { erro: string }).erro };
}

describe('T24 · usuário sem grupo algum acessa qualquer endpoint — rotas reais, guarda real', () => {
  let aplicacao: AplicacaoDescoberta;
  let descoberta: Descoberta;
  let rotasComPermissao: readonly Rota[];

  beforeAll(async () => {
    aplicacao = await subirAplicacaoEDescobrirRotas();
    ({ descoberta } = aplicacao);
    rotasComPermissao = descoberta.rotas.filter(exigePermissao);
  });

  afterAll(async () => {
    await aplicacao.encerrar();
  });

  it('T24 · sem nenhuma permissão — toda rota com permissão — responde 403 SEM_PERMISSAO', async () => {
    const resultados = await Promise.all(
      rotasComPermissao.map(async (rota) => `${rota.id} -> ${JSON.stringify(await passarPelaGuarda(rota, new Set()))}`),
    );

    const esperado = rotasComPermissao.map((rota) => `${rota.id} -> ${JSON.stringify({ status: 403, erro: 'SEM_PERMISSAO' })}`);
    expect(resultados).toEqual(esperado);
  });

  it('T24 · com exatamente a permissão exigida — as mesmas rotas — passam, então o 403 vem da falta de permissão', async () => {
    const resultados = await Promise.all(
      rotasComPermissao.map(async (rota) => `${rota.id} -> ${(await passarPelaGuarda(rota, permissoesExigidasPor(rota))).status}`),
    );

    expect(resultados).toEqual(rotasComPermissao.map((rota) => `${rota.id} -> 200`));
  });

  it('T24 · sentinela — varredura — encontra ao menos o piso de rotas com permissão e as rotas conhecidas', () => {
    const ids = rotasComPermissao.map((rota) => rota.id);

    expect([ids.length >= PISO_DE_ROTAS_COM_PERMISSAO, ROTAS_ESPERADAS_NA_VARREDURA.filter((id) => !ids.includes(id))]).toEqual([true, []]);
  });

  it('T24 · fora da varredura — rotas sem permissão — têm exatamente uma marca de publico, identificado ou usuário ativo', () => {
    const foraDaVarredura = descoberta.rotas.filter((rota) => !exigePermissao(rota));

    const comMarcaInesperada = foraDaVarredura.filter((rota) => !MARCAS_SEM_PERMISSAO.has(marcaDe(rota)?.tipo ?? 'ausente'));

    expect(comMarcaInesperada.map((rota) => rota.id)).toEqual([]);
  });

  it('T24 · fora da varredura — rotas públicas e de saúde — não entram no teste de 403', () => {
    const ids = rotasComPermissao.map((rota) => rota.id);

    expect(ids.filter((id) => ['GET /saude/viva', 'GET /saude/pronta', 'GET /api/v1/eu'].includes(id))).toEqual([]);
  });
});
