import { describe, expect, it } from 'vitest';
import { CATALOGO_DO_DOC_3_SECAO_11 } from './catalogo-do-doc-3-secao-11.js';
import type { CasoDoDoc3 } from './catalogo-do-doc-3-secao-11.js';
import { ETAPA_ATUAL } from './etapa-atual.js';
import { configsDaApiNoCi, lerSecao11DoDoc3, lerTestesDaApi, lerTestesDosContratos, lerWorkflowDoCi } from './leitor-de-testes.js';
import {
  casosBloqueadosSemTodo,
  casosSemTeste,
  configsExecutadosPeloCi,
  configuracaoExecuta,
  contemIdComLimites,
  extrairTestes,
  globParaRegex,
  lacunasComProblema,
  lerConfiguracaoDoVitest,
} from './meta-da-suite.js';
import type { SituacaoDoTeste } from './meta-da-suite.js';

const IDS_DO_DOC_3_SECAO_11 = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
  'T13', 'T14', 'T15', 'T16', 'T16a', 'T16b', 'T16c', 'T16d', 'T16e',
  'T17', 'T18', 'T19', 'T20', 'T21', 'T22',
  'T23', 'T24', 'T25', 'T26', 'T27',
  'T28', 'T29', 'T30',
];

const IDS_DE_B1 = ['T9', 'T13', 'T14', 'T15', 'T16', 'T16a', 'T16b', 'T16c', 'T16d', 'T16e'];

const WORKFLOW = lerWorkflowDoCi();
const ESTE_ARQUIVO = 'test/autorizacao/meta-da-suite.spec.ts';
const TESTES_DO_REPOSITORIO = [...lerTestesDaApi(configsDaApiNoCi(WORKFLOW)), ...lerTestesDosContratos(WORKFLOW)].filter(
  ({ arquivo }) => arquivo !== ESTE_ARQUIVO,
);

function situacoesDoId(conteudo: string, id: string, arquivo = 'amostra.spec.ts'): SituacaoDoTeste[] {
  return extrairTestes(arquivo, conteudo)
    .filter((teste) => teste.titulos.some((titulo) => contemIdComLimites(titulo, id)))
    .map((teste) => teste.situacao);
}

function caso(id: string, sobras: Partial<CasoDoDoc3> = {}): CasoDoDoc3 {
  return { id, cenario: `cenário ${id}`, esperado: '**403**', etapa: 'B0', ...sobras };
}

describe('M1 · catálogo do Doc 3 §11', () => {
  it('ids do catálogo — comparação com a lista literal — são exatamente os 35 do documento, sem repetição', () => {
    const ids = CATALOGO_DO_DOC_3_SECAO_11.map(({ id }) => id);

    expect(ids).toEqual(IDS_DO_DOC_3_SECAO_11);
  });

  it('catálogo — comparação com as tabelas do §11 do Doc 3 — tem os mesmos ids, cenários e resultados esperados', () => {
    const linhasDoDoc = [...lerSecao11DoDoc3().matchAll(/^\| (T\d+[a-e]?) \| (.*) \| (.*) \|$/gm)].map(
      ([, id, cenario, esperado]) => ({ id, cenario, esperado }),
    );

    const doCatalogo = CATALOGO_DO_DOC_3_SECAO_11.map(({ id, cenario, esperado }) => ({ id, cenario, esperado }));

    expect(doCatalogo).toEqual(linhasDoDoc);
  });

});

