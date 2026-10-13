import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { abrirPrograma, arquivosDoTsconfig, diagnosticosDeTipos, modulosNaoResolvidos } from '../escrita/motor-de-programa.js';
import type { ProgramaAnalisavel } from '../escrita/motor-de-programa.js';
import { CASOS_PLANTADOS_COM_OCORRENCIA, CASOS_PLANTADOS_PERMITIDOS } from './casos-plantados-do-web.js';
import type { CasoPlantadoDeNomeDeGrupo } from './casos-plantados-do-web.js';
import { detectarNomeDeGrupo } from './detector-de-nome-de-grupo.js';
import type { RelatorioDeNomeDeGrupo } from './detector-de-nome-de-grupo.js';
import { politicaDoWeb } from './politica-do-web.js';

const RAIZ_DO_WEB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'web');
const RAIZ_DE_SRC = join(RAIZ_DO_WEB, 'src');
const TSCONFIG_DO_WEB = join(RAIZ_DO_WEB, 'tsconfig.json');
const TEMPO_MAXIMO_DA_ABERTURA_EM_MS = 120_000;
const MINIMO_DE_ARQUIVOS_REAIS_VARRIDOS = 100;
const ARQUIVO_DE_TESTE = /\.test\.tsx?$/;

const CASOS_PLANTADOS: readonly CasoPlantadoDeNomeDeGrupo[] = [
  ...CASOS_PLANTADOS_COM_OCORRENCIA,
  ...CASOS_PLANTADOS_PERMITIDOS,
];

const ARQUIVOS_PLANTADOS: ReadonlyMap<string, string> = new Map(
  CASOS_PLANTADOS.map((caso) => [join(RAIZ_DE_SRC, caso.arquivo), caso.linhas.join('\n')]),
);

function ehCodigoDeProducao(caminho: string): boolean {
  return caminho.startsWith(`${RAIZ_DE_SRC}/`) && !ARQUIVO_DE_TESTE.test(caminho);
}

function ehPlantado(caminhoRelativo: string): boolean {
  return CASOS_PLANTADOS.some((caso) => caso.arquivo === caminhoRelativo);
}

describe('T28b · web · nenhum nome de grupo comparado nem guardado no estado da tela em apps/web/src', () => {
  let programa: ProgramaAnalisavel;
  let relatorio: RelatorioDeNomeDeGrupo;

  beforeAll(() => {
    const raizes = arquivosDoTsconfig(TSCONFIG_DO_WEB).filter(ehCodigoDeProducao);
    programa = abrirPrograma(TSCONFIG_DO_WEB, raizes, ehCodigoDeProducao, ARQUIVOS_PLANTADOS);
    relatorio = detectarNomeDeGrupo(programa, RAIZ_DE_SRC, politicaDoWeb());
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  function ocorrenciasDe(arquivo: string): readonly string[] {
    return relatorio.ocorrencias
      .filter((achada) => achada.arquivo === arquivo)
      .map((achada) => `${achada.linha}|${achada.forma}`);
  }

  it('programa do web — resolução de módulos — nenhum import fica sem resolver', () => {
    expect(modulosNaoResolvidos(programa)).toEqual([]);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('programa do web com os casos plantados — diagnóstico de tipos — nenhum erro', () => {
    expect(diagnosticosDeTipos(programa)).toEqual([]);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('varredura — arquivos vistos — cobre o src real e os casos plantados, sem os testes', () => {
    const reais = relatorio.arquivosVarridos.filter((arquivo) => !ehPlantado(arquivo));

    expect(reais.length).toBeGreaterThanOrEqual(MINIMO_DE_ARQUIVOS_REAIS_VARRIDOS);
    expect(reais).toContain('pages/sistema/AcessosPage/components/SeletorDeGrupos/SeletorDeGrupos.tsx');
    expect(reais.filter((arquivo) => ARQUIVO_DE_TESTE.test(arquivo))).toEqual([]);
    expect(relatorio.arquivosVarridos).toEqual(expect.arrayContaining(CASOS_PLANTADOS.map((caso) => caso.arquivo)));
  });

  it('produção — comparação, case, pertencimento ou estado com código ou nome de grupo — nenhuma ocorrência', () => {
    const ocorrencias = relatorio.ocorrencias
      .filter((achada) => !ehPlantado(achada.arquivo))
      .map((achada) => `${achada.arquivo}:${achada.linha} ${achada.forma}`);

    expect(ocorrencias).toEqual([]);
  });

  it.each(CASOS_PLANTADOS_COM_OCORRENCIA)(
    'violação plantada $arquivo — detector — reporta exatamente as ocorrências plantadas',
    ({ arquivo, ocorrencias }) => {
      expect(ocorrenciasDe(arquivo)).toEqual(ocorrencias);
    },
  );

  it.each(CASOS_PLANTADOS_PERMITIDOS)('uso permitido $arquivo — detector — não reporta ocorrência', ({ arquivo }) => {
    expect(ocorrenciasDe(arquivo)).toEqual([]);
  });
});
