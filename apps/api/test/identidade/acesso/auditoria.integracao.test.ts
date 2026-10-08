import type { PaginaDeAuditoria, RegistroDeAuditoria } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoGrupoNomeado, novoUsuarioAtivo, semear, subirAplicacaoDeAcesso } from './ambiente-http.js';
import type { AplicacaoDeAcesso } from './ambiente-http.js';

const ROTA = '/api/v1/identidade/auditoria';
const SUJEITO_DE_A = 'sub-maria-casa-a';
const SUJEITO_SEM_PERMISSAO_DE_A = 'sub-ana-casa-a';
const SUJEITO_DE_B = 'sub-joao-casa-b';
const UM_SEGUNDO_EM_MS = 1000;

async function consultarNaInstituicao<T extends object>(
  banco: BancoDeTeste,
  instituicaoId: string,
  comando: string,
): Promise<T[]> {
  await banco.owner.query('begin');
  try {
    await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
    return (await banco.owner.query(comando)).rows as T[];
  } finally {
    await banco.owner.query('rollback');
  }
}

describe('GET /api/v1/identidade/auditoria (etapa B0)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    aplicacao = await subirAplicacaoDeAcesso(banco);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function semearCasaA() {
    const auditores = novoGrupoNomeado('Governança', ['sistema.auditoria.ler']);
    const visitantes = novoGrupoNomeado('Visitantes', ['financeiro.lancamento.ler']);
    const maria = novoUsuarioAtivo(SUJEITO_DE_A, 'Maria Silva', [auditores.id]);
    const ana = novoUsuarioAtivo(SUJEITO_SEM_PERMISSAO_DE_A, 'Ana Souza', [visitantes.id]);
    await semear(aplicacao, INSTITUICAO_A, [auditores, visitantes], maria);
    await semear(aplicacao, INSTITUICAO_A, [], ana);
    return { auditores, visitantes, maria, ana };
  }

  async function semearCasaB() {
    const auditores = novoGrupoNomeado('Governança', ['sistema.auditoria.ler']);
    const joao = novoUsuarioAtivo(SUJEITO_DE_B, 'João Lima', [auditores.id]);
    await semear(aplicacao, INSTITUICAO_B, [auditores], joao);
    return { joao };
  }

  async function consultar(sujeito: string, consulta = ''): Promise<{ status: number; corpo: PaginaDeAuditoria }> {
    aplicacao.relogio.avancarEmMs(UM_SEGUNDO_EM_MS);
    const resposta = await aplicacao.pedirComo(sujeito, `${ROTA}${consulta}`);
    return { status: resposta.status, corpo: (await resposta.json()) as PaginaDeAuditoria };
  }

  function operacoes(itens: readonly RegistroDeAuditoria[]): string[] {
    return itens.map(({ operacao }) => operacao);
  }

  function consultasRegistradas(instituicaoId: string): Promise<{ detalhes: unknown; sensivel: boolean }[]> {
    return consultarNaInstituicao(
      banco,
      instituicaoId,
      "select detalhes, sensivel from identidade.registro_de_auditoria where operacao = 'AUDITORIA_CONSULTADA'",
    );
  }

  it('sem sistema.auditoria.ler responde 403 SEM_PERMISSAO e não registra consulta', async () => {
    await semearCasaA();

    const resposta = await consultar(SUJEITO_SEM_PERMISSAO_DE_A);

    expect(resposta.status).toBe(403);
    expect(resposta.corpo).toMatchObject({ erro: 'SEM_PERMISSAO' });
    expect(await consultasRegistradas(INSTITUICAO_A)).toEqual([]);
  });

  it('com a permissão responde 200 e a própria consulta aparece como AUDITORIA_CONSULTADA do autor', async () => {
    const { maria } = await semearCasaA();

    const { status, corpo } = await consultar(SUJEITO_DE_A);

    expect(status).toBe(200);
    expect(corpo.itens[0]).toMatchObject({
      operacao: 'AUDITORIA_CONSULTADA',
      autorTipo: 'USUARIO',
      autorId: maria.id,
      autorNome: 'Maria Silva',
      autorGrupo: 'Governança',
      alvo: 'Trilha de auditoria',
      detalhes: [],
      sensivel: true,
    });
    expect(await consultasRegistradas(INSTITUICAO_A)).toHaveLength(1);
  });

  it('resolve autor, grupo do autor e alvo na leitura por junção, sem nada disso gravado na trilha', async () => {
    const { maria } = await semearCasaA();

    const { corpo } = await consultar(SUJEITO_DE_A);

    const convite = corpo.itens.find(({ operacao, referencia }) => operacao === 'USUARIO_CONVIDADO' && referencia === maria.id);
    expect(convite).toMatchObject({ alvo: 'Maria Silva', autorTipo: 'USUARIO' });
    const [cru] = await consultarNaInstituicao<{ texto: string }>(
      banco,
      INSTITUICAO_A,
      `select string_agg(registro_de_auditoria::text, ' ') as texto from identidade.registro_de_auditoria`,
    );
    expect(cru?.texto).not.toContain('Maria Silva');
    expect(cru?.texto).not.toContain('Governança');
  });

  it('o filtro usado vira detalhe da consulta registrada, sem o cursor', async () => {
    await semearCasaA();

    await consultar(SUJEITO_DE_A, '?operacao=GRUPO_ALTERADO&de=2026-01-01T00:00:00.000Z&ate=2099-01-01T00:00:00.000Z');

    const [consulta] = await consultasRegistradas(INSTITUICAO_A);
    expect(consulta?.detalhes).toEqual([
      { rotulo: 'Período inicial', valor: '2026-01-01T00:00:00.000Z' },
      { rotulo: 'Período final', valor: '2099-01-01T00:00:00.000Z' },
      { rotulo: 'Operação', valor: 'GRUPO_ALTERADO' },
    ]);
  });

  it('filtra por operação', async () => {
    await semearCasaA();
    await consultar(SUJEITO_DE_A);

    const { corpo } = await consultar(SUJEITO_DE_A, '?operacao=AUDITORIA_CONSULTADA');

    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(new Set(operacoes(corpo.itens))).toEqual(new Set(['AUDITORIA_CONSULTADA']));
  });

  it('filtra por período: instante futuro não traz nada além da própria consulta, que já nasce fora da janela', async () => {
    await semearCasaA();

    const { corpo } = await consultar(SUJEITO_DE_A, '?de=2099-01-01T00:00:00.000Z');

    expect(corpo.itens).toEqual([]);
    expect(corpo.proxima).toBeNull();
  });

  it('período fechado em ate exclui o que veio depois', async () => {
    await semearCasaA();

    const { corpo } = await consultar(SUJEITO_DE_A, '?ate=2026-03-01T10:00:00.000Z');

    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(operacoes(corpo.itens)).not.toContain('AUDITORIA_CONSULTADA');
    expect(corpo.itens.every(({ em }) => em <= '2026-03-01T10:00:00.000Z')).toBe(true);
  });

  it.each([
    ['período invertido', '?de=2026-03-02T00:00:00.000Z&ate=2026-03-01T00:00:00.000Z'],
    ['operação fora do catálogo', '?operacao=INVENTADA'],
    ['limite acima do máximo', '?limite=101'],
    ['limite zero', '?limite=0'],
    ['instante sem fuso', '?de=2026-03-01T00:00:00'],
    ['cursor ilegível', '?depois=lixo'],
  ])('%s responde 400 CORPO_INVALIDO e não registra consulta', async (_descricao, consulta) => {
    await semearCasaA();

    const resposta = await consultar(SUJEITO_DE_A, consulta);

    expect(resposta.status).toBe(400);
    expect(resposta.corpo).toMatchObject({ erro: 'CORPO_INVALIDO' });
    expect(await consultasRegistradas(INSTITUICAO_A)).toEqual([]);
  });

  it('pagina por cursor opaco sem repetir nem pular registro, do mais novo ao mais antigo', async () => {
    await semearCasaA();
    const existentes = (
      await consultarNaInstituicao<{ id: string }>(
        banco,
        INSTITUICAO_A,
        'select id from identidade.registro_de_auditoria order by em desc, id desc',
      )
    ).map(({ id }) => id);
    expect(existentes.length).toBeGreaterThan(3);

    const vistos: string[] = [];
    let consulta = '?limite=3';
    let paginas = 0;
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- cada página depende do cursor da anterior
      const { status, corpo } = await consultar(SUJEITO_DE_A, consulta);
      expect(status).toBe(200);
      expect(corpo.itens.length).toBeLessThanOrEqual(3);
      vistos.push(...corpo.itens.map(({ id }) => id));
      paginas += 1;
      if (corpo.proxima === null) break;
      expect(corpo.proxima).toMatch(/^[A-Za-z0-9_-]+$/);
      consulta = `?limite=3&depois=${corpo.proxima}`;
    }

    expect(paginas).toBeGreaterThan(1);
    expect(new Set(vistos).size).toBe(vistos.length);
    expect(vistos.slice(-existentes.length)).toEqual(existentes);
  });

  it('a instituição A não vê a trilha da B e vice-versa', async () => {
    const { maria } = await semearCasaA();
    const { joao } = await semearCasaB();

    const deB = await consultar(SUJEITO_DE_B);
    const deA = await consultar(SUJEITO_DE_A);

    expect(deB.status).toBe(200);
    expect(deB.corpo.itens.map(({ referencia }) => referencia)).not.toContain(maria.id);
    expect(deB.corpo.itens.map(({ referencia }) => referencia)).toContain(joao.id);
    expect(deA.corpo.itens.map(({ referencia }) => referencia)).not.toContain(joao.id);
    expect(await consultasRegistradas(INSTITUICAO_A)).toHaveLength(1);
    expect(await consultasRegistradas(INSTITUICAO_B)).toHaveLength(1);
  });
});