describe('M2 · todo caso até a etapa atual tem teste ativo', () => {
  it(`etapa ${ETAPA_ATUAL} — testes do repositório — nenhum caso exigido fica sem teste ativo`, () => {
    const semTeste = casosSemTeste(CATALOGO_DO_DOC_3_SECAO_11, ETAPA_ATUAL, TESTES_DO_REPOSITORIO);

    expect(semTeste).toEqual([]);
  });

  it('etapa B1 sem títulos de B1 — testes do repositório — lista exatamente os casos de B1 do catálogo', () => {
    const semTeste = casosSemTeste(CATALOGO_DO_DOC_3_SECAO_11, 'B1', TESTES_DO_REPOSITORIO);

    expect(semTeste).toEqual(IDS_DE_B1);
  });

  it('casos de B1 — catálogo — são exatamente os dez esperados', () => {
    const idsDeB1 = CATALOGO_DO_DOC_3_SECAO_11.filter(({ etapa }) => etapa === 'B1').map(({ id }) => id);

    expect(idsDeB1).toEqual(IDS_DE_B1);
  });

  it('integração fora do CI — testes do repositório — casos cobertos só por integração ficam sem teste', () => {
    const semIntegracao = WORKFLOW.replace('pnpm --filter @cdd/api test:integracao', 'echo sem integracao');
    const testes = lerTestesDaApi(configsDaApiNoCi(semIntegracao)).filter(({ arquivo }) => arquivo !== ESTE_ARQUIVO);

    const semTeste = casosSemTeste(CATALOGO_DO_DOC_3_SECAO_11, 'B0', testes);

    expect(semTeste).toEqual(expect.arrayContaining(['T23', 'T25']));
  });

  it('caso exigido sem título — catálogo sintético — é listado', () => {
    const testes = extrairTestes('a.spec.ts', "it('T1 · coberto', () => {});");

    expect(casosSemTeste([caso('T1'), caso('T2')], 'B0', testes)).toEqual(['T2']);
  });

  it('caso com título só de id vizinha — id com sufixo não cobre a id sem sufixo', () => {
    const testes = extrairTestes('a.spec.ts', "it('T16a · outro caso', () => {});");

    expect(casosSemTeste([caso('T16'), caso('T16a')], 'B0', testes)).toEqual(['T16']);
  });

  it.each([
    { nome: 'it.skip', fonte: "it.skip('T1 · x', () => {});" },
    { nome: 'it.todo', fonte: "it.todo('T1 · x');" },
    { nome: 'test.todo com corpo', fonte: "test.todo('T1 · x', () => {});" },
    { nome: 'it.skipIf', fonte: "it.skipIf(true)('T1 · x', () => {});" },
    { nome: 'it.runIf', fonte: "it.runIf(false)('T1 · x', () => {});" },
    { nome: 'describe.skip ancestral', fonte: "describe.skip('suíte', () => { it('T1 · x', () => {}); });" },
    { nome: 'describe.skipIf ancestral', fonte: "describe.skipIf(true)('suíte', () => { it('T1 · x', () => {}); });" },
    { nome: 'describe.todo ancestral', fonte: "describe.todo('T1 · suíte');" },
    { nome: 'describe.runIf em ancestral distante', fonte: "describe('a', () => { describe.runIf(false)('b', () => { it('T1 · x', () => {}); }); });" },
    { nome: 'opção skip do node:test', fonte: "test('T1 · x', { skip: true }, () => {});" },
    { nome: 'título só por template com substituição', fonte: 'it(`T1 · ${nome}`, () => {});' },
    { nome: 'id só em comentário', fonte: "// T1\nit('outro', () => {});" },
    { nome: 'it sem corpo', fonte: "it('T1 · x');" },
  ])('$nome — extração — não conta como teste ativo do caso', ({ fonte }) => {
    const testes = extrairTestes('a.spec.ts', fonte);

    expect(casosSemTeste([caso('T1')], 'B0', testes)).toEqual(['T1']);
  });

  it.each([
    { nome: 'it simples', fonte: "it('T1 · x', () => {});" },
    { nome: 'test do node:test', fonte: "test('T1 · x', () => {});" },
    { nome: 'id no describe ancestral', fonte: "describe('T1 · suíte', () => { it('algo', () => {}); });" },
    { nome: 'it.each com id literal', fonte: "it.each([1, 2])('T1 · %s', (n) => {});" },
    { nome: 'it com template sem substituição', fonte: 'it(`T1 · x`, () => {});' },
    { nome: 'describe.each com id literal', fonte: "describe.each([1])('T1 · %s', () => { it('algo', () => {}); });" },
    { nome: 'opção skip falsa do node:test', fonte: "test('T1 · x', { skip: false }, () => {});" },
    { nome: 'it.skipIf em outro teste do mesmo arquivo', fonte: "it.skipIf(true)('outro', () => {});\nit('T1 · x', () => {});" },
  ])('$nome — extração — conta como teste ativo do caso', ({ fonte }) => {
    const testes = extrairTestes('a.spec.ts', fonte);

    expect(casosSemTeste([caso('T1')], 'B0', testes)).toEqual([]);
  });

  it('caso com dois ids de título — só um coberto — fica sem teste', () => {
    const testes = extrairTestes('a.spec.ts', "it('T28a · x', () => {});");

    expect(casosSemTeste([caso('T28', { idsDeTitulo: ['T28a', 'T28b'] })], 'B0', testes)).toEqual(['T28']);
  });
});

