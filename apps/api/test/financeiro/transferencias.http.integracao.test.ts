import { consultarNaInstituicao } from '../identidade/apoio.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { idDoCadastro, subirAplicacaoDoFinanceiro } from './apoio-http.js';
import { pedirLancamento as pedirFinanceiro } from './apoio-lancamentos.js';

const ROTA = '/api/v1/financeiro/transferencias';
const AUTOR = 'sub-transferencia-autor';
const OUTRO = 'sub-transferencia-outro';
const TESO = 'sub-transferencia-tesouraria';
const CONFERENTE = 'sub-transferencia-conferente';
const CASA_B = 'sub-transferencia-b';
const ORIGEM = '0198a3c0-0000-7000-8000-0000000000c1';
const DESTINO = '0198a3c0-0000-7000-8000-0000000000c2';
const FUNDO = '0198a3c0-0000-7000-8000-0000000000c3';

describe('transferências pela API', () => {
  let banco: BancoDeTeste;
  let app: AplicacaoDeAcesso;
  let dados: Record<string, unknown>;
  beforeEach(async () => {
    banco = await criarBancoDeTeste(); app = await subirAplicacaoDoFinanceiro(banco);
    const registro = novoGrupoNomeado('Registro de transferências', ['financeiro.transferencia.registrar']);
    const tesouraria = novoGrupoNomeado('Operação de caixa', ['financeiro.transferencia.registrar', 'financeiro.conta.ler', 'financeiro.lancamento.confirmar', 'financeiro.lancamento.estornar']);
    const conferencia = novoGrupoNomeado('Só conferir', ['financeiro.lancamento.confirmar']);
    await semearUsuarios(app, INSTITUICAO_A, [registro, tesouraria, conferencia], [usuarioAtivoEm(AUTOR, [registro]), usuarioAtivoEm(OUTRO, [registro]), usuarioAtivoEm(TESO, [tesouraria]), usuarioAtivoEm(CONFERENTE, [conferencia])]);
    const grupoB = novoGrupoNomeado('Caixa B', ['financeiro.transferencia.registrar', 'financeiro.conta.ler', 'financeiro.lancamento.confirmar', 'financeiro.lancamento.estornar']);
    await semearUsuarios(app, INSTITUICAO_B, [grupoB], [usuarioAtivoEm(CASA_B, [grupoB])]);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.conta (id, instituicao_id, nome, tipo, titularidade) values ($1, $3, 'Origem', 'DINHEIRO', 'INSTITUCIONAL'), ($2, $3, 'Destino', 'DINHEIRO', 'INSTITUCIONAL')", [ORIGEM, DESTINO, INSTITUICAO_A]);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.fundo (id, instituicao_id, codigo_sistema, nome, conta_vinculada_id) values ($1, $2, 'DAIME', 'Fundo de teste', $3)", [FUNDO, INSTITUICAO_A, DESTINO]);
    dados = { finalidade: 'MOVIMENTACAO_SIMPLES', valor: 2000, data: '2026-10-01', motivo: 'Transferência', contaOrigemId: ORIGEM, contaDestinoId: DESTINO,
      unidadeId: await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'CDD') };
  });
  afterEach(async () => { await app.encerrar(); await derrubarBancoDeTeste(banco); });
  const pedir = (sujeito: string, rota = ROTA, metodo?: 'POST' | 'PUT' | 'DELETE', corpo?: unknown, versao?: number, chave?: string) => pedirFinanceiro(app, sujeito, rota, metodo, corpo, versao, chave);
  const criar = async (corpo = dados, sujeito = AUTOR) => { const r = await pedir(sujeito, ROTA, 'POST', corpo); expect(r.status).toBe(201); return r.location!; };

  it('registra e confere sem gerar receita ou despesa, usando a permissão existente', async () => {
    const rota = await criar();
    const r = await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1);
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({ status: 'CONFIRMADO', valor: 2000, versao: 2, confirmadoPor: expect.any(String) });
    const rows = await consultarNaInstituicao(banco, INSTITUICAO_A, 'select (select count(*) from financeiro.lancamento) as lancamentos, (select count(*) from financeiro.lancamento_categoria) as etiquetas');
    expect(rows).toEqual([{ lancamentos: 0, etiquetas: 0 }]);
  });
  it('recusa conferência própria mesmo com permissão e ignora autor injetado no corpo', async () => {
    const rota = await criar({ ...dados, registradoPor: '0198a3c0-0000-7000-8000-0000000000ff' }, TESO);
    expect((await pedir(TESO, `${rota}/confirmar`, 'POST', {}, 1)).corpo['erro']).toBe('CONFERENTE_E_O_AUTOR');
    expect((await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(200);
  });
  it('registrador só acessa e edita o próprio registro; outra casa não o acessa', async () => {
    const rota = await criar();
    expect((await pedir(AUTOR, rota)).status).toBe(200);
    expect((await pedir(TESO, rota)).status).toBe(200);
    expect((await pedir(OUTRO, rota)).status).toBe(404);
    expect((await pedir(OUTRO, rota, 'PUT', dados, 99)).status).toBe(404);
    expect((await pedir(CASA_B, rota)).status).toBe(404);
    expect((await pedir(CASA_B, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(404);
    expect((await pedir(AUTOR, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(403);
    expect((await pedir(AUTOR, `${rota}/estornar`, 'POST', { motivo: 'Correção' }, 1)).status).toBe(403);
  });
  it('edita e descarta apenas A_CONFERIR; confirmado não muda nem some', async () => {
    const rota = await criar();
    expect((await pedir(AUTOR, rota, 'PUT', { ...dados, motivo: 'Atualizada' }, 1)).corpo['versao']).toBe(2);
    expect((await pedir(AUTOR, rota, 'PUT', dados, 1)).status).toBe(409);
    expect((await pedir(AUTOR, rota, 'DELETE')).status).toBe(428);
    expect((await pedir(AUTOR, rota, 'DELETE', undefined, 2)).status).toBe(200);
    expect((await pedir(AUTOR, rota)).status).toBe(404);
    const confirmada = await criar();
    await pedir(CONFERENTE, `${confirmada}/confirmar`, 'POST', {}, 1);
    expect((await pedir(TESO, confirmada, 'PUT', dados, 2)).corpo['erro']).toBe('TRANSFERENCIA_JA_CONFIRMADA');
    expect((await pedir(TESO, confirmada, 'DELETE', undefined, 2)).corpo['erro']).toBe('TRANSFERENCIA_JA_CONFIRMADA');
  });
  it('estorno depende de segunda pessoa, preserva original e só deriva estornada após confirmar', async () => {
    const rota = await criar();
    await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1);
    const original = (await pedir(TESO, rota)).corpo;
    const estorno = await pedir(TESO, `${rota}/estornar`, 'POST', { motivo: 'Correção' }, 2);
    expect(estorno.status).toBe(201);
    expect(estorno.corpo).toMatchObject({ status: 'A_CONFERIR', estornoDeId: original['id'], contaOrigemId: ORIGEM, contaDestinoId: DESTINO, valor: 2000 });
    expect((await pedir(TESO, rota)).corpo).toEqual(original);
    expect((await pedir(TESO, `${estorno.location}/confirmar`, 'POST', {}, 1)).corpo['erro']).toBe('CONFERENTE_E_O_AUTOR');
    expect((await pedir(CONFERENTE, `${estorno.location}/confirmar`, 'POST', {}, 1)).status).toBe(200);
    expect((await pedir(TESO, rota)).corpo).toEqual({ ...original, estornadaPorId: estorno.corpo['id'] });
    const repetido = await pedir(TESO, `${rota}/estornar`, 'POST', { motivo: 'Outro' }, 2);
    expect(repetido.corpo).toMatchObject({ erro: 'TRANSFERENCIA_JA_ESTORNADA', detalhes: { estornoId: estorno.corpo['id'] } });
  });
  it('aporte exige fundo da casa e conta de destino vinculada', async () => {
    const rota = await criar({ ...dados, finalidade: 'APORTE_A_FUNDO', fundoId: FUNDO });
    expect((await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(200);
    expect((await pedir(AUTOR, ROTA, 'POST', { ...dados, finalidade: 'APORTE_A_FUNDO', fundoId: FUNDO, contaOrigemId: DESTINO, contaDestinoId: ORIGEM })).status).toBe(400);
  });
  it('repasse entre unidades diferentes é aceito e unidade igual é recusada', async () => {
    const unidadeDestinoId = await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'MUNAY');
    const rota = await criar({ ...dados, finalidade: 'REPASSE_ENTRE_UNIDADES', unidadeDestinoId });
    expect((await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(200);
    expect((await pedir(AUTOR, ROTA, 'POST', { ...dados, finalidade: 'REPASSE_ENTRE_UNIDADES', unidadeDestinoId: dados['unidadeId'] })).corpo['erro']).toBe('REPASSE_NA_MESMA_UNIDADE');
  });
  it.each([
    ['contaOrigemId', '00000000-0000-7000-8000-000000000001'],
    ['contaDestinoId', '00000000-0000-7000-8000-000000000001'],
    ['unidadeId', '00000000-0000-7000-8000-000000000001'],
  ])('recusa referência ausente em %s', async (campo, id) => {
    expect((await pedir(AUTOR, ROTA, 'POST', { ...dados, [campo]: id })).status).toBe(404);
  });
  it.each(['conta', 'unidade', 'fundo'])('revalida %s inativo antes de conferir', async (tabela) => {
    const rota = await criar({ ...dados, finalidade: 'APORTE_A_FUNDO', fundoId: FUNDO });
    const id = { conta: DESTINO, unidade: dados['unidadeId'], fundo: FUNDO }[tabela]!;
    const coluna = tabela === 'fundo' ? 'ativo' : 'ativa';
    await gravarNaInstituicao(banco, INSTITUICAO_A, `update financeiro.${tabela} set ${coluna} = false where id = $1`, [id]);
    expect((await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1)).corpo['erro']).toBe('CADASTRO_INATIVO');
    expect((await pedir(TESO, rota)).corpo['status']).toBe('A_CONFERIR');
  });
  it('permite descartar estorno pendente e solicitar novamente, sem editar seus dados', async () => {
    const rota = await criar();
    await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1);
    const estorno = await pedir(TESO, `${rota}/estornar`, 'POST', { motivo: 'Correção' }, 2);
    expect((await pedir(TESO, estorno.location!, 'PUT', dados, 1)).corpo['erro']).toBe('ORIGEM_NAO_EDITAVEL');
    expect((await pedir(TESO, `${rota}/estornar`, 'POST', { motivo: 'Repetida' }, 2)).corpo['erro']).toBe('TRANSFERENCIA_JA_ESTORNADA');
    expect((await pedir(TESO, estorno.location!, 'DELETE', undefined, 1)).status).toBe(200);
    expect((await pedir(TESO, `${rota}/estornar`, 'POST', { motivo: 'Nova solicitação' }, 2)).status).toBe(201);
  });
  it('replay de POST mantém Location e não repete corpo sensível nem transferência', async () => {
    const chave = '0198a3c0-0000-7000-8000-0000000000f1';
    const primeiro = await pedir(AUTOR, ROTA, 'POST', dados, undefined, chave);
    const replay = await pedir(AUTOR, ROTA, 'POST', dados, undefined, chave);
    expect(primeiro.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.location).toBe(primeiro.location);
    expect(replay.corpo).toEqual({});
    expect(await consultarNaInstituicao(banco, INSTITUICAO_A, 'select count(*) as n from financeiro.transferencia')).toEqual([{ n: 1 }]);
  });
  it('duas conferências concorrentes só confirmam uma versão', async () => {
    const rota = await criar();
    const respostas = await Promise.all([pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1), pedir(TESO, `${rota}/confirmar`, 'POST', {}, 1)]);
    expect(respostas.map(r => r.status).toSorted()).toEqual([200, 409]);
  });
  it.each(['update financeiro.transferencia set motivo = \'Mudar\' where id = $1', 'delete from financeiro.transferencia where id = $1'])('banco impede alteração direta de confirmada: %s', async (sql) => {
    const rota = await criar();
    await pedir(CONFERENTE, `${rota}/confirmar`, 'POST', {}, 1);
    await expect(gravarNaInstituicao(banco, INSTITUICAO_A, sql, [rota.split('/').at(-1)])).rejects.toThrow('TRANSFERENCIA_IMUTAVEL');
    expect((await pedir(TESO, rota)).corpo['status']).toBe('CONFIRMADO');
  });

});
