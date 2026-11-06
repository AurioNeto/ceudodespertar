import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DadosDoLancamento, Etiqueta, LancamentoId, UsuarioId } from '@cdd/contracts';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import { INSTITUICAO_A, INSTITUICAO_B, comContexto } from '../eventos/apoio.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { Lancamento } from '../../src/modules/financeiro/domain/lancamento/lancamento.js';
import { RepositorioDeLancamento } from '../../src/modules/financeiro/domain/lancamento/lancamento.repo.js';
import { idDoCadastro, subirAplicacaoDoFinanceiro } from './apoio-http.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';

const ID = '0198a3c0-0000-7000-8000-0000000000aa' as LancamentoId;
const AUTOR = '0198a3c0-0000-7000-8000-0000000000bb' as UsuarioId;
const EM = new Date('2026-11-02T12:00:00Z');
const PASTA = resolve('src/banco/migracoes/b1-004-lancamento');
const dados = { natureza: 'DESPESA', valor: 2000, motivo: 'Teste', etiquetas: [], unidadeId: null, grupoDeCustoId: null, contaId: null, faturaId: null,
  pessoaId: null, contraparteTexto: null, formaPagamento: null, eventoId: null, dataCompetencia: null, dataCaixa: null, reembolsoAId: null, comprovanteId: null } as unknown as DadosDoLancamento;
function obter<T>(r: { tipo: 'ok'; valor: T } | { tipo: 'erro'; erro: unknown }): T {
  expect(r.tipo).toBe('ok');
  return (r as { tipo: 'ok'; valor: T }).valor;
}

describe('lançamento — persistência e guardas mínimas', () => {
  let banco: BancoDeTeste;
  let app: AplicacaoDeAcesso;
  let repo: RepositorioDeLancamento;
  let l: Lancamento;
  let categoria: string;
  const emA = <T>(fn: () => Promise<T>) => comContexto(INSTITUICAO_A, fn);

  beforeEach(async () => {
    banco = await criarBancoDeTeste(); app = await subirAplicacaoDoFinanceiro(banco); repo = app.app.get(RepositorioDeLancamento);
    categoria = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'MANUTENCAO');
    l = obter(Lancamento.registrar(ID, dados, [], AUTOR, EM, true));
    await emA(() => repo.adicionar(l));
  });
  afterEach(async () => { await app.encerrar(); await derrubarBancoDeTeste(banco); });

  it('roundtrip com outbox e isolamento por instituição', async () => {
    const relido = await emA(() => repo.porId(ID));
    expect(relido?.estado).toEqual(l.estado);
    expect(await comContexto(INSTITUICAO_B, () => repo.porId(ID))).toBeUndefined();
    const { rows } = await banco.owner.query('select tipo, payload from shared.outbox where agregado_id = $1', [ID]);
    expect(rows).toEqual([{ tipo: 'LANCAMENTO_REGISTRADO', payload: { autorId: AUTOR, lancamentoId: ID } }]);
  });

  it('versão otimista impede duas gravações do mesmo estado', async () => {
    const a = (await emA(() => repo.porId(ID)))!;
    const b = (await emA(() => repo.porId(ID)))!;
    expect(obter(a.editar({ ...dados, motivo: 'Atualizado' }, [], AUTOR, EM, true))).toBeUndefined();
    expect(await emA(() => repo.salvar(a))).toBe(2);
    await expect(emA(() => repo.salvar(b))).rejects.toThrow();
    expect((await emA(() => repo.porId(ID)))?.estado.motivo).toBe('Atualizado');
  });

  it('confirmar e gravar etiquetas na mesma transação é permitido; transação seguinte não muda nem apaga confirmado', async () => {
    const etiqueta = { categoriaId: categoria, natureza: 'DESPESA', valor: 2000 } as Etiqueta;
    await emA(() => app.app.get(UnidadeDeTrabalho).transacao('escrita', async ({ kysely }) => {
      await kysely.updateTable('financeiro.lancamento').set({ status: 'CONFIRMADO' }).where('id', '=', ID).execute();
      await kysely.insertInto('financeiro.lancamento_categoria').values({ instituicao_id: INSTITUICAO_A, lancamento_id: ID, categoria_id: etiqueta.categoriaId, natureza: etiqueta.natureza, valor: etiqueta.valor }).execute();
    }));
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, 'update financeiro.lancamento set motivo = $1 where id = $2', ['Outro', ID])).rejects.toThrow('LANCAMENTO_IMUTAVEL');
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, 'delete from financeiro.lancamento where id = $1', [ID])).rejects.toThrow('LANCAMENTO_IMUTAVEL');
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, 'update financeiro.lancamento_categoria set valor = 1 where lancamento_id = $1', [ID])).rejects.toThrow('LANCAMENTO_IMUTAVEL');
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, 'delete from financeiro.lancamento_categoria where lancamento_id = $1', [ID])).rejects.toThrow('LANCAMENTO_IMUTAVEL');
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, 'update financeiro.lancamento set gravado_na_transacao = pg_current_xact_id() where id = $1', [ID])).rejects.toThrow('LANCAMENTO_IMUTAVEL');
  });

  it('A_CONFERIR pode ser descartado com filhos na mesma transação', async () => {
    obter(l.abrirPendencia('Pergunta', '0198a3c0-0000-7000-8000-0000000000cc' as UsuarioId, EM, true));
    await emA(() => repo.salvar(l));
    const relido = (await emA(() => repo.porId(ID)))!;
    obter(relido.descartar(AUTOR, EM, true));
    await emA(() => repo.excluir(relido));
    expect(await emA(() => repo.porId(ID))).toBeUndefined();
    expect(await consultarNaInstituicao(banco, INSTITUICAO_A, 'select * from financeiro.pendencia')).toEqual([]);
  });

  it('migração desfaz e reaplica sem afetar os cadastros anteriores', async () => {
    await banco.owner.query(readFileSync(resolve(PASTA, 'desfazer.sql'), 'utf8'));
    expect((await banco.owner.query("select to_regclass('financeiro.lancamento') as lancamento, to_regclass('financeiro.conta') as conta")).rows).toEqual([{ lancamento: null, conta: 'financeiro.conta' }]);
    await banco.owner.query(readFileSync(resolve(PASTA, 'lancamento.sql'), 'utf8'));
    expect((await banco.owner.query("select relforcerowsecurity from pg_class where oid = 'financeiro.lancamento'::regclass")).rows).toEqual([{ relforcerowsecurity: true }]);
  });
});
