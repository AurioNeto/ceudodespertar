import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Competencia, PeriodoContabilId, UnidadeId, UsuarioId } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { PeriodoContabil } from '../../domain/periodo/periodo-contabil.js';
import { OperacoesDePeriodo } from './operacoes-de-periodo.js';
const ID = '0198a3c0-0000-7000-8000-000000000001' as PeriodoContabilId;
const chave = { unidadeId: ID as unknown as UnidadeId, competencia: '2026-10' as Competencia };
const AUTOR = ID as unknown as UsuarioId; const EM = new Date('2026-11-02T12:00:00Z');
const acesso = { usuarioId: AUTOR } as ContextoDeAcesso;
const aberto = () => PeriodoContabil.abrir(ID, chave.unidadeId, chave.competencia);
const fechado = () => { const p = aberto(); p.fechar(0, true, 'a'.repeat(64), AUTOR, EM); return p; };
describe('OperacoesDePeriodo', () => {
  const repo = { travar: vi.fn(), porChave: vi.fn(), movimentos: vi.fn(), anteriorFechado: vi.fn(), adicionar: vi.fn(), salvar: vi.fn() };
  const unidades = { porId: vi.fn(), listar: vi.fn(), adicionar: vi.fn(), salvar: vi.fn() };
  const unidade = { transacao: async (_modo: string, executar: () => unknown) => executar() } as unknown as UnidadeDeTrabalho;
  const operacoes = new OperacoesDePeriodo(unidade, repo, unidades, { agora: () => EM });
  beforeEach(() => { vi.resetAllMocks(); unidades.porId.mockResolvedValue({ ativa: true }); repo.movimentos.mockResolvedValue({ movimentos: { lancamentos: [], transferencias: [] }, pendentes: 0 }); repo.anteriorFechado.mockResolvedValue(true); repo.salvar.mockResolvedValue(2); });
  it('primeiro fechamento cria só após trava exclusiva e validação', async () => {
    const r = await operacoes.fechar(acesso, chave, 0);
    expect(r).toMatchObject({ tipo: 'ok', valor: { fechado: true, versao: 1 } });
    expect(repo.travar).toHaveBeenCalledWith(chave, true); expect(repo.adicionar).toHaveBeenCalledOnce();
    expect(repo.travar.mock.invocationCallOrder[0]).toBeLessThan(repo.movimentos.mock.invocationCallOrder[0]!);
  });
  it('fechar unidade inexistente não cria período nem toma trava', async () => {
    unidades.porId.mockResolvedValue(undefined);
    expect(await operacoes.fechar(acesso, chave, 0)).toMatchObject({ tipo: 'erro', erro: { codigo: 'RECURSO_NAO_ENCONTRADO' } });
    expect(repo.travar).not.toHaveBeenCalled();
  });
  it('versão zero só é aceita sem período existente', async () => {
    expect(await operacoes.fechar(acesso, chave, 1)).toMatchObject({ tipo: 'erro', erro: { codigo: 'VERSAO_DESATUALIZADA' } });
    repo.porChave.mockResolvedValue(aberto());
    expect(await operacoes.fechar(acesso, chave, 0)).toMatchObject({ tipo: 'erro', erro: { codigo: 'VERSAO_DESATUALIZADA' } });
    expect(await operacoes.fechar(acesso, chave, 1)).toMatchObject({ tipo: 'ok', valor: { versao: 2 } });
    expect(repo.salvar).toHaveBeenCalledOnce();
  });
  it('P1 e P4 impedem persistência', async () => {
    repo.movimentos.mockResolvedValueOnce({ movimentos: { lancamentos: [], transferencias: [] }, pendentes: 1 });
    expect(await operacoes.fechar(acesso, chave, 0)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_COM_PENDENCIAS' } });
    repo.anteriorFechado.mockResolvedValue(false);
    expect(await operacoes.fechar(acesso, chave, 0)).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_ANTERIOR_ABERTO' } });
    expect(repo.adicionar).not.toHaveBeenCalled();
  });
  it('leitura e verificação de inexistente retornam 404', async () => {
    expect(await operacoes.obter(chave)).toMatchObject({ tipo: 'erro' });
    expect(await operacoes.verificar(chave)).toMatchObject({ tipo: 'erro' });
    repo.porChave.mockResolvedValue(aberto());
    expect(await operacoes.obter(chave)).toMatchObject({ tipo: 'ok', valor: { fechado: false } });
    expect(await operacoes.verificar(chave)).toMatchObject({ tipo: 'ok', valor: { hashGravado: null, integro: null } });
  });
  it('verifica diferença entre conteúdo atual e hash salvo', async () => {
    repo.porChave.mockResolvedValue(fechado());
    expect(await operacoes.verificar(chave)).toMatchObject({ tipo: 'ok', valor: { integro: false } });
    const r = await operacoes.fechar(acesso, chave, 1);
    expect(r).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_JA_FECHADO' } });
  });
  it('reabrir recusa ausente, versão antiga, período aberto e motivo inválido', async () => {
    expect(await operacoes.reabrir(acesso, chave, 1, 'Correção válida')).toMatchObject({ tipo: 'erro', erro: { codigo: 'RECURSO_NAO_ENCONTRADO' } });
    repo.porChave.mockResolvedValue(fechado());
    expect(await operacoes.reabrir(acesso, chave, 0, 'Correção válida')).toMatchObject({ tipo: 'erro', erro: { codigo: 'VERSAO_DESATUALIZADA' } });
    expect(await operacoes.reabrir(acesso, chave, 1, 'curto')).toMatchObject({ tipo: 'erro', erro: { codigo: 'MOTIVO_OBRIGATORIO' } });
    repo.porChave.mockResolvedValue(aberto());
    expect(await operacoes.reabrir(acesso, chave, 1, 'Correção válida')).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_NAO_FECHADO' } });
  });
  it('reabertura guarda o hash anterior e toma exclusiva, sem trava do mês anterior', async () => {
    repo.porChave.mockResolvedValue(fechado());
    expect(await operacoes.reabrir(acesso, chave, 1, 'Correção válida')).toMatchObject({ tipo: 'ok', valor: { fechado: false, versao: 2, reaberturas: [{ hashAnterior: 'a'.repeat(64) }] } });
    expect(repo.travar).toHaveBeenCalledWith(chave, false);
  });
});
