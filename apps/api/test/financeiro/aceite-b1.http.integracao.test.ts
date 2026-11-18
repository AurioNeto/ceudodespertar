import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GRUPOS_DE_SISTEMA } from '../../src/modules/identidade/domain/grupo/grupos-de-sistema.js';
import { INSTITUICAO_A } from '../eventos/apoio.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste, type BancoDeTeste } from '../integracao/banco-de-teste.js';
import { pedirLancamento, ROTA, subirLancamentos } from './apoio-lancamentos.js';

const REGISTRO = 'sub-aceite-b1-registro';
const OUTRO_REGISTRO = 'sub-aceite-b1-outro-registro';
const TESOURARIA = 'sub-aceite-b1-tesouraria';
const ACOLHIMENTO = 'sub-aceite-b1-acolhimento';
const BASE = '/api/v1/financeiro';
const DRE = `${BASE}/relatorios/dre?competencia=2026-10`;

function grupoDeSistema(codigo: 'REGISTRO' | 'TESOURARIA' | 'ACOLHIMENTO') {
  const grupo = GRUPOS_DE_SISTEMA.find(item => item.codigoSistema === codigo);
  if (!grupo) throw new Error(`Grupo de sistema ausente: ${codigo}`);
  return novoGrupoNomeado(`Aceite B1 ${codigo}`, grupo.permissoes);
}