describe('M2 · id com limites', () => {
  it.each([
    { titulo: 'T16 · x', id: 'T16', casa: true },
    { titulo: 'T16a · x', id: 'T16', casa: false },
    { titulo: 'T16', id: 'T16a', casa: false },
    { titulo: 'T29(d) · x', id: 'T29', casa: true },
    { titulo: 'isolamento (T23)', id: 'T23', casa: false },
    { titulo: 'T5 · editar o gerado em T4', id: 'T4', casa: false },
    { titulo: 'T5 · editar o gerado em T4', id: 'T5', casa: true },
    { titulo: 'T123 · x', id: 'T23', casa: false },
    { titulo: 'XT23 · x', id: 'T23', casa: false },
    { titulo: 'x T23 · y', id: 'T23', casa: false },
    { titulo: 'T26 · Keycloak · x', id: 'T26 · Keycloak', casa: true },
  ])('"$titulo" — busca de $id — casa: $casa', ({ titulo, id, casa }) => {
    expect(contemIdComLimites(titulo, id)).toBe(casa);
  });
});

describe('M2 · testes de integração só contam se o CI os executa', () => {
  const UNITARIA = lerConfiguracaoDoVitest(
    'vitest.config.ts',
    "export default { test: { include: ['src/**/*.spec.ts', 'test/**/*.spec.ts', 'test/**/*.test.ts'], exclude: [...defaults, '**/*.integracao.test.ts'] } };",
  );
  const INTEGRACAO = lerConfiguracaoDoVitest(
    'vitest.integracao.config.ts',
    "export default { test: { include: ['**/*.integracao.test.ts'] } };",
  );

  it('configuração unitária — arquivo de integração — não executa', () => {
    expect(configuracaoExecuta(UNITARIA, 'test/x/y.integracao.test.ts')).toBe(false);
  });

  it('configuração unitária — spec e test comuns — executa', () => {
    expect([
      configuracaoExecuta(UNITARIA, 'test/a.spec.ts'),
      configuracaoExecuta(UNITARIA, 'test/x/y/b.test.ts'),
    ]).toEqual([true, true]);
  });

  it('configuração de integração — arquivo de integração em qualquer pasta — executa', () => {
    expect(configuracaoExecuta(INTEGRACAO, 'test/x/y.integracao.test.ts')).toBe(true);
  });

  it('configuração de integração — spec unitário — não executa', () => {
    expect(configuracaoExecuta(INTEGRACAO, 'test/a.spec.ts')).toBe(false);
  });

  it('glob — asterisco simples — não atravessa diretório', () => {
    expect(globParaRegex('test/*.spec.ts').test('test/x/a.spec.ts')).toBe(false);
  });

  it('workflow e scripts — leitura — devolvem as configurações que o CI roda', () => {
    const scripts = { test: 'vitest run', 'test:integracao': 'vitest run --config vitest.integracao.config.ts', lint: 'oxlint' };
    const workflow = 'run: pnpm --filter @cdd/api test\nrun: pnpm --filter @cdd/api test:integracao\nrun: pnpm --filter @cdd/api lint';

    expect(configsExecutadosPeloCi(workflow, '@cdd/api', scripts)).toEqual(['vitest.config.ts', 'vitest.integracao.config.ts']);
  });

  it('workflow sem a linha de integração — leitura — não devolve a configuração de integração', () => {
    const scripts = { test: 'vitest run', 'test:integracao': 'vitest run --config vitest.integracao.config.ts' };

    expect(configsExecutadosPeloCi('run: pnpm --filter @cdd/api test', '@cdd/api', scripts)).toEqual(['vitest.config.ts']);
  });

  it('CI real — configurações da api — inclui a de integração', () => {
    const nomes = configsDaApiNoCi(WORKFLOW).map(({ nome }) => nome);

    expect(nomes).toEqual(['vitest.config.ts', 'vitest.integracao.config.ts']);
  });
});

