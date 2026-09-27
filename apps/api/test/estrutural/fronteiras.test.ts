import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { ICruiseResult } from 'dependency-cruiser';

const DIRETORIO_DO_TESTE = dirname(fileURLToPath(import.meta.url));
const RAIZ_DO_REPOSITORIO = join(DIRETORIO_DO_TESTE, '..', '..', '..', '..');
const BINARIO_DEPCRUISE = join(RAIZ_DO_REPOSITORIO, 'node_modules', '.bin', 'depcruise');

function cruzar(caminhosRelativosARaiz: string[]): ICruiseResult {
  const resultado = spawnSync(
    BINARIO_DEPCRUISE,
    ['--config', '.dependency-cruiser.mjs', '--output-type', 'json', ...caminhosRelativosARaiz],
    { cwd: RAIZ_DO_REPOSITORIO, encoding: 'utf8' },
  );

  if (resultado.error) {
    throw resultado.error;
  }

  return JSON.parse(resultado.stdout) as ICruiseResult;
}

function nomesDasRegrasVioladas(pasta: string): string[] {
  const resultado = cruzar([`apps/api/test/estrutural/${pasta}`]);

  return resultado.summary.violations.map((violacao) => violacao.rule.name);
}

const CASOS_POSITIVOS = [
  ['sem-dependencia-circular', 'fixtures/sem-dependencia-circular'],
  ['sem-dependencia-circular', 'fixtures/sem-dependencia-circular-tipo'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/nestjs'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/mikro-orm'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/mikro-orm-tipo'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/zod'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/pg'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/http'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/kysely'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/express'],
  ['dominio-sem-framework', 'fixtures/dominio-sem-framework/express-tipo'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/infrastructure'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/interface'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/application'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/tipo'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/banco'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/composicao'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/kernel-shared-infrastructure'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/domain-main-ts'],
  ['dominio-sem-camadas-externas', 'fixtures/dominio-sem-camadas-externas/kernel-pasta-nova'],
  ['modulo-so-por-public-api', 'fixtures/modulo-so-por-public-api/valor'],
  ['modulo-so-por-public-api', 'fixtures/modulo-so-por-public-api/tipo'],
  ['contracts-nao-importa-apps', 'fixtures/contracts-nao-importa-apps'],
  ['contracts-nao-importa-apps', 'fixtures/contracts-nao-importa-apps-tipo'],
] as const;

const CASOS_NEGATIVOS = [
  'fixtures-negativas/modulo-so-por-public-api/public-api-de-outro-modulo',
  'fixtures-negativas/modulo-so-por-public-api/mesmo-modulo',
] as const;

describe('fronteiras de arquitetura (Documento 7, §3 e §4)', () => {
  it.each(CASOS_POSITIVOS)('%s: a fixture de %s viola exatamente essa regra', (regra, pasta) => {
    expect(nomesDasRegrasVioladas(pasta)).toEqual([regra]);
  });

  it.each(CASOS_NEGATIVOS)('%s não viola nenhuma fronteira', (pasta) => {
    expect(nomesDasRegrasVioladas(pasta)).toEqual([]);
  });

  it('apps/api/src e packages/contracts/src não violam nenhuma fronteira', () => {
    const resultado = cruzar(['apps/api/src', 'packages/contracts/src']);

    expect(resultado.summary.violations).toEqual([]);
  });
});
