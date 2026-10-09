import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ICruiseResult } from 'dependency-cruiser';
import { beforeAll, describe, expect, it } from 'vitest';
import { CASOS_DAS_FRONTEIRAS, type NomeDaRegra } from './casosDasFronteiras';

const DIRETORIO_DO_TESTE = dirname(fileURLToPath(import.meta.url));
const RAIZ_DO_REPOSITORIO = join(DIRETORIO_DO_TESTE, '..', '..', '..', '..');
const BINARIO_DEPCRUISE = join(RAIZ_DO_REPOSITORIO, 'node_modules', '.bin', 'depcruise');
const FIXTURE_POSITIVA = 'apps/web/test/estrutural/fixtures';
const FIXTURE_NEGATIVA = 'apps/web/test/estrutural/fixtures-negativas';
const CONFIGURACAO_DO_WEB = '.dependency-cruiser.web.mjs';
const CONFIGURACAO_DA_CATRACA = '.dependency-cruiser.web.catraca.mjs';
const LIMITE_DA_SAIDA_EM_BYTES = 64 * 1024 * 1024;
const TEMPO_DE_CRUZAMENTO_EM_MS = 60_000;
const REGRAS = Object.keys(CASOS_DAS_FRONTEIRAS) as NomeDaRegra[];

function cruzar(configuracao: string, caminho: string): ICruiseResult {
  const resultado = spawnSync(
    BINARIO_DEPCRUISE,
    ['--config', configuracao, '--output-type', 'json', caminho],
    { cwd: RAIZ_DO_REPOSITORIO, encoding: 'utf8', maxBuffer: LIMITE_DA_SAIDA_EM_BYTES },
  );

  if (resultado.error) {
    throw resultado.error;
  }

  return JSON.parse(resultado.stdout) as ICruiseResult;
}

function cruzarFixture(fixture: string): ICruiseResult {
  return cruzar(`${fixture}/.dependency-cruiser.mjs`, `${fixture}/apps/web/src`);
}

function regrasDaConfiguracao(configuracao: string) {
  const resultado = cruzar(configuracao, `${FIXTURE_NEGATIVA}/apps/web/src`);

  return resultado.summary.ruleSetUsed?.forbidden ?? [];
}

function nomeDoPacote(caminhoDentroDeNodeModules: string): string {
  const [escopoOuNome = '', nome = ''] = caminhoDentroDeNodeModules.split('/');

  return escopoOuNome.startsWith('@') ? `${escopoOuNome}/${nome}` : escopoOuNome;
}

function relativoAFixture(fixture: string, caminho: string): string {
  const trechosDeNodeModules = caminho.split('node_modules/');

  if (trechosDeNodeModules.length > 1) {
    return nomeDoPacote(trechosDeNodeModules.at(-1) ?? '');
  }

  return caminho.replace(`${fixture}/apps/web/src/`, '');
}

function importsAcusados(resultado: ICruiseResult, fixture: string, regra: NomeDaRegra): Set<string> {
  return new Set(
    resultado.summary.violations
      .filter((violacao) => violacao.rule.name === regra)
      .map(
        (violacao) =>
          `${relativoAFixture(fixture, violacao.from)} -> ${relativoAFixture(fixture, violacao.to)}`,
      ),
  );
}

function dependencias(
  resultado: ICruiseResult,
  fixture: string,
  { incluirCiclos }: { incluirCiclos: boolean },
): string[] {
  return resultado.modules.flatMap((modulo) =>
    modulo.dependencies
      .filter((dependencia) => incluirCiclos || !dependencia.circular)
      .map(
        (dependencia) =>
          `${relativoAFixture(fixture, modulo.source)} -> ${relativoAFixture(fixture, dependencia.resolved)}`,
      ),
  );
}

function importsNaoResolvidos(resultado: ICruiseResult): string[] {
  return resultado.modules.flatMap((modulo) =>
    modulo.dependencies
      .filter((dependencia) => dependencia.couldNotResolve)
      .map((dependencia) => `${modulo.source} -> ${dependencia.module}`),
  );
}

describe('fronteiras do web', () => {
  let positiva: ICruiseResult;
  let negativa: ICruiseResult;

  beforeAll(() => {
    positiva = cruzarFixture(FIXTURE_POSITIVA);
    negativa = cruzarFixture(FIXTURE_NEGATIVA);
  }, TEMPO_DE_CRUZAMENTO_EM_MS);

  it('toda regra da configuração tem caso, com a severidade prevista', () => {
    const severidadesDaConfiguracao = Object.fromEntries(
      (positiva.summary.ruleSetUsed?.forbidden ?? []).map((regra) => [regra.name, regra.severity]),
    );
    const severidadesPrevistas = Object.fromEntries(
      REGRAS.map((regra) => [regra, CASOS_DAS_FRONTEIRAS[regra].severidade]),
    );

    expect(severidadesDaConfiguracao).toEqual(severidadesPrevistas);
  });

  it('as fixtures resolvem todos os imports', () => {
    expect(importsNaoResolvidos(positiva)).toEqual([]);
    expect(importsNaoResolvidos(negativa)).toEqual([]);
  });

  it.each(REGRAS)('%s acusa exatamente os imports previstos da fixture positiva', (regra) => {
    expect(importsAcusados(positiva, FIXTURE_POSITIVA, regra)).toEqual(
      new Set(CASOS_DAS_FRONTEIRAS[regra].acusa),
    );
  });

  it('todo import da fixture positiva fora de ciclo é acusado por alguma regra', () => {
    const acusados = new Set(
      REGRAS.flatMap((regra) => [...importsAcusados(positiva, FIXTURE_POSITIVA, regra)]),
    );
    const naoAcusados = dependencias(positiva, FIXTURE_POSITIVA, { incluirCiclos: false }).filter(
      (dependencia) => !acusados.has(dependencia),
    );

    expect(naoAcusados).toEqual([]);
  });

  it('a fixture negativa não viola nenhuma fronteira', () => {
    expect(negativa.summary.violations).toEqual([]);
  });

  it.each(REGRAS)('%s não acusa os imports permitidos da fixture negativa', (regra) => {
    expect(dependencias(negativa, FIXTURE_NEGATIVA, { incluirCiclos: true })).toEqual(
      expect.arrayContaining([...CASOS_DAS_FRONTEIRAS[regra].permite]),
    );
    expect(importsAcusados(negativa, FIXTURE_NEGATIVA, regra)).toEqual(new Set());
  });

  it(
    'a configuração da catraca é a do web com toda regra elevada a error',
    () => {
      const regrasDoWeb = regrasDaConfiguracao(CONFIGURACAO_DO_WEB);
      const regrasDaCatraca = regrasDaConfiguracao(CONFIGURACAO_DA_CATRACA);

      expect(regrasDaCatraca).toEqual(
        regrasDoWeb.map((regra) => Object.assign({}, regra, { severity: 'error' })),
      );
    },
    TEMPO_DE_CRUZAMENTO_EM_MS,
  );

  it(
    'apps/web/src não tem violação de severidade error',
    () => {
      const resultado = cruzar(CONFIGURACAO_DO_WEB, 'apps/web/src');

      expect(resultado.summary.violations.filter((violacao) => violacao.rule.severity === 'error')).toEqual(
        [],
      );
    },
    TEMPO_DE_CRUZAMENTO_EM_MS,
  );
});
