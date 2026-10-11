import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const PASCAL_CASE = /^[A-Z]/;

export const ehPascalCase = (caminho) => PASCAL_CASE.test(posix.basename(caminho));

const emPosix = (caminho) => caminho.split(sep).join('/');

export function lerArvore(raiz) {
  const entradas = readdirSync(raiz, { recursive: true, withFileTypes: true });
  const caminhoDe = (entrada) => emPosix(relative(raiz, join(entrada.parentPath, entrada.name)));
  const pastas = entradas.filter((entrada) => entrada.isDirectory()).map(caminhoDe).toSorted();
  const arquivos = entradas.filter((entrada) => entrada.isFile()).map(caminhoDe).toSorted();
  const existentes = new Set([...pastas, ...arquivos]);

  return {
    pastas,
    arquivos,
    existe: (caminho) => existentes.has(caminho),
    ler: (caminho) => readFileSync(join(raiz, caminho), 'utf8'),
  };
}
