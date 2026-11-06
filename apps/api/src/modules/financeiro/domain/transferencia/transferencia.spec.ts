import { describe, expect, it } from 'vitest';
import type { RegistrarTransferencia, TransferenciaId, UsuarioId } from '@cdd/contracts';
import { Transferencia } from './transferencia.js';

const ID = '0198a3c0-0000-7000-8000-000000000001' as TransferenciaId;
const AUTOR = '0198a3c0-0000-7000-8000-000000000002' as UsuarioId;
const OUTRO = '0198a3c0-0000-7000-8000-000000000003' as UsuarioId;
const EM = new Date('2026-11-02T12:00:00Z');
const dados = (campos = {}) => ({ finalidade: 'MOVIMENTACAO_SIMPLES', valor: 2000, data: '2026-10-01', contaOrigemId: ID,
  contaDestinoId: '0198a3c0-0000-7000-8000-000000000004', unidadeId: ID, unidadeDestinoId: null, fundoId: null,
  faturaId: null, emprestimoId: null, adiantamentoId: null, motivo: ' Transferência ', ...campos }) as unknown as RegistrarTransferencia;
function valor<T>(r: { tipo: 'ok'; valor: T } | { tipo: 'erro'; erro: unknown }): T {
  expect(r.tipo).toBe('ok');
  return (r as { tipo: 'ok'; valor: T }).valor;
}
const criar = (campos = {}) => valor(Transferencia.registrar(ID, dados(campos), AUTOR, EM, true));
const confirmar = () => { const t = criar(); valor(t.confirmar(OUTRO, EM, true)); return t; };

