import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import { describe, expect, it } from 'vitest';
import type { ICruiseOptions, ICruiseResult } from 'dependency-cruiser';

const DIRETORIO_DO_TESTE = dirname(fileURLToPath(import.meta.url));
const RAIZ_DO_REPOSITORIO = join(DIRETORIO_DO_TESTE, '..', '..', '..', '..');
const CAMINHO_DA_CONFIGURACAO_REAL = join(RAIZ_DO_REPOSITORIO, '.dependency-cruiser.mjs');

async function opcoesDeCruzamento(): Promise<ICruiseOptions> {
  const opcoesDoArquivo = await extractDepcruiseOptions(CAMINHO_DA_CONFIGURACAO_REAL);

  return {
    ...opcoesDoArquivo,
    baseDir: RAIZ_DO_REPOSITORIO,
    tsConfig: { fileName: join(RAIZ_DO_REPOSITORIO, 'tsconfig.base.json') },
    outputType: 'json',
  };
}

function resultadoComoJson(saida: ICruiseResult | string): ICruiseResult {
  if (typeof saida !== 'string') {
    throw new TypeError('dependency-cruiser não devolveu a saída em json');
  }

  return JSON.parse(saida) as ICruiseResult;
}

async function cruzar(caminhosRelativosARaiz: string[]): Promise<ICruiseResult> {
  const resultado = await cruise(caminhosRelativosARaiz, await opcoesDeCruzamento());

  return resultadoComoJson(resultado.output);
}

const REGRAS_DE_FRONTEIRA = [
  'sem-dependencia-circular',
  'dominio-sem-framework',
  'dominio-sem-camadas-externas',
  'modulo-so-por-public-api',
  'contracts-nao-importa-apps',
] as const;

describe('fronteiras de arquitetura (Documento 7, §3 e §4)', () => {
  it.each(REGRAS_DE_FRONTEIRA)('a fixture de %s viola exatamente essa regra', async (regra) => {
    const resultado = await cruzar([`apps/api/test/estrutural/fixtures/${regra}`]);
    const nomesDasRegrasVioladas = resultado.summary.violations.map((violacao) => violacao.rule.name);

    expect(nomesDasRegrasVioladas).toEqual([regra]);
  });

  it('apps/api/src e packages/contracts/src não violam nenhuma fronteira', async () => {
    const resultado = await cruzar(['apps/api/src', 'packages/contracts/src']);

    expect(resultado.summary.violations).toEqual([]);
  });
});
