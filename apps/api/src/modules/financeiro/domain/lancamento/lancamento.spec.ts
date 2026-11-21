import { describe, expect, it } from 'vitest';
import type { DadosDoLancamento, Etiqueta, LancamentoId, UsuarioId } from '@cdd/contracts';
import { Lancamento } from './lancamento.js';

const ID = '0198a3c0-0000-7000-8000-000000000001' as LancamentoId;
const AUTOR = '0198a3c0-0000-7000-8000-000000000002' as UsuarioId;
const OUTRO = '0198a3c0-0000-7000-8000-000000000003' as UsuarioId;
const EM = new Date('2026-11-02T15:00:00Z');
const categorias = ['0198a3c0-0000-7000-8000-000000000011', '0198a3c0-0000-7000-8000-000000000012', '0198a3c0-0000-7000-8000-000000000013'];
const etiqueta = (valor = 2000, natureza = 'DESPESA', categoriaId = categorias[0]) => ({ valor, natureza, categoriaId }) as Etiqueta;
const dados = (campos = {}) => ({ natureza: 'DESPESA', valor: 2000, motivo: 'Despesa', etiquetas: [], unidadeId: ID, grupoDeCustoId: null,
  contaId: ID, faturaId: null, pessoaId: null, contraparteTexto: null, formaPagamento: null, eventoId: null,
  dataCompetencia: '2026-10-01', dataCaixa: null, reembolsoAId: null, comprovanteId: null, ...campos }) as unknown as DadosDoLancamento;
function valor<T>(r: { tipo: 'ok'; valor: T } | { tipo: 'erro'; erro: unknown }): T {
  expect(r.tipo).toBe('ok');
  return (r as { tipo: 'ok'; valor: T }).valor;
}
const criar = (campos = {}, etiquetas = [etiqueta()]) => valor(Lancamento.registrar(ID, dados(campos), etiquetas, AUTOR, EM, true));
const confirmar = (l = criar()) => { valor(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true)); return l; };

