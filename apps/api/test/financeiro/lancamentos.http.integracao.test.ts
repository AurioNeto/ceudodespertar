import { SituacaoDoPeriodo } from '../../src/modules/financeiro/application/lancamentos/situacao-do-periodo.js';
import { Relogio } from '../../src/shared/infrastructure/relogio.js';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { idDoCadastro } from './apoio-http.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { AUTOR, OUTRO, TESOURARIA, CASA_B, ROTA, VALOR, subirLancamentos, pedirLancamento } from './apoio-lancamentos.js';

describe('lançamentos pela API', () => {
  let banco: BancoDeTeste;
  let app: AplicacaoDeAcesso;
  let completo: Record<string, unknown>;
  beforeEach(async () => { banco = await criarBancoDeTeste(); ({ app, completo } = await subirLancamentos(banco)); });
  afterEach(async () => { await app.encerrar(); await derrubarBancoDeTeste(banco); });
  const pedir = (sujeito: string, rota = ROTA, metodo?: 'POST' | 'PUT' | 'DELETE', corpo?: unknown, versao?: number) => pedirLancamento(app, sujeito, rota, metodo, corpo, versao);
  const criar = async (corpo = completo, sujeito = AUTOR) => { const r = await pedir(sujeito, ROTA, 'POST', corpo); expect(r.status).toBe(201); return r.location!; };

  it('registro rápido cria A_CONFERIR incompleto, sem etiquetas e sem saldo', async () => {
    const r = await pedir(AUTOR, ROTA, 'POST', VALOR);
    expect(r.status).toBe(201);
    expect(r.corpo).toMatchObject({ status: 'A_CONFERIR', etiquetas: [], contaId: null, competencia: null, versao: 1 });
    expect(r.location).toBe(`${ROTA}/${r.corpo['id'] as string}`);
    expect((await pedir(TESOURARIA, `${r.location}/confirmar`, 'POST', {}, 1)).corpo['erro']).toBe('LANCAMENTO_INCOMPLETO');
  });
  it('quem registra só lê ou edita o próprio lançamento; outra casa não acessa', async () => {
    const rota = await criar();
    expect((await pedir(AUTOR, rota)).status).toBe(200);
    expect((await pedir(TESOURARIA, rota)).status).toBe(200);
    expect((await pedir(OUTRO, rota)).status).toBe(404);
    expect((await pedir(OUTRO, rota, 'PUT', completo, 1)).status).toBe(404);
    expect((await pedir(OUTRO, rota, 'PUT', completo, 999)).status).toBe(404);
    expect((await pedir(CASA_B, rota)).status).toBe(404);
    expect((await pedir(CASA_B, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(404);
  });
  it('edita e confere com etiquetas no mesmo ato, inclusive confirmação própria', async () => {
    const rota = await criar(completo, TESOURARIA);
    const editado = await pedir(TESOURARIA, rota, 'PUT', { ...completo, motivo: 'Ajustado' }, 1);
    expect(editado.status).toBe(200);
    expect(editado.corpo['versao']).toBe(2);
    const confirmado = await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', { etiquetas: completo['etiquetas'] }, 2);
    expect(confirmado.status).toBe(200);
    expect(confirmado.corpo).toMatchObject({ status: 'CONFIRMADO', versao: 3, confirmadoPor: { autorTipo: 'USUARIO' } });
    expect((await pedir(TESOURARIA, rota, 'PUT', completo, 3)).corpo['erro']).toBe('LANCAMENTO_JA_CONFIRMADO');
    expect((await pedir(TESOURARIA, rota, 'DELETE', undefined, 3)).status).toBe(409);
  });
  it('estorno cria outro lançamento, deriva a situação e deixa o original imutável', async () => {
    const rota = await criar();
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(200);
    const antes = (await pedir(TESOURARIA, rota)).corpo;
    const estorno = await pedir(TESOURARIA, `${rota}/estornar`, 'POST', { motivo: 'Correção' }, 2);
    expect(estorno.status).toBe(201);
    expect(estorno.corpo).toMatchObject({ natureza: 'DESPESA', status: 'CONFIRMADO', estornoDeId: antes['id'] });
    const depois = (await pedir(TESOURARIA, rota)).corpo;
    expect(depois).toEqual({ ...antes, estornadoPorId: estorno.corpo['id'] });
    expect((await pedir(TESOURARIA, `${rota}/estornar`, 'POST', { motivo: 'Outra' }, 2)).corpo['erro']).toBe('LANCAMENTO_JA_ESTORNADO');
  });
  it('descarta A_CONFERIR, exige versão e recusa valor inválido', async () => {
    const rota = await criar();
    expect((await pedir(AUTOR, rota, 'DELETE')).status).toBe(428);
    expect((await pedir(AUTOR, rota, 'PUT', completo, 2)).status).toBe(409);
    expect((await pedir(AUTOR, rota, 'DELETE', undefined, 1)).status).toBe(200);
    expect((await pedir(AUTOR, rota)).status).toBe(404);
    expect((await pedir(AUTOR, ROTA, 'POST', { ...VALOR, valor: -1 })).status).toBe(400);
  });
  it.each(['unidadeId', 'contaId', 'grupoDeCustoId', 'pessoaId', 'reembolsoAId', 'faturaId', 'comprovanteId'])('referência %s inexistente é recusada na casa', async (campo) => {
    expect((await pedir(AUTOR, ROTA, 'POST', { ...completo, [campo]: '0198a3c0-0000-7000-8000-0000000000ff' })).status).toBe(404);
  });
  it('não aceita categoria de outra casa ou natureza informada pelo cliente', async () => {
    const categoriaB = await idDoCadastro(banco, INSTITUICAO_B, 'categoria', 'MANUTENCAO');
    expect((await pedir(AUTOR, ROTA, 'POST', { ...completo, etiquetas: [{ categoriaId: categoriaB, valor: 2000 }] })).status).toBe(404);
    const categoria = (completo['etiquetas'] as Array<{ categoriaId: string }>)[0]!.categoriaId;
    const rota = await criar({ ...completo, etiquetas: [{ categoriaId: categoria, valor: 2000, natureza: 'RECEITA' }] });
    expect(((await pedir(AUTOR, rota)).corpo['etiquetas'] as Array<{ natureza: string }>)[0]!.natureza).toBe('DESPESA');
  });
  it('L4 — categoria fora do regime é recusada', async () => {
    const categoriaId = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'CACHE_PAGO');
    const r = await pedir(AUTOR, ROTA, 'POST', { ...completo, etiquetas: [{ categoriaId, valor: 2000 }] });
    expect(r.corpo['erro']).toBe('CATEGORIA_FORA_DO_REGIME');
  });
  it.each(['unidade', 'conta', 'categoria'])('cadastro %s inativo impede novo vínculo', async (tabela) => {
    const id = tabela === 'unidade' ? completo['unidadeId'] : tabela === 'conta' ? completo['contaId'] : (completo['etiquetas'] as Array<{ categoriaId: string }>)[0]!.categoriaId;
    await gravarNaInstituicao(banco, INSTITUICAO_A, `update financeiro.${tabela} set ativa = false where id = $1`, [id]);
    expect((await pedir(AUTOR, ROTA, 'POST', completo)).corpo['erro']).toBe('CADASTRO_INATIVO');
  });
  it('confirmação recusa etiquetas vazias ou que não fecham, sem deixar mudança parcial', async () => {
    const rota = await criar();
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', { etiquetas: [] }, 1)).corpo['erro']).toBe('CATEGORIA_OBRIGATORIA');
    const categoriaId = (completo['etiquetas'] as Array<{ categoriaId: string }>)[0]!.categoriaId;
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', { etiquetas: [{ categoriaId, valor: 1 }] }, 1)).corpo['erro']).toBe('ETIQUETAS_NAO_FECHAM');
    expect((await pedir(AUTOR, rota)).corpo).toMatchObject({ status: 'A_CONFERIR', versao: 1, etiquetas: [expect.objectContaining({ valor: 2000 })] });
  });
  it('caso Aline chega à API com 12000 de despesas e 10000 de receita em 2000 líquidos', async () => {
    const despesa = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'ALIMENTACAO_CERIMONIA');
    const receita = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'CONTRIB_CDD');
    const categoriaId = (completo['etiquetas'] as Array<{ categoriaId: string }>)[0]!.categoriaId;
    const rota = await criar({ ...completo, etiquetas: [{ categoriaId, valor: 7000 }, { categoriaId: despesa, valor: 5000 }, { categoriaId: receita, valor: 10000 }] });
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(200);
  });
  it('FD1 — saída em conta vinculada respeita as categorias do fundo', async () => {
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.fundo (id, instituicao_id, codigo_sistema, nome, conta_vinculada_id) values (gen_random_uuid(), $1, 'DAIME', 'Daime', $2)", [INSTITUICAO_A, completo['contaId']]);
    const rota = await criar();
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1)).corpo['erro']).toBe('CATEGORIA_FORA_DO_FUNDO');
    await gravarNaInstituicao(banco, INSTITUICAO_A, "update financeiro.fundo set categorias_permitidas = ARRAY['MANUTENCAO'] where conta_vinculada_id = $1", [completo['contaId']]);
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(200);
  });
  it('L5 — porta de período fechado bloqueia todas as escritas na competência', async () => {
    const rota = await criar();
    const confirmado = await criar(completo);
    expect((await pedir(TESOURARIA, `${confirmado}/confirmar`, 'POST', {}, 1)).status).toBe(200);
    vi.spyOn(app.app.get(SituacaoDoPeriodo), 'estaAberto').mockResolvedValue(false);
    expect((await pedir(AUTOR, ROTA, 'POST', completo)).corpo['erro']).toBe('PERIODO_FECHADO');
    expect((await pedir(AUTOR, rota, 'PUT', completo, 1)).corpo['erro']).toBe('PERIODO_FECHADO');
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1)).corpo['erro']).toBe('PERIODO_FECHADO');
    expect((await pedir(AUTOR, rota, 'DELETE', undefined, 1)).corpo['erro']).toBe('PERIODO_FECHADO');
    expect((await pedir(TESOURARIA, `${confirmado}/estornar`, 'POST', { motivo: 'Erro' }, 2)).corpo['erro']).toBe('PERIODO_FECHADO');
  });
  it('L9 — virada do dia usa São Paulo e não o UTC; mês fechado antigo não se altera', async () => {
    const rota = await criar();
    await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1);
    vi.spyOn(app.app.get(Relogio), 'agora').mockReturnValue(new Date('2026-11-01T01:00:00Z'));
    vi.spyOn(app.app.get(SituacaoDoPeriodo), 'estaAberto').mockImplementation(async (_unidade, competencia) => competencia === '2026-10');
    const r = await pedir(TESOURARIA, `${rota}/estornar`, 'POST', { motivo: 'Correção' }, 2);
    expect(r.status).toBe(201);
    expect(r.corpo).toMatchObject({ competencia: '2026-10', dataCompetencia: '2026-10-31' });
  });
  it('replay devolve Location sem duplicar nem guardar o motivo', async () => {
    const chave = '0198a3c0-0000-7000-8000-0000000000df';
    const a = await pedirLancamento(app, AUTOR, ROTA, 'POST', completo, undefined, chave);
    const b = await pedirLancamento(app, AUTOR, ROTA, 'POST', completo, undefined, chave);
    expect(a.status).toBe(201); expect(b.status).toBe(201); expect(b.location).toBe(a.location); expect(b.corpo).toEqual({});
    const [linha] = await consultarNaInstituicao(banco, INSTITUICAO_A, 'select resposta from shared.chave_de_idempotencia where chave = $1', [chave]);
    expect(linha).toEqual({ resposta: { corpo: null, location: a.location } });
  });
  it('edições simultâneas não perdem atualização', async () => {
    const rota = await criar();
    const respostas = await Promise.all(['A', 'B'].map((motivo) => pedir(AUTOR, rota, 'PUT', { ...completo, motivo }, 1)));
    expect(respostas.map((r) => r.status).toSorted()).toEqual([200, 409]);
  });

  it('referência inválida na edição não altera o registro', async () => {
    const rota = await criar();
    expect((await pedir(AUTOR, rota, 'PUT', { ...completo, pessoaId: '0198a3c0-0000-7000-8000-0000000000ff' }, 1)).status).toBe(404);
    expect((await pedir(AUTOR, rota)).corpo['versao']).toBe(1);
  });
  it('descarte e estorno de recurso ausente não revelam dados', async () => {
    const rota = `${ROTA}/0198a3c0-0000-7000-8000-0000000000ff`;
    expect((await pedir(AUTOR, rota, 'DELETE', undefined, 1)).status).toBe(404);
    expect((await pedir(TESOURARIA, `${rota}/estornar`, 'POST', { motivo: 'Erro' }, 1)).status).toBe(404);
  });
  it('confirmado recusa uma segunda confirmação com etiquetas', async () => {
    const rota = await criar();
    await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1);
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', { etiquetas: completo['etiquetas'] }, 2)).corpo['erro']).toBe('LANCAMENTO_JA_CONFIRMADO');
  });
  it('grupo ativo pode ser vinculado; inativo não pode', async () => {
    const grupoDeCustoId = await idDoCadastro(banco, INSTITUICAO_A, 'grupo_de_custo', 'COZINHA');
    expect((await pedir(AUTOR, ROTA, 'POST', { ...completo, grupoDeCustoId })).status).toBe(201);
    await gravarNaInstituicao(banco, INSTITUICAO_A, 'update financeiro.grupo_de_custo set ativo = false where id = $1', [grupoDeCustoId]);
    expect((await pedir(AUTOR, ROTA, 'POST', { ...completo, grupoDeCustoId })).corpo['erro']).toBe('CADASTRO_INATIVO');
  });
  it('pessoa ativa pode ser vinculada; inativa não pode', async () => {
    const pessoaId = '0198a3c0-0000-7000-8000-0000000000ff';
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into pessoas.pessoa (id, instituicao_id, tipo, nome) values ($1, $2, 'FISICA', 'Pessoa de teste')", [pessoaId, INSTITUICAO_A]);
    expect((await pedir(AUTOR, ROTA, 'POST', { ...completo, pessoaId })).status).toBe(201);
    await gravarNaInstituicao(banco, INSTITUICAO_A, 'update pessoas.pessoa set ativa = false where id = $1', [pessoaId]);
    expect((await pedir(AUTOR, ROTA, 'POST', { ...completo, pessoaId })).corpo['erro']).toBe('CADASTRO_INATIVO');
  });
  it('CT2 — conta pessoal não confirma despesa sem o adiantamento da B2', async () => {
    const rota = await criar();
    await gravarNaInstituicao(banco, INSTITUICAO_A, "update financeiro.conta set titularidade = 'PESSOAL_DE_TERCEIRO', pessoa_titular_id = $1 where id = $2", ['0198a3c0-0000-7000-8000-0000000000ff', completo['contaId']]);
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1)).corpo).toMatchObject({ erro: 'LANCAMENTO_INCOMPLETO', detalhes: { dependencia: 'ADIANTAMENTO_B2' } });
  });
  it('receita pode ser confirmada e etiquetas podem ser capturadas sem unidade antes da conferência', async () => {
    const categoriaId = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'CONTRIB_CDD');
    expect((await pedir(AUTOR, ROTA, 'POST', { ...completo, unidadeId: null })).status).toBe(201);
    const rota = await criar({ ...completo, natureza: 'RECEITA', etiquetas: [{ categoriaId, valor: 2000 }] });
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(200);
  });
  it('mudar a competência não contorna a verificação do período de destino', async () => {
    const rota = await criar();
    vi.spyOn(app.app.get(SituacaoDoPeriodo), 'estaAberto').mockImplementation(async (_unidade, competencia) => competencia === '2026-10');
    expect((await pedir(AUTOR, rota, 'PUT', { ...completo, dataCompetencia: '2026-11-01' }, 1)).corpo['erro']).toBe('PERIODO_FECHADO');
  });

});
