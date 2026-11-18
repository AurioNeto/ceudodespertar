import { Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistrarTransferencia, TransferenciaId, UsuarioId } from '@cdd/contracts';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import { INSTITUICAO_A, INSTITUICAO_B, comContexto } from '../eventos/apoio.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { Transferencia } from '../../src/modules/financeiro/domain/transferencia/transferencia.js';
import { RepositorioDeTransferencia } from '../../src/modules/financeiro/domain/transferencia/transferencia.repo.js';
import { idDoCadastro, subirAplicacaoDoFinanceiro } from './apoio-http.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';

const ID = '0198a3c0-0000-7000-8000-0000000000aa' as TransferenciaId;
const AUTOR = '0198a3c0-0000-7000-8000-0000000000bb' as UsuarioId;
const DESTINO = '0198a3c0-0000-7000-8000-0000000000cc';
const EM = new Date('2026-11-02T12:00:00Z');
const PASTA = resolve('src/banco/migracoes/b1-005-transferencia');
function obter<T>(r: { tipo: 'ok'; valor: T } | { tipo: 'erro'; erro: unknown }): T {
  expect(r.tipo).toBe('ok');
  return (r as { tipo: 'ok'; valor: T }).valor;
}

describe('transferência — persistência e migração', () => {
  let banco: BancoDeTeste;
  let app: AplicacaoDeAcesso;
  let repo: RepositorioDeTransferencia;
  let t: Transferencia;
  let dados: RegistrarTransferencia;
  const emA = <T>(fn: () => Promise<T>) => comContexto(INSTITUICAO_A, fn);
  beforeEach(async () => {
    banco = await criarBancoDeTeste(); app = await subirAplicacaoDoFinanceiro(banco); repo = app.app.get(RepositorioDeTransferencia);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.conta (id, instituicao_id, nome, tipo, titularidade) values ($1, $3, 'Origem', 'DINHEIRO', 'INSTITUCIONAL'), ($2, $3, 'Destino', 'DINHEIRO', 'INSTITUCIONAL')", [ID, DESTINO, INSTITUICAO_A]);
    dados = { finalidade: 'MOVIMENTACAO_SIMPLES', valor: 2000, motivo: 'Teste', data: '2026-10-01', contaOrigemId: ID, contaDestinoId: DESTINO,
      unidadeId: await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'CDD'), unidadeDestinoId: null, fundoId: null, faturaId: null, emprestimoId: null, adiantamentoId: null } as unknown as RegistrarTransferencia;
    t = obter(Transferencia.registrar(ID, dados, AUTOR, EM, true));
    await emA(() => repo.adicionar(t));
  });
  afterEach(async () => { vi.restoreAllMocks(); await app.encerrar(); await derrubarBancoDeTeste(banco); });
  it('roundtrip e evento sem motivo, com isolamento entre instituições', async () => {
    expect((await emA(() => repo.porId(ID)))?.estado).toEqual(t.estado);
    expect(await comContexto(INSTITUICAO_B, () => repo.porId(ID))).toBeUndefined();
    const { rows } = await banco.owner.query('select tipo, payload from shared.outbox where agregado_id = $1', [ID]);
    expect(rows).toEqual([{ tipo: 'TRANSFERENCIA_REGISTRADA', payload: { autorId: AUTOR, transferenciaId: ID } }]);
  });
  it('versão otimista impede atualização e exclusão obsoletas', async () => {
    const antigo = (await emA(() => repo.porId(ID)))!;
    obter(t.editar({ ...dados, motivo: 'Atualizada' }, AUTOR, EM, true));
    expect(await emA(() => repo.salvar(t))).toBe(2);
    await expect(emA(() => repo.salvar(antigo))).rejects.toThrow();
    await expect(emA(() => repo.excluir(antigo))).rejects.toThrow();
    expect((await emA(() => repo.porId(ID)))?.estado.motivo).toBe('Atualizada');
  });
  it('rollback da transação desfaz transferência e evento juntos', async () => {
    const novoId = DESTINO as TransferenciaId;
    const nova = obter(Transferencia.registrar(novoId, dados, AUTOR, EM, true));
    await expect(emA(() => app.app.get(UnidadeDeTrabalho).transacao('escrita', async () => {
      await repo.adicionar(nova);
      throw new Error('Reverter transação');
    }))).rejects.toThrow('Reverter transação');
    expect(await emA(() => repo.porId(novoId))).toBeUndefined();
    expect((await banco.owner.query('select * from shared.outbox where agregado_id = $1', [novoId])).rows).toEqual([]);
  });
  it('alarme detecta estornos duplicados e leitura prioriza o confirmado', async () => {
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.transferencia select gen_random_uuid(), instituicao_id, finalidade, 'A_CONFERIR', valor, data, conta_origem_id, conta_destino_id, unidade_id, unidade_destino_id, fundo_id, fatura_id, emprestimo_id, adiantamento_id, motivo, id, registrado_por, registrado_em, null, null, 1 from financeiro.transferencia where id = $1", [ID]);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.transferencia select gen_random_uuid(), instituicao_id, finalidade, 'CONFIRMADO', valor, data, conta_origem_id, conta_destino_id, unidade_id, unidade_destino_id, fundo_id, fatura_id, emprestimo_id, adiantamento_id, motivo, id, registrado_por, registrado_em, registrado_por, registrado_em, 1 from financeiro.transferencia where id = $1", [ID]);
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    expect(await emA(() => repo.estornoDe(ID))).toMatchObject({ status: 'CONFIRMADO' });
    expect(log).toHaveBeenCalledWith({ alarme: 'ESTORNOS_DE_TRANSFERENCIA_DUPLICADOS', transferenciaId: ID, instituicaoId: INSTITUICAO_A });
  });
  it('migração desfaz e reaplica preservando lançamentos e contas anteriores', async () => {
    await banco.owner.query(readFileSync(resolve(PASTA, 'desfazer.sql'), 'utf8'));
    expect((await banco.owner.query("select to_regclass('financeiro.transferencia') as transferencia, to_regclass('financeiro.lancamento') as lancamento, to_regclass('financeiro.conta') as conta")).rows).toEqual([{ transferencia: null, lancamento: 'financeiro.lancamento', conta: 'financeiro.conta' }]);
    await banco.owner.query(readFileSync(resolve(PASTA, 'transferencia.sql'), 'utf8'));
    expect((await banco.owner.query("select relforcerowsecurity from pg_class where oid = 'financeiro.transferencia'::regclass")).rows).toEqual([{ relforcerowsecurity: true }]);
  });
  it.each([
    "update financeiro.transferencia set fundo_id = id where id = $1",
    "update financeiro.transferencia set finalidade = 'PAGAMENTO_DE_FATURA' where id = $1",
    "update financeiro.transferencia set finalidade = 'CONCESSAO_DE_EMPRESTIMO' where id = $1",
    "update financeiro.transferencia set finalidade = 'RESSARCIMENTO_DE_ADIANTAMENTO' where id = $1",
    "update financeiro.transferencia set finalidade = 'REPASSE_ENTRE_UNIDADES' where id = $1",
  ])('CHECK rejeita referência incompatível com finalidade: %s', async (sql) => {
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, sql, [ID])).rejects.toThrow();
    expect((await emA(() => repo.porId(ID)))?.estado.finalidade).toBe('MOVIMENTACAO_SIMPLES');
  });
});
