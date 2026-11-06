import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Permissao } from '@cdd/contracts';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste, type BancoDeTeste } from '../integracao/banco-de-teste.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { idDoCadastro, SEM_GRUPO } from './apoio-http.js';
import { AUTOR, CASA_B, CONTA, OUTRO, TESOURARIA, subirLancamentos } from './apoio-lancamentos.js';

const BASE = '/api/v1/financeiro';
const RELATORIOS = 'sub-relatorios-financeiros';
const RELATORIOS_B = 'sub-relatorios-financeiros-b';
const SO_DRE = 'sub-apenas-dre';
const PERMISSOES: Permissao[] = [
  'financeiro.lancamento.ler', 'financeiro.lancamento.ler_proprios', 'financeiro.lancamento.confirmar',
  'financeiro.conta.ler', 'financeiro.dre.ler', 'financeiro.fluxo_caixa.ler', 'financeiro.resultado_evento.ler',
];
const EVENTO = randomUUID();
const EVENTO_SEGUINTE = randomUUID();
const EVENTO_B = randomUUID();
const CONTA_DESTINO = randomUUID();
const CONTA_B = randomUUID();
const GRUPO = randomUUID();
const GRUPO_B = randomUUID();
const FUNDO = randomUUID();
const FUNDO_B = randomUUID();
const ORIGINAL = randomUUID();
const DEVOLUCAO = randomUUID();
const TRANSFERENCIA = randomUUID();
const ESTORNO_TRANSFERENCIA = randomUUID();
const PENDENTE = randomUUID();
const PENDENTE_B = randomUUID();
const SEGREDO = 'Dado exclusivo da casa B';

type Natureza = 'RECEITA' | 'DESPESA';
interface LinhaFixture {
  instituicao: string; unidade: string | null; conta: string | null; autor: string;
  id?: string; grupo?: string; evento?: string; estorno?: string;
  competencia?: string; caixa?: string; motivo: string; valor: number; natureza: Natureza;
  etiquetas?: readonly [categoria: string, natureza: Natureza, valor: number][];
  pendente?: boolean;
}

async function gravarLancamento(banco: BancoDeTeste, l: LinhaFixture): Promise<string> {
  const id = l.id ?? randomUUID();
  await banco.owner.query('begin');
  try {
    await banco.owner.query("select set_config('app.instituicao_id', $1, true)", [l.instituicao]);
    await banco.owner.query(`insert into financeiro.lancamento
      (id, instituicao_id, unidade_id, conta_id, registrado_por, grupo_de_custo_id, evento_id, estorno_de_id,
       competencia, data_competencia, data_caixa, motivo, valor, natureza, status, origem, registrado_em,
       confirmado_autor_tipo, confirmado_por, confirmado_em)
      values ($1,$2,$3,$4,$5,$6,$7,$8,date_trunc('month',$9::date)::date,$9,$10,$11,$12,$13,$14,'MANUAL',now(),
        case when $14 = 'CONFIRMADO' then 'USUARIO' end, case when $14 = 'CONFIRMADO' then $5::uuid end,
        case when $14 = 'CONFIRMADO' then now() end)`,
    [id, l.instituicao, l.unidade, l.conta, l.autor, l.grupo, l.evento, l.estorno,
      l.competencia, l.caixa, l.motivo, l.valor, l.natureza, l.pendente ? 'A_CONFERIR' : 'CONFIRMADO']);
    for (const [categoria, natureza, valor] of l.etiquetas ?? []) {
      // eslint-disable-next-line no-await-in-loop -- as etiquetas usam a mesma transação do lançamento
      await banco.owner.query(`insert into financeiro.lancamento_categoria
        (instituicao_id, lancamento_id, categoria_id, natureza, valor) values ($1,$2,$3,$4,$5)`,
      [l.instituicao, id, categoria, natureza, valor]);
    }
    await banco.owner.query('commit');
    return id;
  } catch (erro) {
    await banco.owner.query('rollback');
    throw erro;
  }
}

async function idDoAutor(banco: BancoDeTeste, instituicao: string, sujeito: string): Promise<string> {
  const [u] = await consultarNaInstituicao<{ id: string }>(banco, instituicao, 'select id from identidade.usuario where subject_id = $1', [sujeito]);
  return u!.id;
}