describe('Aceite B1 pela API', () => {
  let banco: BancoDeTeste | undefined;
  let contexto: Awaited<ReturnType<typeof subirLancamentos>>;

  beforeAll(async () => {
    banco = await criarBancoDeTeste();
    contexto = await subirLancamentos(banco);
    const registro = grupoDeSistema('REGISTRO');
    const tesouraria = grupoDeSistema('TESOURARIA');
    const acolhimento = grupoDeSistema('ACOLHIMENTO');
    await semearUsuarios(contexto.app, INSTITUICAO_A, [registro, tesouraria, acolhimento], [
      usuarioAtivoEm(REGISTRO, [registro]), usuarioAtivoEm(OUTRO_REGISTRO, [registro]),
      usuarioAtivoEm(TESOURARIA, [tesouraria]), usuarioAtivoEm(ACOLHIMENTO, [acolhimento]),
    ]);
  });

  afterAll(async () => {
    try {
      await contexto?.app.encerrar();
    } finally {
      if (banco) await derrubarBancoDeTeste(banco);
    }
  });

  const pedir = (sujeito: string, rota: string, metodo?: 'POST', corpo?: unknown, versao?: number) =>
    pedirLancamento(contexto.app, sujeito, rota, metodo, corpo, versao);

  async function criar(sujeito = REGISTRO, dados = contexto.completo) {
    const resposta = await pedir(sujeito, ROTA, 'POST', dados);
    expect(resposta.status).toBe(201);
    expect(resposta.location).toBe(`${ROTA}/${resposta.corpo['id']}`);
    return { ...resposta, rota: resposta.location! };
  }

  async function abrirPendencia(rota: string) {
    const resposta = await pedir(TESOURARIA, `${rota}/pendencias`, 'POST', { texto: 'Qual foi o fornecedor?' }, 1);
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toMatchObject({
      status: 'A_CONFERIR', versao: 2, pendencias: [expect.objectContaining({ resolvidaEm: null })],
    });
    const [pendencia] = resposta.corpo['pendencias'] as [{ id: string }];
    return `${rota}/pendencias/${pendencia.id}/resposta`;
  }

  it('T9 · Acolhimento recebe 403 ao consultar a DRE', async () => {
    expect((await pedir(ACOLHIMENTO, DRE)).status).toBe(403);
  });

  it('T13 · Registro cria lançamento a conferir', async () => {
    const { corpo, rota } = await criar();
    expect(corpo).toMatchObject({ status: 'A_CONFERIR', versao: 1 });
    expect((await pedir(REGISTRO, rota)).corpo).toMatchObject({ id: corpo['id'], status: 'A_CONFERIR' });
  });

  it('T14 · Registro recebe 403 ao tentar confirmar o próprio lançamento', async () => {
    const { rota } = await criar();
    expect((await pedir(REGISTRO, `${rota}/confirmar`, 'POST', {}, 1)).status).toBe(403);
    expect((await pedir(REGISTRO, rota)).corpo['status']).toBe('A_CONFERIR');
  });

  it('T15 · Registro recebe 403 ao consultar a DRE', async () => {
    expect((await pedir(REGISTRO, DRE)).status).toBe(403);
  });

  it('T16 · Tesouraria confirma lançamento criado por Registro', async () => {
    const { rota } = await criar();
    const resposta = await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 1);
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toMatchObject({ status: 'CONFIRMADO', versao: 2 });
  });

  it('T16a · Registro lista somente os próprios lançamentos', async () => {
    const proprio = await criar();
    const alheio = await criar(OUTRO_REGISTRO);
    const resposta = await pedir(REGISTRO, `${BASE}/meus-registros`);
    expect(resposta.status).toBe(200);
    const ids = (resposta.corpo['itens'] as Array<{ id: string }>).map(item => item.id);
    expect(ids).toContain(proprio.corpo['id']);
    expect(ids).not.toContain(alheio.corpo['id']);
  });

  it('T16b · Registro recebe 404 ao tentar ler lançamento de outro autor', async () => {
    const { rota } = await criar(OUTRO_REGISTRO);
    const resposta = await pedir(REGISTRO, rota);
    expect(resposta.status).toBe(404);
    expect(resposta.corpo['erro']).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('T16c · Registro responde à pendência do próprio lançamento', async () => {
    const { rota } = await criar();
    const caminho = await abrirPendencia(rota);
    const resposta = await pedir(REGISTRO, caminho, 'POST', { texto: 'Mercado do bairro' }, 2);
    expect(resposta.status).toBe(200);
    expect(resposta.corpo['pendencias']).toEqual([expect.objectContaining({ resposta: 'Mercado do bairro', resolvidaEm: expect.any(String) })]);
  });

  it('T16d · Tesouraria não pode responder à pendência endereçada ao autor', async () => {
    const { rota } = await criar();
    const caminho = await abrirPendencia(rota);
    const resposta = await pedir(TESOURARIA, caminho, 'POST', { texto: 'Mercado do bairro' }, 2);
    expect(resposta.status).toBe(403);
    expect(resposta.corpo['erro']).toBe('PENDENCIA_SO_DO_DESTINATARIO');
    expect((await pedir(REGISTRO, rota)).corpo['pendencias']).toEqual([expect.objectContaining({ resposta: null, resolvidaEm: null })]);
  });

  it('T16e · Responder à pendência preserva o status a conferir', async () => {
    const { rota } = await criar();
    const caminho = await abrirPendencia(rota);
    expect((await pedir(REGISTRO, caminho, 'POST', { texto: 'Mercado do bairro' }, 2)).status).toBe(200);
    expect((await pedir(REGISTRO, rota)).corpo).toMatchObject({ status: 'A_CONFERIR', versao: 3 });
  });

  it('do gasto ao DRE · só consolida a despesa após a conferência', async () => {
    const { completo } = contexto;
    const dre = `${BASE}/relatorios/dre?competencia=2026-11&unidadeId=${completo.unidadeId}`;
    const { rota, corpo } = await criar(REGISTRO, { ...completo, dataCompetencia: '2026-11-01' });
    const fila = await pedir(TESOURARIA, `${BASE}/fila-conferencia`);
    expect(fila.status).toBe(200);
    expect(fila.corpo['itens']).toContainEqual(expect.objectContaining({ id: corpo['id'] }));
    const caminho = await abrirPendencia(rota);
    const proprios = await pedir(REGISTRO, `${BASE}/meus-registros`);
    expect(proprios.corpo['itens']).toContainEqual(expect.objectContaining({
      id: corpo['id'], pendencia: expect.objectContaining({ texto: 'Qual foi o fornecedor?' }),
    }));
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 2)).corpo['erro']).toBe('LANCAMENTO_INCOMPLETO');
    expect((await pedir(REGISTRO, caminho, 'POST', { texto: 'Mercado do bairro' }, 2)).status).toBe(200);
    expect((await pedir(TESOURARIA, dre)).corpo).toMatchObject({ despesas: 0, resultado: 0, linhas: [] });
    expect((await pedir(TESOURARIA, `${rota}/confirmar`, 'POST', {}, 3)).status).toBe(200);
    const consolidado = await pedir(TESOURARIA, dre);
    expect(consolidado.status).toBe(200);
    expect(consolidado.corpo).toMatchObject({
      receitas: 0, despesas: completo.valor, resultado: -completo.valor,
      linhas: [expect.objectContaining({ natureza: 'DESPESA', valor: completo.valor })],
    });
  });
});
