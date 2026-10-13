import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

function arquivosDe(pasta: string, extensoes: readonly string[]): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) return arquivosDe(caminho, extensoes);
    const ehTeste = /\.test\.tsx?$/.test(entrada.name);
    return !ehTeste && extensoes.some((extensao) => entrada.name.endsWith(extensao)) ? [caminho] : [];
  });
}

const doSrc = (caminho: string) => relative(SRC, caminho);

const POSICAO_FIXA = /position:[^,}\n]*['"]fixed['"]/;

const SOBREPOSICOES_POR_PORTAL = [
  'ds/organisms/PainelDeAcao/PainelDeAcao.tsx',
  'pages/estoque/AyahuascaPage/components/FichaDoLote/FichaDoLote.tsx',
];

describe('vidro explícito', () => {
  it('position: fixed só aparece nas sobreposições conhecidas, fora do fluxo das superfícies de vidro', () => {
    const comPosicaoFixa = arquivosDe(SRC, ['.ts', '.tsx'])
      .filter((arquivo) => POSICAO_FIXA.test(readFileSync(arquivo, 'utf8')))
      .map(doSrc)
      .toSorted();

    expect(comPosicaoFixa).toEqual(SOBREPOSICOES_POR_PORTAL.toSorted());
  });

  it.each(SOBREPOSICOES_POR_PORTAL)('%s renderiza por portal', (arquivo) => {
    expect(readFileSync(join(SRC, arquivo), 'utf8')).toContain('createPortal(');
  });

  it('nenhum CSS aplica estilo pelo texto do style inline', () => {
    const porStyleInline = arquivosDe(SRC, ['.css'])
      .filter((arquivo) => /\[style[*^$~|]?=/.test(readFileSync(arquivo, 'utf8')))
      .map(doSrc);

    expect(porStyleInline).toEqual([]);
  });
});
