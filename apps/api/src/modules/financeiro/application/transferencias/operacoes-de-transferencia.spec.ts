import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistrarTransferencia, TransferenciaId, UsuarioId, InstituicaoId, Permissao } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import { Transferencia } from '../../domain/transferencia/transferencia.js';
import type { ResolverDadosDaTransferencia } from './resolver-dados-da-transferencia.js';
import { OperacoesDeTransferencia } from './operacoes-de-transferencia.js';

const ID = '0198a3c0-0000-7000-8000-000000000001' as TransferenciaId;
const AUTOR = '0198a3c0-0000-7000-8000-000000000002' as UsuarioId;
const OUTRO = '0198a3c0-0000-7000-8000-000000000003' as UsuarioId;
const EM = new Date('2026-11-02T01:00:00Z');
const dados = { finalidade: 'MOVIMENTACAO_SIMPLES', valor: 2000, data: '2026-10-01', contaOrigemId: ID,
  contaDestinoId: OUTRO, unidadeId: ID, unidadeDestinoId: null, fundoId: null, faturaId: null, emprestimoId: null, adiantamentoId: null, motivo: 'Transferência' } as unknown as RegistrarTransferencia;
const acesso = (usuarioId = AUTOR, permissoes: Permissao[] = []) => ({ recusada: false, instituicaoId: ID as unknown as InstituicaoId, usuarioId, permissoes: new Set(permissoes) }) as ContextoDeAcesso;
function criar(confirmada = false, campos = {}) {
  const r = Transferencia.registrar(ID, dados, AUTOR, EM, true);
  expect(r.tipo).toBe('ok');
  const t = (r as { tipo: 'ok'; valor: Transferencia }).valor;
  return Transferencia.reconstituir({ ...t.estado, ...(confirmada ? { status: 'CONFIRMADO' as const, confirmadoPor: OUTRO, confirmadoEm: t.estado.registradoEm } : {}), ...campos });
}

