import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistrarTransferencia } from '@cdd/contracts';
import { ResolverDadosDaTransferencia } from './resolver-dados-da-transferencia.js';

const ID = '0198a3c0-0000-7000-8000-000000000001';
const DESTINO = '0198a3c0-0000-7000-8000-000000000002';
const dados = { finalidade: 'MOVIMENTACAO_SIMPLES', valor: 2000, data: '2026-10-01', contaOrigemId: ID, contaDestinoId: DESTINO, unidadeId: ID,
  unidadeDestinoId: null, fundoId: null, faturaId: null, emprestimoId: null, adiantamentoId: null, motivo: 'Transferência' } as unknown as RegistrarTransferencia;
const aporte = { ...dados, finalidade: 'APORTE_A_FUNDO', fundoId: ID } as RegistrarTransferencia;

describe('ResolverDadosDaTransferencia', () => {
  const unidades = { porId: vi.fn(), listar: vi.fn(), adicionar: vi.fn(), salvar: vi.fn() };
  const contas = { ...unidades, porId: vi.fn() };
  const fundos = { ...unidades, porId: vi.fn() };
  const resolver = new ResolverDadosDaTransferencia(unidades, contas, fundos);
  beforeEach(() => { vi.resetAllMocks(); unidades.porId.mockResolvedValue({ ativa: true }); contas.porId.mockResolvedValue({ ativa: true }); fundos.porId.mockResolvedValue({ ativo: true, contaVinculadaId: DESTINO }); });
  it('recusa forma inválida antes de consultar cadastros', async () => {
    expect(await resolver.executar({ ...dados, valor: 0 as RegistrarTransferencia['valor'] })).toMatchObject({ tipo: 'erro' });
    expect(unidades.porId).not.toHaveBeenCalled();
  });
  it('aceita movimentação e aporte com conta vinculada', async () => {
    expect(await resolver.executar(dados)).toMatchObject({ tipo: 'ok' });
    expect(fundos.porId).not.toHaveBeenCalled();
    expect(await resolver.executar(aporte)).toMatchObject({ tipo: 'ok' });
  });
  it('valida unidade de destino do repasse', async () => {
    expect(await resolver.executar({ ...dados, finalidade: 'REPASSE_ENTRE_UNIDADES', unidadeDestinoId: DESTINO as RegistrarTransferencia['unidadeId'] })).toMatchObject({ tipo: 'ok' });
    expect(unidades.porId).toHaveBeenCalledWith(DESTINO);
  });
  it.each(['unidade', 'conta', 'fundo'] as const)('recusa %s ausente', async (tipo) => {
    const repos = { unidade: unidades, conta: contas, fundo: fundos };
    repos[tipo].porId.mockResolvedValue(undefined);
    expect(await resolver.executar(aporte)).toMatchObject({ tipo: 'erro', erro: { codigo: 'RECURSO_NAO_ENCONTRADO' } });
  });
  it.each(['unidade', 'conta', 'fundo'] as const)('recusa %s inativo', async (tipo) => {
    const repos = { unidade: unidades, conta: contas, fundo: fundos };
    repos[tipo].porId.mockResolvedValue({ ativa: false, ativo: false });
    expect(await resolver.executar(aporte)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CADASTRO_INATIVO' } });
  });
  it('recusa destino diferente da conta vinculada ao fundo', async () => {
    fundos.porId.mockResolvedValue({ ativo: true, contaVinculadaId: ID });
    expect(await resolver.executar(aporte)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CORPO_INVALIDO' } });
  });
});