describe('Transferencia — regras de domínio', () => {
  it('registra A_CONFERIR, deriva competência da data e emite evento sem motivo no payload', () => {
    const t = criar();
    expect(t.estado).toMatchObject({ status: 'A_CONFERIR', motivo: 'Transferência', confirmadoPor: null, versao: 1 });
    expect(t.competencia).toBe('2026-10');
    expect(t.retirarEventos()).toEqual([expect.objectContaining({ tipo: 'TRANSFERENCIA_REGISTRADA', dados: { transferenciaId: ID, autorId: AUTOR } })]);
  });
  it('quem registrou não confirma a própria, ainda que tenha permissão', () => {
    const t = criar();
    expect(t.confirmar(AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CONFERENTE_E_O_AUTOR' } });
    expect(t.estado.status).toBe('A_CONFERIR');
    valor(t.confirmar(OUTRO, EM, true));
    expect(t.estado).toMatchObject({ status: 'CONFIRMADO', confirmadoPor: OUTRO });
  });
  it.each([0, -1, 0.1, Number.NaN, Number.POSITIVE_INFINITY, 100_000_000_000_001])('recusa valor %s', (v) => {
    expect(Transferencia.registrar(ID, dados({ valor: v }), AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CORPO_INVALIDO' } });
  });
  it.each([
    { data: 'x' }, { data: '2026-02-30' }, { motivo: '' }, { motivo: ' ' }, { motivo: 'x\0' }, { motivo: 'x'.repeat(501) },
    { contaOrigemId: null }, { contaDestinoId: null }, { contaDestinoId: ID }, { unidadeId: null },
    { fundoId: ID }, { unidadeDestinoId: ID }, { faturaId: ID }, { emprestimoId: ID }, { adiantamentoId: ID },
    { finalidade: 'APORTE_A_FUNDO' }, { finalidade: 'REPASSE_ENTRE_UNIDADES' },
    { finalidade: 'REPASSE_ENTRE_UNIDADES', unidadeDestinoId: ID },
  ])('recusa forma ou referência incompatível com finalidade: %j', (campos) => {
    expect(Transferencia.registrar(ID, dados(campos), AUTOR, EM, true).tipo).toBe('erro');
  });
  it.each(['PAGAMENTO_DE_FATURA', 'CONCESSAO_DE_EMPRESTIMO', 'DEVOLUCAO_DE_EMPRESTIMO', 'RESSARCIMENTO_DE_ADIANTAMENTO', 'OUTRA'])('finalidade %s não entra na B1', (finalidade) => {
    expect(Transferencia.registrar(ID, dados({ finalidade }), AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CORPO_INVALIDO' } });
  });
  it.each([
    { finalidade: 'APORTE_A_FUNDO', fundoId: ID },
    { finalidade: 'REPASSE_ENTRE_UNIDADES', unidadeDestinoId: '0198a3c0-0000-7000-8000-000000000009' },
  ])('aceita finalidade B1 com a referência correta: %j', (campos) => {
    expect(criar(campos).estado).toMatchObject(campos);
  });
  it('confirmada não se edita, descarta ou confirma de novo', () => {
    const t = confirmar();
    expect(t.editar(dados(), AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'TRANSFERENCIA_JA_CONFIRMADA' } });
    expect(t.descartar(AUTOR, EM, true).tipo).toBe('erro');
    expect(t.confirmar(OUTRO, EM, true).tipo).toBe('erro');
  });
  it('edição preserva o registrador original e não permite assumir a confirmação', () => {
    const t = criar();
    valor(t.editar(dados({ motivo: 'Alterada' }), OUTRO, EM, true));
    expect(t.estado).toMatchObject({ motivo: 'Alterada', registradoPor: AUTOR });
    expect(t.confirmar(AUTOR, EM, true).tipo).toBe('erro');
    valor(t.descartar(AUTOR, EM, true));
  });
  it('período fechado bloqueia registrar, editar, confirmar e descartar', () => {
    const t = criar();
    expect(Transferencia.registrar(ID, dados(), AUTOR, EM, false).tipo).toBe('erro');
    expect(t.editar(dados(), AUTOR, EM, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
    expect(t.confirmar(OUTRO, EM, false).tipo).toBe('erro');
    expect(t.descartar(AUTOR, EM, false).tipo).toBe('erro');
  });
  it('estorno é novo A_CONFERIR corrente, com mesmas contas e valor, sem tocar no original', () => {
    const original = confirmar();
    const antes = original.estado;
    const estorno = valor(original.estornar(OUTRO as unknown as TransferenciaId, 'Correção', AUTOR, EM, '2026-11-02' as never, true));
    expect(original.estado).toEqual(antes);
    expect(estorno.estado).toMatchObject({ estornoDeId: ID, status: 'A_CONFERIR', valor: 2000, data: '2026-11-02', contaOrigemId: antes.contaOrigemId, contaDestinoId: antes.contaDestinoId });
    expect(estorno.confirmar(AUTOR, EM, true).tipo).toBe('erro');
    valor(estorno.confirmar(OUTRO, EM, true));
    expect(estorno.editar(dados(), OUTRO, EM, true).tipo).toBe('erro');
  });
  it('estorno pendente não muda os dados copiados, mas pode ser descartado', () => {
    const estorno = valor(confirmar().estornar(OUTRO as unknown as TransferenciaId, 'Correção', AUTOR, EM, '2026-11-02' as never, true));
    expect(estorno.editar(dados(), AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'ORIGEM_NAO_EDITAVEL' } });
    valor(estorno.descartar(AUTOR, EM, true));
  });
  it('não estorna A_CONFERIR, estorno já confirmado, data ou motivo inválido, nem período fechado', () => {
    expect(criar().estornar(ID, 'Correção', AUTOR, EM, '2026-11-02' as never, true).tipo).toBe('erro');
    expect(confirmar().estornar(ID, '', AUTOR, EM, '2026-11-02' as never, true).tipo).toBe('erro');
    expect(confirmar().estornar(ID, 'Correção', AUTOR, EM, 'x' as never, true).tipo).toBe('erro');
    expect(confirmar().estornar(ID, 'Correção', AUTOR, EM, '2026-11-02' as never, false).tipo).toBe('erro');
    const estorno = valor(confirmar().estornar(OUTRO as unknown as TransferenciaId, 'Correção', AUTOR, EM, '2026-11-02' as never, true));
    valor(estorno.confirmar(OUTRO, EM, true));
    expect(estorno.estornar(ID, 'De novo', AUTOR, EM, '2026-11-02' as never, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'TRANSFERENCIA_JA_ESTORNADA' } });
  });
  it('snapshots e reconstituição não permitem alteração indireta nem reemitem eventos', () => {
    const t = criar(); const estado = t.estado;
    (estado as { motivo: string }).motivo = 'Indireto';
    expect(t.estado.motivo).toBe('Transferência');
    expect(Transferencia.reconstituir(t.estado).retirarEventos()).toEqual([]);
  });
  it('edição inválida não muda o estado ou emite evento', () => {
    const t = criar();
    t.retirarEventos();
    expect(t.editar(dados({ motivo: '' }), AUTOR, EM, true).tipo).toBe('erro');
    expect(t.estado.motivo).toBe('Transferência');
    expect(t.retirarEventos()).toEqual([]);
  });

});
