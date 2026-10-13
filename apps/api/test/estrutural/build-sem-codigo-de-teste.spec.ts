import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { abrirPrograma, arquivosDoTsconfig } from './escrita/motor-de-programa.js';

const RAIZ_DA_API = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZ_DE_SRC = join(RAIZ_DA_API, 'src');
const TSCONFIG_DO_BUILD = join(RAIZ_DA_API, 'tsconfig.build.json');
const CODIGO_DE_TESTE = /\.(spec|fake)\.ts$/;
const TEMPO_MAXIMO_DA_ABERTURA_EM_MS = 120_000;

function ehDoSrc(caminho: string): boolean {
  return caminho.startsWith(`${RAIZ_DE_SRC}/`);
}

describe('build da api sem código de teste', () => {
  it(
    'tsconfig.build.json — arquivos que entram no programa, raízes e importados — nenhum *.spec.ts nem *.fake.ts',
    () => {
      const raizes = arquivosDoTsconfig(TSCONFIG_DO_BUILD);
      const programa = abrirPrograma(TSCONFIG_DO_BUILD, raizes, ehDoSrc);
      const compilados = programa.arquivos.map((arquivo) => relative(RAIZ_DA_API, arquivo.fileName));

      expect(compilados.length).toBeGreaterThan(0);
      expect(compilados.filter((caminho) => CODIGO_DE_TESTE.test(caminho))).toEqual([]);
    },
    TEMPO_MAXIMO_DA_ABERTURA_EM_MS,
  );
});
