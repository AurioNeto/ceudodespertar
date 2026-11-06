import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Competencia, UnidadeId, UsuarioId } from '@cdd/contracts';
import { OperacoesDePeriodo } from '../../src/modules/financeiro/application/periodos/operacoes-de-periodo.js';
import { RepositorioDePeriodo } from '../../src/modules/financeiro/domain/periodo/periodo-contabil.repo.js';
import { RepositorioDeLancamento } from '../../src/modules/financeiro/domain/lancamento/lancamento.repo.js';
import { SituacaoDoPeriodo } from '../../src/modules/financeiro/application/lancamentos/situacao-do-periodo.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { INSTITUICAO_A, comContexto } from '../eventos/apoio.js';
import { AUTOR, ROTA, subirLancamentos, pedirLancamento } from './apoio-lancamentos.js';

function barreira() {
  let resolver!: () => void;
  const promise = new Promise<void>(r => { resolver = r; });
  return { promise, resolve: () => resolver() };
}

async function esperarTravaBloqueada(banco: BancoDeTeste): Promise<void> {
  for (let tentativa = 0; tentativa < 1000; tentativa++) {
    // eslint-disable-next-line no-await-in-loop -- barreira no estado observado do PostgreSQL
    const { rows } = await banco.owner.query<{ n: number }>("select count(*)::int as n from pg_locks where locktype = 'advisory' and not granted");
    if (rows[0]!.n > 0) return;
    // eslint-disable-next-line no-await-in-loop -- cede execução sem sleep nem relógio artificial
    await setImmediate();
  }
  throw new Error('a segunda transação não chegou à barreira da trava');
}

describe('fechar × gravar: barreiras reais e READ COMMITTED', () => {
  let banco: BancoDeTeste; let app: AplicacaoDeAcesso; let completo: Record<string, unknown>;
  let operacoes: OperacoesDePeriodo; let periodos: RepositorioDePeriodo;
  let chave: { unidadeId: UnidadeId; competencia: Competencia };
  const acesso = { usuarioId: '0198a3c0-0000-7000-8000-0000000000aa' as UsuarioId } as ContextoDeAcesso;
  beforeEach(async () => {
    banco = await criarBancoDeTeste(); ({ app, completo } = await subirLancamentos(banco));
    operacoes = app.app.get(OperacoesDePeriodo); periodos = app.app.get(RepositorioDePeriodo);
    chave = { unidadeId: completo['unidadeId'] as UnidadeId, competencia: '2026-10' as Competencia };
  });
  afterEach(async () => { vi.restoreAllMocks(); await app.encerrar(); await derrubarBancoDeTeste(banco); });
  it('fechamento segura exclusiva antes de P1/hash; escritor espera e relê fechado após commit', async () => {
    const chegou = barreira(); const liberar = barreira();
    const original = periodos.movimentos.bind(periodos);
    vi.spyOn(periodos, 'movimentos').mockImplementationOnce(async c => { chegou.resolve(); await liberar.promise; return original(c); });
    const situacao = app.app.get(SituacaoDoPeriodo);
    const proteger = situacao.proteger.bind(situacao);
    const niveis: string[] = [];
    vi.spyOn(situacao, 'proteger').mockImplementation(async p => {
      await app.app.get(UnidadeDeTrabalho).transacao('escrita', async ctx => {
        const linhas = await ctx.em.execute<{ transaction_isolation: string }[]>('show transaction_isolation');
        niveis.push(linhas[0]!.transaction_isolation);
      });
      return proteger(p);
    });
    const fechamento = comContexto(INSTITUICAO_A, () => operacoes.fechar(acesso, chave, 0));
    await chegou.promise;
    const escrita = pedirLancamento(app, AUTOR, ROTA, 'POST', completo);
    try { await esperarTravaBloqueada(banco); } finally { liberar.resolve(); }
    expect(await fechamento).toMatchObject({ tipo: 'ok', valor: { fechado: true } });
    expect((await escrita).corpo['erro']).toBe('PERIODO_FECHADO');
    expect(niveis).toEqual(['read committed']);
  });
  it('escritor segura compartilhada até o commit; fechamento espera e enxerga o pendente', async () => {
    const chegou = barreira(); const liberar = barreira();
    const repo = app.app.get(RepositorioDeLancamento); const adicionar = repo.adicionar.bind(repo);
    vi.spyOn(repo, 'adicionar').mockImplementationOnce(async l => { chegou.resolve(); await liberar.promise; return adicionar(l); });
    const escrita = pedirLancamento(app, AUTOR, ROTA, 'POST', completo);
    await chegou.promise;
    const fechamento = comContexto(INSTITUICAO_A, () => operacoes.fechar(acesso, chave, 0));
    try { await esperarTravaBloqueada(banco); } finally { liberar.resolve(); }
    expect((await escrita).status).toBe(201);
    expect(await fechamento).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_COM_PENDENCIAS', detalhes: { quantidade: 1 } } });
  });
  it('dois primeiros fechamentos concorrentes produzem só um período', async () => {
    const resultados = await Promise.all([
      comContexto(INSTITUICAO_A, () => operacoes.fechar(acesso, chave, 0)),
      comContexto(INSTITUICAO_A, () => operacoes.fechar(acesso, chave, 0)),
    ]);
    expect(resultados.map(r => r.tipo).toSorted()).toEqual(['erro', 'ok']);
    expect(resultados).toContainEqual(expect.objectContaining({ tipo: 'erro', erro: { codigo: 'VERSAO_DESATUALIZADA' } }));
  });
});
