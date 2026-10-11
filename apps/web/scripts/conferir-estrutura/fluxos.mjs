import { posix } from 'node:path';
import { ehPascalCase } from './arvore.mjs';
import { erro } from './ocorrencias.mjs';

const PASTA_DAS_PAGINAS = 'pages';
const PASTAS_DE_TIPO = ['components', 'hooks', 'utils', 'mocks'];
const ARQUIVOS_DE_TIPO = ['constantes.ts'];
const TIPOS_COMPARTILHADOS = [...PASTAS_DE_TIPO.map((pasta) => `${pasta}/`), ...ARQUIVOS_DE_TIPO];

const ehAgrupamento = (pasta) => !ehPascalCase(pasta) && !PASTAS_DE_TIPO.includes(posix.basename(pasta));

const agrupamentosEm = (arvore, pai) =>
  arvore.pastas.filter((pasta) => posix.dirname(pasta) === pai && ehAgrupamento(pasta));

const temTipoCompartilhado = (arvore, fluxo) =>
  [...PASTAS_DE_TIPO, ...ARQUIVOS_DE_TIPO].some((tipo) => arvore.existe(posix.join(fluxo, tipo)));

export function conferirFluxos(arvore) {
  const fluxos = agrupamentosEm(arvore, PASTA_DAS_PAGINAS).flatMap((modulo) =>
    agrupamentosEm(arvore, modulo),
  );

  return {
    fluxos: fluxos.length,
    ocorrencias: fluxos
      .filter((fluxo) => !temTipoCompartilhado(arvore, fluxo))
      .map((fluxo) =>
        erro(fluxo, `fluxo sem pasta de tipo compartilhada (${TIPOS_COMPARTILHADOS.join(', ')})`),
      ),
  };
}