describe('Consultas financeiras pela API', () => {
  let banco: BancoDeTeste;
  let ambiente: Awaited<ReturnType<typeof subirLancamentos>>;
  let unidade: string;
  let destino: string;
  let unidadeB: string;
  let autorA: string;

  beforeAll(async () => {
    banco = await criarBancoDeTeste();
    ambiente = await subirLancamentos(banco);
    unidade = ambiente.completo.unidadeId;
    destino = await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'CHACARA');
    unidadeB = await idDoCadastro(banco, INSTITUICAO_B, 'unidade', 'CDD');
    const a = novoGrupoNomeado('Ler financeiro A', PERMISSOES);
    const b = novoGrupoNomeado('Ler financeiro B', PERMISSOES);
    const soDre = novoGrupoNomeado('Ler somente DRE', ['financeiro.dre.ler']);
    await semearUsuarios(ambiente.app, INSTITUICAO_A, [a, soDre], [usuarioAtivoEm(RELATORIOS, [a]), usuarioAtivoEm(SO_DRE, [soDre])]);
    await semearUsuarios(ambiente.app, INSTITUICAO_B, [b], [usuarioAtivoEm(RELATORIOS_B, [b])]);
    autorA = await idDoAutor(banco, INSTITUICAO_A, AUTOR);
    const outro = await idDoAutor(banco, INSTITUICAO_A, OUTRO);
    const autorB = await idDoAutor(banco, INSTITUICAO_B, RELATORIOS_B);

    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.conta (id,instituicao_id,nome,tipo,titularidade,unidade_id) values ($1,$2,'Destino','DINHEIRO','INSTITUCIONAL',$3)", [CONTA_DESTINO, INSTITUICAO_A, destino]);
    await gravarNaInstituicao(banco, INSTITUICAO_B, "insert into financeiro.conta (id,instituicao_id,nome,tipo,titularidade) values ($1,$2,$3,'DINHEIRO','INSTITUCIONAL')", [CONTA_B, INSTITUICAO_B, SEGREDO]);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.fundo (id,instituicao_id,codigo_sistema,nome,conta_vinculada_id) values ($1,$2,'DAIME','Reserva A',$3)", [FUNDO, INSTITUICAO_A, CONTA_DESTINO]);
    await gravarNaInstituicao(banco, INSTITUICAO_B, "insert into financeiro.fundo (id,instituicao_id,codigo_sistema,nome,conta_vinculada_id) values ($1,$2,'DAIME',$3,$4)", [FUNDO_B, INSTITUICAO_B, SEGREDO, CONTA_B]);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.grupo_de_custo (id,instituicao_id,codigo_sistema,nome) values ($1,$2,'FIXTURE_A','Grupo A')", [GRUPO, INSTITUICAO_A]);
    await gravarNaInstituicao(banco, INSTITUICAO_B, "insert into financeiro.grupo_de_custo (id,instituicao_id,codigo_sistema,nome) values ($1,$2,'FIXTURE_B',$3)", [GRUPO_B, INSTITUICAO_B, SEGREDO]);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into eventos.evento values ($1,$2,$3,'Cerimônia A','CERIMONIA','2026-09-10','2026-09-10')", [EVENTO, INSTITUICAO_A, unidade]);
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into eventos.evento values ($1,$2,$3,'Cerimônia seguinte','CERIMONIA','2026-11-01','2026-11-01')", [EVENTO_SEGUINTE, INSTITUICAO_A, unidade]);
    await gravarNaInstituicao(banco, INSTITUICAO_B, "insert into eventos.evento values ($1,$2,$3,$4,'CERIMONIA','2026-09-10','2026-09-10')", [EVENTO_B, INSTITUICAO_B, unidadeB, SEGREDO]);

    const receitaA = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'CONTRIB_CDD');
    const receitaB = await idDoCadastro(banco, INSTITUICAO_B, 'categoria', 'CONTRIB_CDD');
    const despesa = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'MANUTENCAO');
    const comum = { instituicao: INSTITUICAO_A, unidade, conta: CONTA, autor: autorA, grupo: GRUPO,
      evento: EVENTO, competencia: '2026-09-10', natureza: 'RECEITA' as const };
    await gravarLancamento(banco, { ...comum, id: ORIGINAL, caixa: '2026-10-01', motivo: 'Contribuição devolvida',
      valor: 21000, etiquetas: [[receitaA, 'RECEITA', 21000]] });
    await gravarLancamento(banco, { ...comum, id: DEVOLUCAO, estorno: ORIGINAL, caixa: '2026-10-02', motivo: 'Devolução',
      valor: 21000, etiquetas: [[receitaA, 'RECEITA', 21000]] });
    await gravarLancamento(banco, { ...comum, caixa: '2026-10-01', motivo: 'Contribuição líquida',
      valor: 10000, etiquetas: [[receitaA, 'RECEITA', 10000]] });
    await gravarLancamento(banco, { ...comum, unidade: destino, autor: outro, caixa: '2026-10-03', competencia: '2026-10-03',
      motivo: 'Movimento com etiquetas mistas', natureza: 'DESPESA', valor: 5000,
      etiquetas: [[receitaA, 'RECEITA', 1000], [despesa, 'DESPESA', 6000]] });
    await gravarLancamento(banco, { ...comum, id: PENDENTE, motivo: 'Falta conferir', valor: 99000,
      unidade: null, conta: null, competencia: undefined, pendente: true });
    await gravarNaInstituicao(banco, INSTITUICAO_A, `insert into financeiro.pendencia
      (id,instituicao_id,lancamento_id,texto,aberta_por,destinatario,aberta_em) values (gen_random_uuid(),$1,$2,'Qual foi a conta?',$3,$3,now())`, [INSTITUICAO_A, PENDENTE, autorA]);
    await gravarLancamento(banco, { ...comum, autor: await idDoAutor(banco, INSTITUICAO_A, TESOURARIA),
      competencia: '2026-10-01', motivo: 'Etiquetas divergentes', valor: 200, pendente: true, etiquetas: [[receitaA, 'RECEITA', 100]] });
    await gravarLancamento(banco, { ...comum, autor: await idDoAutor(banco, INSTITUICAO_A, TESOURARIA),
      competencia: '2026-11-01', evento: EVENTO_SEGUINTE, grupo: undefined, motivo: 'Confirmado sem data de caixa',
      valor: 7000, etiquetas: [[receitaA, 'RECEITA', 7000]] });
    const daCasaB = { instituicao: INSTITUICAO_B, unidade: unidadeB, conta: CONTA_B, autor: autorB,
      grupo: GRUPO_B, evento: EVENTO_B, competencia: '2026-09-10', caixa: '2026-10-01',
      motivo: SEGREDO, natureza: 'RECEITA' as const, valor: 987654 };
    await gravarLancamento(banco, { ...daCasaB, etiquetas: [[receitaB, 'RECEITA', 987654]] });
    await gravarLancamento(banco, { ...daCasaB, id: PENDENTE_B, pendente: true });

    await gravarNaInstituicao(banco, INSTITUICAO_A, `insert into financeiro.transferencia
      (id,instituicao_id,finalidade,status,valor,data,conta_origem_id,conta_destino_id,unidade_id,unidade_destino_id,
       motivo,estorno_de_id,registrado_por,registrado_em)
      values ($1,$2,'REPASSE_ENTRE_UNIDADES','CONFIRMADO',2000,'2026-10-04',$3,$4,$5,$6,'Repasse estornado',null,$7,now()),
             ($8,$2,'REPASSE_ENTRE_UNIDADES','CONFIRMADO',2000,'2026-10-05',$3,$4,$5,$6,'Estorno de repasse',$1,$7,now()),
             (gen_random_uuid(),$2,'REPASSE_ENTRE_UNIDADES','CONFIRMADO',500,'2026-10-06',$3,$4,$5,$6,'Repasse líquido',null,$7,now()),
             (gen_random_uuid(),$2,'REPASSE_ENTRE_UNIDADES','A_CONFERIR',8000,'2026-10-07',$3,$4,$5,$6,'Repasse pendente',null,$7,now())`,
    [TRANSFERENCIA, INSTITUICAO_A, CONTA, CONTA_DESTINO, unidade, destino, autorA, ESTORNO_TRANSFERENCIA]);
  });

  afterAll(async () => {
    await ambiente?.app.encerrar();
    if (banco) await derrubarBancoDeTeste(banco);
  });

  async function consultar(rota: string, sujeito = RELATORIOS) {
    const resposta = await ambiente.app.pedirComo(sujeito, BASE + rota);
    return { status: resposta.status, corpo: await resposta.json() as unknown, cache: resposta.headers.get('cache-control') };
  }

  it.each([
    '/meus-registros', '/fila-conferencia', '/lancamentos', '/contas/saldos', '/fundos/saldos',
    '/relatorios/dre?competencia=2026-09', '/relatorios/fluxo-de-caixa?de=2026-10-01&ate=2026-10-31',
    '/relatorios/grupos-de-custo', '/relatorios/cerimonias', `/relatorios/cerimonias/${EVENTO}`,
  ])('protege %s por permissão e instituição', async rota => {
    expect((await consultar(rota, SEM_GRUPO)).status).toBe(403);
    const permitido = await consultar(rota, rota === '/meus-registros' ? AUTOR : RELATORIOS);
    expect(permitido.status).toBe(200);
    expect(permitido.cache).toBe('no-store');
    const corpo = JSON.stringify(permitido.corpo);
    expect(corpo).not.toContain(SEGREDO);
    expect(corpo).not.toContain('987654');
    expect(corpo).not.toContain(CONTA_B);
    expect(corpo).not.toContain(FUNDO_B);
  });

  it('Meus registros filtra autor da sessão, traz pendência e omite conta, autor e agregados', async () => {
    const resposta = await consultar('/meus-registros?limite=100&usuarioId=' + autorA, OUTRO);
    expect(resposta.corpo).toMatchObject({ itens: [{ motivo: 'Movimento com etiquetas mistas' }], proximaPagina: null });
    const minha = (await consultar('/meus-registros', AUTOR)).corpo as { itens: Record<string, unknown>[] };
    expect(minha.itens).toContainEqual(expect.objectContaining({ id: PENDENTE, pendencia: expect.objectContaining({ texto: 'Qual foi a conta?' }) }));
    expect(minha.itens[0]).not.toHaveProperty('conta');
    expect(minha.itens[0]).not.toHaveProperty('registradoPor');
    expect(await consultar('/lancamentos', AUTOR)).toMatchObject({ status: 403 });
    expect((await consultar('/meus-registros', RELATORIOS_B)).corpo).toMatchObject({ itens: expect.arrayContaining([expect.objectContaining({ id: PENDENTE_B })]) });
  });

  it('fila traz só pendentes com faltas e livro resolve rótulos, estornos e paginação', async () => {
    const fila = (await consultar('/fila-conferencia', TESOURARIA)).corpo as { itens: Record<string, unknown>[] };
    expect(fila.itens).toEqual([
      expect.objectContaining({ id: PENDENTE, faltas: ['UNIDADE', 'CONTA', 'COMPETENCIA', 'CATEGORIA', 'PENDENCIA'] }),
      expect.objectContaining({ motivo: 'Etiquetas divergentes', faltas: ['ETIQUETAS_NAO_FECHAM'] }),
      expect.objectContaining({ tipo: 'TRANSFERENCIA', motivo: 'Repasse pendente', faltas: [] }),
    ]);
    const livro = (await consultar('/lancamentos?competencia=2026-09')).corpo as { itens: Record<string, unknown>[] };
    expect(livro.itens).toHaveLength(3);
    expect(livro.itens).toContainEqual(expect.objectContaining({ id: ORIGINAL, status: 'ESTORNADO', cerimonia: 'Cerimônia A', grupo: 'Grupo A', categorias: [expect.any(String)] }));
    expect(livro.itens).toContainEqual(expect.objectContaining({ id: DEVOLUCAO, estornoDeId: ORIGINAL }));
    const pagina1 = (await consultar('/lancamentos?limite=1')).corpo as { itens: Record<string, unknown>[]; proximaPagina: number };
    const pagina2 = (await consultar('/lancamentos?limite=1&pagina=2')).corpo as typeof pagina1;
    expect(pagina1.proximaPagina).toBe(2);
    expect(pagina1.itens[0]?.['id']).not.toBe(pagina2.itens[0]?.['id']);
    const filtrado = (await consultar('/lancamentos?unidadeId=' + destino)).corpo as { itens: Record<string, unknown>[] };
    expect(filtrado.itens).toContainEqual(expect.objectContaining({ id: TRANSFERENCIA, status: 'ESTORNADO', unidadeDestinoId: destino }));
    expect(filtrado.itens).not.toContainEqual(expect.objectContaining({ id: ORIGINAL }));
  });

  it('DRE de setembro subtrai a devolução da receita e outubro soma as duas naturezas das etiquetas', async () => {
    expect((await consultar('/relatorios/dre?competencia=2026-09', SO_DRE)).corpo).toMatchObject({ receitas: 10000, despesas: 0, resultado: 10000 });
    expect((await consultar('/relatorios/dre?competencia=2026-10')).corpo).toMatchObject({ receitas: 1000, despesas: 6000, resultado: -5000 });
    expect((await consultar('/relatorios/dre?competencia=2026-10&unidadeId=' + unidade)).corpo).toEqual({ linhas: [], receitas: 0, despesas: 0, resultado: 0 });
    expect((await consultar('/relatorios/dre?competencia=2026-09', RELATORIOS_B)).corpo).toMatchObject({ receitas: 987654 });
    expect((await consultar('/relatorios/fluxo-de-caixa?de=2026-10-01&ate=2026-10-31', SO_DRE)).status).toBe(403);
  });

  it('saldo usa líquido, repasse e estorno por ponta e fundo lê a conta vinculada', async () => {
    const geral = await consultar('/contas/saldos');
    expect(geral.corpo).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: CONTA, saldo: 11500, ultimoMovimento: '2026-11-01' }),
      expect.objectContaining({ id: CONTA_DESTINO, saldo: 500 }),
    ]));
    expect((await consultar('/contas/saldos?unidadeId=' + destino)).corpo).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: CONTA, saldo: -5000 }),
      expect.objectContaining({ id: CONTA_DESTINO, saldo: 500 }),
    ]));
    expect((await consultar('/fundos/saldos')).corpo).toEqual([expect.objectContaining({ id: FUNDO, valorReservado: 500 })]);
    expect((await consultar('/fundos/saldos?unidadeId=' + unidade)).corpo).toEqual([]);
    expect((await consultar('/contas/saldos', CASA_B)).status).toBe(403);
  });

  it('fluxo usa data de caixa e repasses se anulam no consolidado', async () => {
    const rota = '/relatorios/fluxo-de-caixa?de=2026-10-01&ate=2026-11-30';
    expect((await consultar(rota)).corpo).toMatchObject({ entradas: 10000, saidas: 5000, transferenciasLiquidas: 0, liquido: 5000 });
    expect((await consultar(rota + '&unidadeId=' + destino)).corpo).toMatchObject({ entradas: 0, saidas: 5000, transferenciasLiquidas: 500, liquido: -4500 });
    expect((await consultar('/relatorios/fluxo-de-caixa?de=2026-09-01&ate=2026-09-30')).corpo).toEqual({ dias: [], entradas: 0, saidas: 0, transferenciasLiquidas: 0, liquido: 0 });
  });

  it('resultado por cerimônia resolve o evento da instituição e grupo reaproveita os efeitos das etiquetas', async () => {
    expect((await consultar(`/relatorios/cerimonias/${EVENTO}`)).corpo).toMatchObject({
      evento: { id: EVENTO, nome: 'Cerimônia A' }, receitas: 11000, despesas: 6000, resultado: 5000,
    });
    expect((await consultar('/relatorios/cerimonias?competencia=2026-09')).corpo).toEqual({
      itens: [expect.objectContaining({ evento: expect.objectContaining({ id: EVENTO }), resultado: 10000 })],
      proximaPagina: null,
    });
    expect((await consultar('/relatorios/cerimonias?limite=1')).corpo).toMatchObject({
      itens: [{ evento: { id: EVENTO_SEGUINTE }, resultado: 7000 }], proximaPagina: 2,
    });
    expect((await consultar('/relatorios/cerimonias', RELATORIOS_B)).corpo).toMatchObject({
      itens: [{ evento: { id: EVENTO_B }, resultado: 987654 }],
    });
    expect((await consultar(`/relatorios/cerimonias/${EVENTO_B}`)).status).toBe(404);
    expect((await consultar(`/relatorios/cerimonias/${EVENTO}`, RELATORIOS_B)).status).toBe(404);
    expect((await consultar('/relatorios/grupos-de-custo?competencia=2026-09')).corpo).toEqual([
      { grupoDeCustoId: GRUPO, nome: 'Grupo A', receitas: 10000, despesas: 0, resultado: 10000 },
    ]);
  });

  it.each([
    '/lancamentos?limite=101', '/fila-conferencia?pagina=-1', '/contas/saldos?unidadeId=xxx',
    '/relatorios/dre?competencia=0000-01', '/relatorios/fluxo-de-caixa?de=2026-10-02&ate=2026-10-01',
  ])('recusa filtro inválido em %s', async rota => {
    expect((await consultar(rota)).status).toBe(400);
  });
});