describe('OperacoesDeTransferencia', () => {
  const repo = { porId: vi.fn(), estornoDe: vi.fn(), adicionar: vi.fn(), salvar: vi.fn(), excluir: vi.fn() };
  const referencias = { executar: vi.fn() };
  const periodos = { estaAberto: vi.fn() };
  const unidade = { transacao: async (_modo: string, executar: () => unknown) => executar() } as unknown as UnidadeDeTrabalho;
  const operacoes = new OperacoesDeTransferencia(unidade, repo, referencias as unknown as ResolverDadosDaTransferencia, periodos, { agora: () => EM });
  beforeEach(() => {
    vi.resetAllMocks(); repo.porId.mockResolvedValue(criar()); repo.estornoDe.mockResolvedValue(undefined);
    repo.salvar.mockResolvedValue(2); referencias.executar.mockResolvedValue(ok()); periodos.estaAberto.mockResolvedValue(true);
  });
  it('registra e persiste só depois de validar referências', async () => {
    expect(await operacoes.registrar(acesso(), dados)).toMatchObject({ tipo: 'ok', valor: { status: 'A_CONFERIR' } });
    expect(repo.adicionar).toHaveBeenCalledOnce();
  });
  it.each(['registrar', 'editar', 'confirmar', 'estornar'] as const)('%s propaga referência inválida e não persiste', async (comando) => {
    referencias.executar.mockResolvedValue(err({ codigo: 'CADASTRO_INATIVO' })); repo.porId.mockResolvedValue(criar(true));
    const chamadas = {
      registrar: () => operacoes.registrar(acesso(), dados), editar: () => operacoes.editar(acesso(), ID, 1, dados),
      confirmar: () => operacoes.confirmar(acesso(OUTRO), ID, 1), estornar: () => operacoes.estornar(acesso(), ID, 1, 'Erro'),
    };
    expect(await chamadas[comando]()).toMatchObject({ tipo: 'erro', erro: { codigo: 'CADASTRO_INATIVO' } });
    expect(repo.adicionar).not.toHaveBeenCalled(); expect(repo.salvar).not.toHaveBeenCalled();
  });
  it.each(['registrar', 'editar', 'confirmar', 'descartar', 'estornar'] as const)('%s respeita período fechado', async (comando) => {
    periodos.estaAberto.mockResolvedValue(false);
    const chamadas = {
      registrar: () => operacoes.registrar(acesso(), dados), editar: () => operacoes.editar(acesso(), ID, 1, dados), confirmar: () => operacoes.confirmar(acesso(OUTRO), ID, 1),
      descartar: () => operacoes.descartar(acesso(), ID, 1), estornar: () => operacoes.estornar(acesso(), ID, 1, 'Erro'),
    };
    repo.porId.mockResolvedValue(criar(comando === 'estornar'));
    expect(await chamadas[comando]()).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
    expect(repo.adicionar).not.toHaveBeenCalled(); expect(repo.salvar).not.toHaveBeenCalled(); expect(repo.excluir).not.toHaveBeenCalled();
  });
  it('edição não permite mover um registro para competência fechada', async () => {
    periodos.estaAberto.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await operacoes.editar(acesso(), ID, 1, { ...dados, data: '2026-11-01' as RegistrarTransferencia['data'] })).toMatchObject({ tipo: 'erro', erro: { codigo: 'PERIODO_FECHADO' } });
  });
  it('repasse consulta período nas duas unidades, inclusive destino fechado', async () => {
    periodos.estaAberto.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await operacoes.aberto({ ...dados, unidadeDestinoId: OUTRO as unknown as RegistrarTransferencia['unidadeId'] })).toBe(false);
    expect(periodos.estaAberto).toHaveBeenNthCalledWith(2, OUTRO, '2026-10');
  });
  it('edição e descarte próprios usam a versão atual', async () => {
    expect(await operacoes.editar(acesso(), ID, 1, dados)).toMatchObject({ tipo: 'ok', valor: { versao: 2 } });
    expect(await operacoes.descartar(acesso(), ID, 1)).toEqual(ok({ descartado: true }));
    expect(repo.excluir).toHaveBeenCalledOnce();
  });
  it('conferente pode editar registro alheio mas não registrar sua própria conferência', async () => {
    expect(await operacoes.editar(acesso(OUTRO, ['financeiro.lancamento.confirmar']), ID, 1, dados)).toMatchObject({ tipo: 'ok' });
    expect(await operacoes.confirmar(acesso(), ID, 1)).toMatchObject({ tipo: 'erro', erro: { codigo: 'CONFERENTE_E_O_AUTOR' } });
    expect(await operacoes.confirmar(acesso(OUTRO), ID, 1)).toMatchObject({ tipo: 'ok', valor: { status: 'CONFIRMADO' } });
  });
  it('leitura de terceiros exige conta.ler e recurso ausente retorna 404', async () => {
    expect(await operacoes.obter(acesso(OUTRO), ID)).toMatchObject({ tipo: 'erro' });
    expect(await operacoes.obter(acesso(OUTRO, ['financeiro.conta.ler']), ID)).toMatchObject({ tipo: 'ok' });
    expect(await operacoes.obter(acesso(), ID)).toMatchObject({ tipo: 'ok' });
    repo.porId.mockResolvedValue(undefined);
    expect(await operacoes.obter(acesso(), ID)).toMatchObject({ tipo: 'erro' });
  });
  it.each(['editar', 'confirmar', 'descartar', 'estornar'] as const)('%s recusa id ausente', async (comando) => {
    repo.porId.mockResolvedValue(undefined);
    const chamadas = { editar: () => operacoes.editar(acesso(), ID, 1, dados), confirmar: () => operacoes.confirmar(acesso(OUTRO), ID, 1), descartar: () => operacoes.descartar(acesso(), ID, 1), estornar: () => operacoes.estornar(acesso(), ID, 1, 'Erro') };
    expect(await chamadas[comando]()).toMatchObject({ tipo: 'erro', erro: { codigo: 'RECURSO_NAO_ENCONTRADO' } });
  });
  it('autoria é verificada antes da versão', async () => {
    expect(await operacoes.carregar(ID, 99, acesso(OUTRO))).toMatchObject({ tipo: 'erro', erro: { codigo: 'RECURSO_NAO_ENCONTRADO' } });
    expect(await operacoes.carregar(ID, 99, acesso())).toMatchObject({ tipo: 'erro', erro: { codigo: 'VERSAO_DESATUALIZADA' } });
  });
  it('imutabilidade confirmada vale para edição e descarte', async () => {
    repo.porId.mockResolvedValue(criar(true));
    expect(await operacoes.editar(acesso(), ID, 1, dados)).toMatchObject({ tipo: 'erro' });
    expect(await operacoes.descartar(acesso(), ID, 1)).toMatchObject({ tipo: 'erro' });
    expect(repo.excluir).not.toHaveBeenCalled();
  });
  it('estorno usa data civil de São Paulo e mantém original', async () => {
    const original = criar(true); repo.porId.mockResolvedValue(original);
    expect(await operacoes.estornar(acesso(), ID, 1, 'Correção')).toMatchObject({ tipo: 'ok', valor: { data: '2026-11-01', status: 'A_CONFERIR', estornoDeId: ID } });
    expect(periodos.estaAberto).toHaveBeenCalledWith(ID, '2026-11');
    expect(repo.salvar).not.toHaveBeenCalled(); expect(original.estado.status).toBe('CONFIRMADO');
  });
  it('estorno pendente impede nova solicitação sem derivar estornada', async () => {
    repo.estornoDe.mockResolvedValue({ id: OUTRO, status: 'A_CONFERIR' });
    expect(await operacoes.estornar(acesso(), ID, 1, 'Correção')).toMatchObject({ tipo: 'erro', erro: { codigo: 'TRANSFERENCIA_JA_ESTORNADA', detalhes: { estornoId: OUTRO } } });
    expect((await operacoes.apresentar(criar(true))).estornadaPorId).toBeNull();
    repo.estornoDe.mockResolvedValue({ id: OUTRO, status: 'CONFIRMADO' });
    expect((await operacoes.apresentar(criar(true))).estornadaPorId).toBe(OUTRO);
  });
  it('não estorna pendente', async () => {
    expect(await operacoes.estornar(acesso(), ID, 1, 'Correção')).toMatchObject({ tipo: 'erro', erro: { codigo: 'TRANSFERENCIA_NAO_CONFIRMADA' } });
  });
  it('confere estorno somente se original existe e está confirmado', async () => {
    const reversao = criar(false, { estornoDeId: OUTRO });
    repo.porId.mockResolvedValueOnce(reversao).mockResolvedValueOnce(undefined);
    expect(await operacoes.confirmar(acesso(OUTRO), ID, 1)).toMatchObject({ tipo: 'erro', erro: { codigo: 'RECURSO_NAO_ENCONTRADO' } });
    repo.porId.mockResolvedValueOnce(reversao).mockResolvedValueOnce(criar());
    expect(await operacoes.confirmar(acesso(OUTRO), ID, 1)).toMatchObject({ tipo: 'erro', erro: { codigo: 'TRANSFERENCIA_NAO_CONFIRMADA' } });
  });
  it('confere estorno sem outro confirmado e recusa duplicata confirmada', async () => {
    const reversao = criar(false, { estornoDeId: OUTRO });
    repo.porId.mockResolvedValueOnce(reversao).mockResolvedValueOnce(criar(true));
    repo.estornoDe.mockResolvedValue({ id: OUTRO, status: 'CONFIRMADO' });
    expect(await operacoes.confirmar(acesso(OUTRO), ID, 1)).toMatchObject({ tipo: 'erro', erro: { codigo: 'TRANSFERENCIA_JA_ESTORNADA' } });
    repo.porId.mockResolvedValueOnce(reversao).mockResolvedValueOnce(criar(true));
    repo.estornoDe.mockResolvedValue({ id: ID, status: 'A_CONFERIR' });
    expect(await operacoes.confirmar(acesso(OUTRO), ID, 1)).toMatchObject({ tipo: 'ok' });
  });
});