describe('M3 · casos bloqueados por etapa futura têm it.todo com a etapa que os destrava', () => {
  it('etapa atual — suíte real — todo caso futuro tem it.todo rotulado com a etapa que o destrava', () => {
    const semTodo = casosBloqueadosSemTodo(CATALOGO_DO_DOC_3_SECAO_11, ETAPA_ATUAL, TESTES_DO_REPOSITORIO);

    expect(semTodo).toEqual([]);
  });

  it('caso futuro sem título — catálogo sintético — é listado', () => {
    const futuro = caso('T9', { etapa: 'B1' });

    expect(casosBloqueadosSemTodo([futuro], 'B0', [])).toEqual(['T9']);
  });

  it('caso futuro com it.todo de outra etapa — é listado', () => {
    const testes = extrairTestes('a.spec.ts', "it.todo('T9 · x — bloqueada até a B2');");

    expect(casosBloqueadosSemTodo([caso('T9', { etapa: 'B1' })], 'B0', testes)).toEqual(['T9']);
  });

  it('caso futuro com teste ativo em vez de it.todo — é listado', () => {
    const testes = extrairTestes('a.spec.ts', "it('T9 · x — bloqueada até a B1', () => {});");

    expect(casosBloqueadosSemTodo([caso('T9', { etapa: 'B1' })], 'B0', testes)).toEqual(['T9']);
  });

  it('caso futuro com it.todo da etapa certa — não é listado', () => {
    const testes = extrairTestes('a.spec.ts', "it.todo('T9 · x — bloqueada até a B1');");

    expect(casosBloqueadosSemTodo([caso('T9', { etapa: 'B1' })], 'B0', testes)).toEqual([]);
  });

  it('caso futuro com it.todo cuja id é só vizinha — é listado', () => {
    const testes = extrairTestes('a.spec.ts', "it.todo('T16a · x — bloqueada até a B1');");

    expect(casosBloqueadosSemTodo([caso('T16', { etapa: 'B1' })], 'B0', testes)).toEqual(['T16']);
  });

  it('etapa atual B1 — caso de B1 — deixa de exigir it.todo', () => {
    expect(casosBloqueadosSemTodo([caso('T9', { etapa: 'B1' })], 'B1', [])).toEqual([]);
  });
});

describe('M4 · lacunas declaradas', () => {
  const comLacuna = caso('T28', { lacunasDeclaradas: [{ marca: 'T28b', etapa: 'B0' }] });

  it('suíte real — lacunas do catálogo — todas têm it.todo visível e nenhum teste ativo', () => {
    expect(lacunasComProblema(CATALOGO_DO_DOC_3_SECAO_11, TESTES_DO_REPOSITORIO)).toEqual([]);
  });

  it('lacuna sem it.todo — catálogo sintético — é acusada', () => {
    expect(lacunasComProblema([comLacuna], [])).toEqual([{ marca: 'T28b', problema: 'sem-todo-visivel' }]);
  });

  it('lacuna que já ganhou teste ativo — catálogo sintético — é acusada para ser removida', () => {
    const testes = extrairTestes('a.spec.ts', "it('T28b · x', () => {});\nit.todo('T28b · x — lacuna da B0');");

    expect(lacunasComProblema([comLacuna], testes)).toEqual([{ marca: 'T28b', problema: 'ja-tem-teste-ativo' }]);
  });

  it('lacuna com it.todo da etapa certa — catálogo sintético — não é acusada', () => {
    const testes = extrairTestes('a.spec.ts', "it.todo('T28b · x — lacuna da B0');");

    expect(lacunasComProblema([comLacuna], testes)).toEqual([]);
  });

  it('lacuna com it.todo de outra etapa — catálogo sintético — é acusada', () => {
    const testes = extrairTestes('a.spec.ts', "it.todo('T28b · x — lacuna da B1');");

    expect(lacunasComProblema([comLacuna], testes)).toEqual([{ marca: 'T28b', problema: 'sem-todo-visivel' }]);
  });
});

describe('extração por AST · extras', () => {
  it('describe ativo com describe.skip filho — id no filho — situação inativa', () => {
    const fonte = "describe('pai', () => { describe.skip('filho', () => { it('T1 · x', () => {}); }); });";

    expect(situacoesDoId(fonte, 'T1')).toEqual(['inativo']);
  });

  it('describe sem corpo funcional — extração — não quebra nem produz teste', () => {
    expect(extrairTestes('a.spec.ts', "describe('T1');")).toEqual([]);
  });

  it('arquivo .mjs com test do node:test — extração — reconhece o teste ativo', () => {
    expect(situacoesDoId("test('T29(c) · x', () => {});", 'T29', 'catalogo.test.mjs')).toEqual(['ativo']);
  });

  it('testes dos contratos — leitura pelo glob real — T29 do catálogo aparece como ativo', () => {
    const dosContratos = lerTestesDosContratos(WORKFLOW).filter(({ arquivo }) => arquivo.endsWith('catalogo.test.mjs'));

    const situacoes = dosContratos
      .filter((teste) => teste.titulos.some((titulo) => contemIdComLimites(titulo, 'T29')))
      .map((teste) => teste.situacao);

    expect(situacoes).toContain('ativo');
  });
});
