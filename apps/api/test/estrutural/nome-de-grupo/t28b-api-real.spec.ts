import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { abrirPrograma, arquivosDoTsconfig, modulosNaoResolvidos } from '../escrita/motor-de-programa.js';
import type { ProgramaAnalisavel } from '../escrita/motor-de-programa.js';
import { detectarNomeDeGrupo } from './detector-de-nome-de-grupo.js';
import type { RelatorioDeNomeDeGrupo } from './detector-de-nome-de-grupo.js';
import { politicaDaApi, SEMENTE_DOS_GRUPOS } from './politica-da-api.js';

const RAIZ_DA_API = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RAIZ_DE_SRC = join(RAIZ_DA_API, 'src');
const TSCONFIG_DA_API = join(RAIZ_DA_API, 'tsconfig.json');
const TEMPO_MAXIMO_DA_ABERTURA_EM_MS = 120_000;
const MINIMO_DE_ARQUIVOS_VARRIDOS = 100;
const MINIMO_DE_ENTRADAS_NO_CONJUNTO_PROIBIDO = 12;

function ehCodigoDeProducao(caminho: string): boolean {
  return caminho.startsWith(`${RAIZ_DE_SRC}/`) && !/\.(test|spec)\.ts$/.test(caminho);
}

describe('T28b · api · nenhum nome de grupo comparado em apps/api/src', () => {
  let programa: ProgramaAnalisavel;
  let relatorio: RelatorioDeNomeDeGrupo;

  beforeAll(() => {
    const raizes = arquivosDoTsconfig(TSCONFIG_DA_API).filter(ehCodigoDeProducao);
    programa = abrirPrograma(TSCONFIG_DA_API, raizes, ehCodigoDeProducao);
    relatorio = detectarNomeDeGrupo(programa, RAIZ_DE_SRC, politicaDaApi());
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('programa da api — resolução de módulos — nenhum import fica sem resolver', () => {
    const naoResolvidos = modulosNaoResolvidos(programa);

    expect(naoResolvidos).toEqual([]);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('varredura — arquivos vistos — cobre o src e deixa de fora a semente dos grupos', () => {
    expect(relatorio.arquivosVarridos.length).toBeGreaterThanOrEqual(MINIMO_DE_ARQUIVOS_VARRIDOS);
    expect(relatorio.arquivosVarridos).toContain('modules/identidade/infrastructure/grupos/leitor-de-grupos.kysely.ts');
    expect(relatorio.arquivosVarridos).not.toContain(SEMENTE_DOS_GRUPOS);
  });

  it('política da api — conjunto proibido — não está vazio', () => {
    expect(politicaDaApi().proibidos.size).toBeGreaterThanOrEqual(MINIMO_DE_ENTRADAS_NO_CONJUNTO_PROIBIDO);
  });

  it('produção — comparação, case ou pertencimento com código ou nome de grupo — nenhuma ocorrência', () => {
    const ocorrencias = relatorio.ocorrencias.map((achada) => `${achada.arquivo}:${achada.linha} ${achada.forma}`);

    expect(ocorrencias).toEqual([]);
  });
});