describe('Lancamento — invariantes', () => {
  it.each([0, -1, 0.1, Number.NaN, Number.POSITIVE_INFINITY, 100_000_000_000_001])('L1 — valor %s inválido', (v) => {
    expect(Lancamento.registrar(ID, dados({ valor: v }), [], AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CORPO_INVALIDO' } });
  });
  it('L7 — registro rápido admite lacunas e etiquetas vazias, mas não confirma', () => {
    const l = criar({ unidadeId: null, contaId: null, dataCompetencia: null }, []);
    expect(l.estado.status).toBe('A_CONFERIR');
    expect(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'LANCAMENTO_INCOMPLETO' } });
  });
  it('L3 — caso Aline fecha 120 de despesa menos 100 de receita em 20 líquido', () => {
    const l = criar({}, [etiqueta(7000), etiqueta(5000, 'DESPESA', categorias[1]), etiqueta(10000, 'RECEITA', categorias[2])]);
    expect(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true).tipo).toBe('ok');
  });
  it.each([[[], 'CATEGORIA_OBRIGATORIA'], [[etiqueta(1000)], 'ETIQUETAS_NAO_FECHAM']] as const)('L3 — etiquetas %j impedem confirmação', (etiquetas, codigo) => {
    expect(criar({}, [...etiquetas]).confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo } });
  });
  it('L2 — confirmado não se edita, descarta ou confirma novamente', () => {
    const l = confirmar();
    expect(l.editar(dados(), [], AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'LANCAMENTO_JA_CONFIRMADO' } });
    expect(l.descartar(AUTOR, EM, true)).toMatchObject({ tipo: 'erro' });
    expect(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true)).toMatchObject({ tipo: 'erro' });
  });
  it('L5 — período fechado impede registrar, editar, confirmar e descartar', () => {
    const l = criar();
    expect(Lancamento.registrar(ID, dados(), [], AUTOR, EM, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
    expect(l.editar(dados(), [], AUTOR, EM, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
    expect(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
    expect(l.descartar(AUTOR, EM, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
  });
  it('L6 — caixa anterior à competência é recusado sem alterar o agregado', () => {
    const l = criar();
    expect(l.editar(dados({ dataCaixa: '2026-09-01' }), [], AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CAIXA_ANTES_DA_COMPETENCIA' } });
    expect(l.estado.dataCaixa).toBe(null);
  });
  it('L8 — integração de eventos não se edita ou descarta manualmente', () => {
    const l = valor(Lancamento.registrar(ID, dados(), [], AUTOR, EM, true, 'INTEGRACAO_EVENTOS'));
    expect(l.editar(dados(), [], AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'ORIGEM_NAO_EDITAVEL' } });
    expect(l.descartar(AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'ORIGEM_NAO_EDITAVEL' } });
  });
  it('L9 — estorno nasce confirmado no mês corrente e preserva original, natureza e etiquetas', () => {
    const original = confirmar();
    const antes = original.estado;
    const estorno = valor(original.estornar(OUTRO as unknown as LancamentoId, 'Correção', AUTOR, EM, '2026-11-02' as never, true, false));
    expect(original.estado).toEqual(antes);
    expect(estorno.estado).toMatchObject({ estornoDeId: ID, natureza: 'DESPESA', competencia: '2026-11', status: 'CONFIRMADO', etiquetas: antes.etiquetas });
  });
  it.each(['', '  '])('L9 — motivo %j vazio é recusado', (motivo) => {
    expect(confirmar().estornar(ID, motivo, AUTOR, EM, '2026-11-02' as never, true, false)).toMatchObject({ tipo: 'erro' });
  });
  it('L9 — não estorna não confirmado, estorno, duplicado ou período fechado', () => {
    expect(criar().estornar(ID, 'Erro', AUTOR, EM, '2026-11-02' as never, true, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'LANCAMENTO_NAO_CONFIRMADO' } });
    expect(confirmar().estornar(ID, 'Erro', AUTOR, EM, '2026-11-02' as never, true, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'LANCAMENTO_JA_ESTORNADO' } });
    expect(confirmar().estornar(ID, 'Erro', AUTOR, EM, '2026-11-02' as never, false, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
  });
  it('confirmação própria é permitida e integração usa autor SISTEMA', () => {
    expect(confirmar().estado.confirmadoPor).toEqual({ autorTipo: 'USUARIO', autorId: AUTOR });
    const l = criar();
    valor(l.confirmar({ autorTipo: 'SISTEMA', autorId: null }, EM, true));
    expect(l.estado.confirmadoPor).toEqual({ autorTipo: 'SISTEMA', autorId: null });
  });
  it('L10/L11 — pergunta ao registrador e só ele responde, sem alterar o status', () => {
    const l = criar();
    const p = valor(l.abrirPendencia('Qual evento?', OUTRO, EM, true));
    expect(p.destinatario).toBe(AUTOR);
    expect(l.responderPendencia(p.id, 'Resposta', OUTRO, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PENDENCIA_SO_DO_DESTINATARIO' } });
    valor(l.responderPendencia(p.id, 'Resposta', AUTOR, EM, true));
    expect(l.estado.status).toBe('A_CONFERIR');
    expect(l.pendencias[0]?.resposta).toBe('Resposta');
  });
  it('L10 — uma pendência aberta e nenhuma pergunta para si mesmo', () => {
    const l = criar();
    expect(l.abrirPendencia('Pergunta', AUTOR, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PENDENCIA_PARA_SI_MESMO' } });
    valor(l.abrirPendencia('Pergunta', OUTRO, EM, true));
    expect(l.abrirPendencia('Outra', OUTRO, EM, true)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PENDENCIA_JA_ABERTA' } });
  });
  it('snapshots não permitem mutar etiquetas ou estado fora do agregado', () => {
    const l = criar();
    const snapshot = l.estado;
    (snapshot as { motivo: string }).motivo = 'Alterado';
    (snapshot.etiquetas as Etiqueta[]).pop();
    expect(l.estado.motivo).toBe('Despesa');
    expect(l.estado.etiquetas).toHaveLength(1);
  });
});

describe('Lancamento — limites e caminhos de erro', () => {
  it.each([
    { natureza: 'OUTRA' }, { motivo: '' }, { motivo: 'a'.repeat(501) }, { motivo: 'a\0' },
    { pessoaId: ID, contraparteTexto: 'Duas contrapartes' },
    { dataCompetencia: '2026-02-30' }, { dataCompetencia: 'x' }, { dataCaixa: 'x' },
  ])('recusa forma inválida: %j', (campos) => {
    expect(Lancamento.registrar(ID, dados(campos), [], AUTOR, EM, true).tipo).toBe('erro');
  });
  it.each([
    { etiquetas: [etiqueta(), etiqueta()] }, { etiquetas: Array.from({ length: 21 }, (_, i) => etiqueta(1, 'DESPESA', String(i))) },
    { etiquetas: [etiqueta(0)] }, { etiquetas: [etiqueta(1, 'OUTRA')] },
  ])('recusa etiquetas inválidas %j', ({ etiquetas }) => {
    expect(Lancamento.registrar(ID, dados(), etiquetas, AUTOR, EM, true).tipo).toBe('erro');
  });
  it('edita e descarta A_CONFERIR, emitindo eventos e sem expor conteúdo livre no outbox', () => {
    const l = criar();
    valor(l.editar(dados({ motivo: ' Novo motivo ' }), [], AUTOR, EM, true));
    valor(l.descartar(AUTOR, EM, true));
    expect(l.estado.motivo).toBe('Novo motivo');
    expect(l.retirarEventos().map((e) => e.tipo)).toEqual(['LANCAMENTO_REGISTRADO', 'LANCAMENTO_EDITADO', 'LANCAMENTO_DESCARTADO']);
  });
  it('reconstitui o agregado sem eventos e preserva a conversa', () => {
    const l = criar();
    valor(l.abrirPendencia('Pergunta', OUTRO, EM, true));
    const copiado = Lancamento.reconstituir(l.estado, l.pendencias);
    expect(copiado.pendencias).toEqual(l.pendencias);
    expect(copiado.retirarEventos()).toEqual([]);
  });
  it('pendência aberta bloqueia confirmar até a resposta', () => {
    const l = criar();
    const p = valor(l.abrirPendencia('Pergunta', OUTRO, EM, true));
    expect(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true).tipo).toBe('erro');
    valor(l.responderPendencia(p.id, 'Ok', AUTOR, EM, true));
    valor(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true));
    expect(l.abrirPendencia('Outra', OUTRO, EM, true).tipo).toBe('erro');
    expect(l.responderPendencia(p.id, 'Outra', AUTOR, EM, true).tipo).toBe('erro');
  });
  it('pendências recusam texto vazio, período fechado e id desconhecido ou já respondido', () => {
    const l = criar();
    expect(l.abrirPendencia('', OUTRO, EM, true).tipo).toBe('erro');
    expect(l.abrirPendencia('Pergunta', OUTRO, EM, false).tipo).toBe('erro');
    expect(l.responderPendencia(ID as never, 'Resposta', AUTOR, EM, true).tipo).toBe('erro');
    const p = valor(l.abrirPendencia('Pergunta', OUTRO, EM, true));
    expect(l.responderPendencia(p.id, 'Resposta', AUTOR, EM, false).tipo).toBe('erro');
    expect(l.responderPendencia(p.id, '', AUTOR, EM, true).tipo).toBe('erro');
    valor(l.responderPendencia(p.id, 'Resposta', AUTOR, EM, true));
    expect(l.responderPendencia(p.id, 'Outra', AUTOR, EM, true).tipo).toBe('erro');
    const nova = valor(l.abrirPendencia('Nova', OUTRO, EM, true));
    valor(l.responderPendencia(nova.id, 'Segunda resposta', AUTOR, EM, true));
  });
  it('estorno recusa data inválida e não se estorna novamente', () => {
    expect(confirmar().estornar(ID, 'Erro', AUTOR, EM, 'x' as never, true, false).tipo).toBe('erro');
    const estorno = valor(confirmar().estornar(OUTRO as unknown as LancamentoId, 'Erro', AUTOR, EM, '2026-11-02' as never, true, false));
    expect(estorno.estornar(ID, 'Reverter', AUTOR, EM, '2026-11-02' as never, true, false)).toMatchObject({ tipo: 'erro', erro: { codigo: 'LANCAMENTO_JA_ESTORNADO' } });
  });
  it('data de caixa igual à competência e valor líquido de receita são válidos', () => {
    const l = criar({ natureza: 'RECEITA', dataCaixa: '2026-10-01' }, [etiqueta(2000, 'RECEITA')]);
    valor(l.confirmar({ autorTipo: 'USUARIO', autorId: AUTOR }, EM, true));
  });
});
