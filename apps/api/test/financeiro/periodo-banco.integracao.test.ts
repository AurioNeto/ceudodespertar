import { travarPeriodos } from '../../src/modules/financeiro/infrastructure/periodos/trava-de-periodo.js';
import { Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Competencia, PeriodoContabilId, UnidadeId, UsuarioId } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { OperacoesDePeriodo } from '../../src/modules/financeiro/application/periodos/operacoes-de-periodo.js';
import { PeriodoContabil } from '../../src/modules/financeiro/domain/periodo/periodo-contabil.js';
import { RepositorioDePeriodo } from '../../src/modules/financeiro/domain/periodo/periodo-contabil.repo.js';
import { RepositorioDeLancamento } from '../../src/modules/financeiro/domain/lancamento/lancamento.repo.js';
import { SituacaoDoPeriodo } from '../../src/modules/financeiro/application/lancamentos/situacao-do-periodo.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { INSTITUICAO_A, INSTITUICAO_B, comContexto } from '../eventos/apoio.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { AUTOR, TESOURARIA, ROTA, subirLancamentos, pedirLancamento } from './apoio-lancamentos.js';
const USUARIO = '0198a3c0-0000-7000-8000-0000000000aa' as UsuarioId;
const acesso = { usuarioId: USUARIO } as ContextoDeAcesso;
const EM = new Date('2026-11-02T12:00:00Z');
const PASTA = resolve('src/banco/migracoes/b1-006-periodo-contabil');
describe('período — persistência, guardas e rollback', () => {
  let banco: BancoDeTeste; let app: AplicacaoDeAcesso; let completo: Record<string, unknown>;
  let operacoes: OperacoesDePeriodo; let repo: RepositorioDePeriodo;
  let chave: { unidadeId: UnidadeId; competencia: Competencia };
  const emA = <T>(fn: () => Promise<T>) => comContexto(INSTITUICAO_A, fn);
  const fechar = () => emA(() => operacoes.fechar(acesso, chave, 0));
  const reabrir = () => emA(() => operacoes.reabrir(acesso, chave, 1, 'Revisar classificação'));
  beforeEach(async () => {
    banco = await criarBancoDeTeste(); ({ app, completo } = await subirLancamentos(banco));
    operacoes = app.app.get(OperacoesDePeriodo); repo = app.app.get(RepositorioDePeriodo);
    chave = { unidadeId: completo['unidadeId'] as UnidadeId, competencia: '2026-10' as Competencia };
  });
  afterEach(async () => { vi.restoreAllMocks(); await app.encerrar(); await derrubarBancoDeTeste(banco); });
  it('roundtrip, eventos e isolamento da reabertura', async () => {
    await fechar(); await reabrir();
    expect((await emA(() => repo.porChave(chave)))?.estado).toMatchObject({ fechado: false, versao: 2, reaberturas: [{ motivo: 'Revisar classificação' }] });
    expect(await comContexto(INSTITUICAO_B, () => repo.porChave(chave))).toBeUndefined();
    expect((await banco.owner.query("select tipo from shared.outbox where tipo like 'PERIODO_%' order by tipo")).rows).toEqual([{ tipo: 'PERIODO_FECHADO' }, { tipo: 'PERIODO_REABERTO' }]);
  });
  it.each(["update financeiro.periodo_contabil set hash_sha256 = 'outro'", 'delete from financeiro.periodo_contabil'])('fechado não muda nem some: %s', async sql => {
    await fechar();
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, sql, [])).rejects.toThrow('PERIODO_FECHADO');
    expect((await emA(() => repo.porChave(chave)))?.estado.fechado).toBe(true);
  });
  it.each(['unidade_id = gen_random_uuid()', "competencia = '2026-09-01'", 'id = gen_random_uuid()'])('identidade não muda nem aberto: %s', async mudanca => {
    await fechar(); await reabrir();
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, `update financeiro.periodo_contabil set ${mudanca}`, [])).rejects.toThrow('REGISTRO_IMUTAVEL');
  });
  it.each(['update financeiro.reabertura_de_periodo set motivo = \'Mudar histórico\'', 'delete from financeiro.reabertura_de_periodo'])('histórico é só-inserção até para o dono: %s', async sql => {
    await fechar(); await reabrir();
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, sql, [])).rejects.toThrow('REGISTRO_IMUTAVEL');
  });
  it('rollback desfaz reabertura, período e outbox juntos', async () => {
    await fechar();
    await expect(emA(() => app.app.get(UnidadeDeTrabalho).transacao('escrita', async () => {
      await operacoes.reabrir(acesso, chave, 1, 'Revisar classificação');
      throw new Error('Desfazer');
    }))).rejects.toThrow('Desfazer');
    expect((await emA(() => repo.porChave(chave)))?.estado).toMatchObject({ fechado: true, versao: 1, reaberturas: [] });
    expect(await consultarNaInstituicao(banco, INSTITUICAO_A, 'select * from financeiro.reabertura_de_periodo')).toEqual([]);
    expect((await banco.owner.query("select * from shared.outbox where tipo = 'PERIODO_REABERTO'")).rows).toEqual([]);
  });
  it('versão antiga não reabre nem acrescenta história', async () => {
    await fechar(); const antigo = (await emA(() => repo.porChave(chave)))!;
    await reabrir(); antigo.reabrir('Outra reabertura', USUARIO, EM);
    await expect(emA(() => repo.salvar(antigo))).rejects.toThrow();
    expect((await emA(() => repo.porChave(chave)))?.estado.reaberturas).toHaveLength(1);
  });
  it('unicidade é verificada na aplicação e duplicação externa dispara alarme', async () => {
    await fechar();
    const outro = PeriodoContabil.abrir('0198a3c0-0000-7000-8000-0000000000bb' as PeriodoContabilId, chave.unidadeId, chave.competencia);
    await expect(emA(() => repo.adicionar(outro))).rejects.toThrow();
    await gravarNaInstituicao(banco, INSTITUICAO_A, 'insert into financeiro.periodo_contabil (id, instituicao_id, unidade_id, competencia) values (gen_random_uuid(), $1, $2, $3)', [INSTITUICAO_A, chave.unidadeId, '2026-10-01']);
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await expect(emA(() => repo.porChave(chave))).rejects.toThrow();
    expect(log).toHaveBeenCalledWith({ alarme: 'PERIODOS_CONTABEIS_DUPLICADOS', instituicaoId: INSTITUICAO_A, ...chave });
  });
  it('repositório de lançamento também recusa escrita direta em período fechado', async () => {
    const r = await pedirLancamento(app, AUTOR, ROTA, 'POST', completo);
    const lancamentos = app.app.get(RepositorioDeLancamento);
    const l = (await emA(() => lancamentos.porId(r.corpo['id'] as never)))!;
    await gravarNaInstituicao(banco, INSTITUICAO_A, "update financeiro.lancamento set status = 'CONFIRMADO' where id = $1", [l.id]);
    await fechar();
    await expect(emA(() => lancamentos.excluir(l))).rejects.toThrow('PERIODO_FECHADO');
    await expect(emA(() => lancamentos.salvar(l))).rejects.toThrow('PERIODO_FECHADO');
  });
  it('unidade sem período está aberta; primeira competência e virada de ano têm suporte', async () => {
    expect(await emA(() => app.app.get(SituacaoDoPeriodo).estaAberto(chave.unidadeId, chave.competencia))).toBe(true);
    expect(await emA(() => operacoes.fechar(acesso, { ...chave, competencia: '0001-01' as Competencia }, 0))).toMatchObject({ tipo: 'ok' });
    expect(await emA(() => operacoes.fechar(acesso, { ...chave, competencia: '2026-12' as Competencia }, 0))).toMatchObject({ tipo: 'erro' });
  });
  it('hash inclui etiquetas e ignora movimentos de outro mês', async () => {
    const r = await pedirLancamento(app, AUTOR, ROTA, 'POST', completo);
    await pedirLancamento(app, TESOURARIA, `${r.location}/confirmar`, 'POST', {}, 1);
    await fechar();
    const antes = await emA(() => operacoes.verificar(chave)); expect(antes).toMatchObject({ tipo: 'ok', valor: { integro: true } });
    expect((await pedirLancamento(app, AUTOR, ROTA, 'POST', { ...completo, dataCompetencia: '2026-11-01' })).status).toBe(201);
    expect(await emA(() => operacoes.verificar(chave))).toEqual(antes);
    await banco.owner.query('alter table financeiro.lancamento_categoria disable trigger etiqueta_guarda');
    await gravarNaInstituicao(banco, INSTITUICAO_A, 'update financeiro.lancamento_categoria set valor = valor + 1 where lancamento_id = $1', [r.corpo['id']]);
    await banco.owner.query('alter table financeiro.lancamento_categoria enable trigger etiqueta_guarda');
    expect(await emA(() => operacoes.verificar(chave))).toMatchObject({ tipo: 'ok', valor: { integro: false } });
  });
  it('migration reverte e reaplica sem mexer nas tabelas financeiras anteriores', async () => {
    await banco.owner.query(readFileSync(resolve(PASTA, 'desfazer.sql'), 'utf8'));
    expect((await banco.owner.query("select to_regclass('financeiro.periodo_contabil') as periodo, to_regclass('financeiro.transferencia') as transferencia")).rows).toEqual([{ periodo: null, transferencia: 'financeiro.transferencia' }]);
    await banco.owner.query(readFileSync(resolve(PASTA, 'periodo.sql'), 'utf8'));
    expect((await banco.owner.query("select relforcerowsecurity from pg_class where oid = 'financeiro.periodo_contabil'::regclass")).rows).toEqual([{ relforcerowsecurity: true }]);
  });
  it('trava repetida mantém o modo mais forte sem duplicar a chave', async () => {
    await emA(() => app.app.get(UnidadeDeTrabalho).transacao('escrita', async ctx => {
      await travarPeriodos(ctx, [{ ...chave, exclusiva: false }, { ...chave, exclusiva: true }, { ...chave, exclusiva: false }, { ...chave, competencia: '2026-11' as Competencia, exclusiva: false }]);
      const modos = await ctx.em.execute<{ mode: string }[]>("select mode from pg_locks where pid = pg_backend_pid() and locktype = 'advisory' order by mode");
      expect(modos).toEqual([{ mode: 'ExclusiveLock' }, { mode: 'ShareLock' }]);
    }));
  });
  it('snapshot inclui lançamento sem etiquetas e informa pendência', async () => {
    const r = await pedirLancamento(app, AUTOR, ROTA, 'POST', { ...completo, etiquetas: [] });
    expect(r.status).toBe(201);
    const snapshot = await emA(() => repo.movimentos(chave));
    expect(snapshot.pendentes).toBe(1);
    expect(snapshot.movimentos.lancamentos).toEqual([expect.objectContaining({ id: r.corpo['id'], etiquetas: [] })]);
  });
  it('criação aberta e tentativa de salvar ausente preservam a versão otimista', async () => {
    const aberto = PeriodoContabil.abrir('0198a3c0-0000-7000-8000-0000000000bb' as PeriodoContabilId, chave.unidadeId, chave.competencia);
    await expect(emA(() => repo.salvar(aberto))).rejects.toThrow();
    await emA(() => repo.adicionar(aberto));
    expect((await emA(() => repo.porChave(chave)))?.estado).toEqual(aberto.estado);
  });

  it('hash representa os mesmos instantes em qualquer fuso da conexão', async () => {
    const r = await pedirLancamento(app, AUTOR, ROTA, 'POST', completo);
    await pedirLancamento(app, TESOURARIA, `${r.location}/confirmar`, 'POST', {}, 1);
    await fechar();
    const resultado = await emA(() => app.app.get(UnidadeDeTrabalho).transacao('leitura', async ctx => {
      await ctx.em.execute("set local TimeZone = 'America/Sao_Paulo'");
      return operacoes.verificar(chave);
    }));
    expect(resultado).toMatchObject({ tipo: 'ok', valor: { integro: true } });
  });

});
