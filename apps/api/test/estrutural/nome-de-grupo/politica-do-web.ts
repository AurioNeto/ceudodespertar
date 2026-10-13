import type { PoliticaDeNomeDeGrupo } from './detector-de-nome-de-grupo.js';
import { conjuntoProibido } from './politica-da-api.js';

const PADRAO_DE_ARQUIVO_DE_TESTE = /\.test\.tsx?$/;

export const ARGUMENTO_DO_ESTADO_INICIAL: ReadonlyMap<string, number> = new Map([
  ['useState', 0],
  ['useReducer', 1],
]);

export function ehExcluidoNoWeb(caminhoRelativoASrc: string): boolean {
  return PADRAO_DE_ARQUIVO_DE_TESTE.test(caminhoRelativoASrc);
}

export function politicaDoWeb(): PoliticaDeNomeDeGrupo {
  return {
    proibidos: conjuntoProibido(),
    ehExcluido: ehExcluidoNoWeb,
    argumentoDoEstadoInicial: ARGUMENTO_DO_ESTADO_INICIAL,
  };
}
