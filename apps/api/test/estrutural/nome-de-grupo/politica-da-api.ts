import { CODIGOS_DE_GRUPO_DE_SISTEMA } from '@cdd/contracts';
import { GRUPOS_DE_SISTEMA } from '../../../src/modules/identidade/domain/grupo/grupos-de-sistema.js';
import type { PoliticaDeNomeDeGrupo } from './detector-de-nome-de-grupo.js';

export const SEMENTE_DOS_GRUPOS = 'modules/identidade/domain/grupo/grupos-de-sistema.ts';

const PADRAO_DE_ARQUIVO_DE_TESTE = /\.(test|spec)\.[cm]?[jt]sx?$/;

export function conjuntoProibido(
  codigos: readonly string[] = CODIGOS_DE_GRUPO_DE_SISTEMA,
  nomes: readonly string[] = GRUPOS_DE_SISTEMA.map((grupo) => grupo.nome),
): ReadonlySet<string> {
  return new Set([...codigos, ...nomes]);
}

export function ehExcluidoNaApi(caminhoRelativoASrc: string): boolean {
  return PADRAO_DE_ARQUIVO_DE_TESTE.test(caminhoRelativoASrc) || caminhoRelativoASrc === SEMENTE_DOS_GRUPOS;
}

export function politicaDaApi(): PoliticaDeNomeDeGrupo {
  return { proibidos: conjuntoProibido(), ehExcluido: ehExcluidoNaApi };
}
