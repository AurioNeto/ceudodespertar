import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CASOS_PLANTADOS_COM_VIOLACAO, CASOS_PLANTADOS_PERMITIDOS } from './casos-plantados-do-web.js';
import type { CasoPlantado } from './casos-plantados-do-web.js';
import { detectarRedeDoWeb } from './detector-de-rede-do-web.js';
import type { RelatorioDeRede } from './detector-de-rede-do-web.js';
import { abrirPrograma, arquivosDoTsconfig, diagnosticosDeTipos, modulosNaoResolvidos } from './motor-de-programa.js';
import type { ProgramaAnalisavel } from './motor-de-programa.js';

const RAIZ_DO_WEB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'web');
const RAIZ_DE_SRC = join(RAIZ_DO_WEB, 'src');
const TSCONFIG_DO_WEB = join(RAIZ_DO_WEB, 'tsconfig.json');
const TEMPO_MAXIMO_DA_ABERTURA_EM_MS = 120_000;
const MINIMO_DE_ARQUIVOS_REAIS_ANALISADOS = 100;
const ARQUIVO_DE_TESTE = /\.test\.tsx?$/;

const CASOS_PLANTADOS: readonly CasoPlantado[] = [...CASOS_PLANTADOS_COM_VIOLACAO, ...CASOS_PLANTADOS_PERMITIDOS];

const ACHADOS_CONHECIDOS = [
  { arquivo: 'dados/clienteHttp.ts', achado: 'rede:fetch' },
  { arquivo: 'app/sessao/fontesDaSessao.ts', achado: 'requisitar:GET' },
  { arquivo: 'pages/sistema/AcessosPage/consultas.ts', achado: 'requisitar:GET' },
] as const;

function ehCodigoDeProducao(caminho: string): boolean {
  return caminho.startsWith(`${RAIZ_DE_SRC}/`) && !ARQUIVO_DE_TESTE.test(caminho);
}

const ARQUIVOS_PLANTADOS: ReadonlyMap<string, string> = new Map(
  CASOS_PLANTADOS.map((caso) => [join(RAIZ_DE_SRC, caso.arquivo), caso.conteudo]),
);

function ehPlantado(caminhoRelativo: string): boolean {
  return CASOS_PLANTADOS.some((caso) => caso.arquivo === caminhoRelativo);
}

describe('T28a · web · escrita HTTP só pela camada de dados em apps/web/src', () => {
  let programa: ProgramaAnalisavel;
  let relatorio: RelatorioDeRede;

  beforeAll(() => {
    const raizes = arquivosDoTsconfig(TSCONFIG_DO_WEB).filter(ehCodigoDeProducao);
    programa = abrirPrograma(TSCONFIG_DO_WEB, raizes, ehCodigoDeProducao, ARQUIVOS_PLANTADOS);
    relatorio = detectarRedeDoWeb(programa, RAIZ_DE_SRC);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  function violacoesDe(arquivo: string): readonly string[] {
    return relatorio.violacoes
      .filter((violacao) => violacao.arquivo === arquivo)
      .map((violacao) => `${violacao.regra}|${violacao.simbolo}`)
      .toSorted();
  }

  function achadosDe(arquivo: string): readonly string[] {
    return relatorio.achados
      .filter((achado) => achado.arquivo === arquivo)
      .map((achado) => `${achado.categoria}:${achado.simbolo}`);
  }

  it('programa do web — resolução de módulos — nenhum import fica sem resolver', () => {
    expect(modulosNaoResolvidos(programa)).toEqual([]);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('programa do web com os casos plantados — diagnóstico de tipos — nenhum erro', () => {
    expect(diagnosticosDeTipos(programa)).toEqual([]);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('programa do web — arquivos analisados — cobre o src inteiro e os casos plantados', () => {
    const analisados = programa.arquivos.map((arquivo) => relative(RAIZ_DE_SRC, arquivo.fileName));
    const reais = analisados.filter((arquivo) => !ehPlantado(arquivo));

    expect(reais.length).toBeGreaterThanOrEqual(MINIMO_DE_ARQUIVOS_REAIS_ANALISADOS);
    expect(reais).toContain('dados/clienteHttp.ts');
    expect(analisados).toEqual(expect.arrayContaining(CASOS_PLANTADOS.map((caso) => caso.arquivo)));
  });

  it.each(ACHADOS_CONHECIDOS)('produção — $arquivo — o detector ainda enxerga $achado', ({ arquivo, achado }) => {
    expect(achadosDe(arquivo)).toContain(achado);
  });

  it('produção — rede fora da camada de dados e requisitar sem GET — nenhuma violação', () => {
    const violacoes = relatorio.violacoes
      .filter((violacao) => !ehPlantado(violacao.arquivo))
      .map((violacao) => `${violacao.arquivo}:${violacao.linha} ${violacao.regra} ${violacao.simbolo}`);

    expect(violacoes).toEqual([]);
  });

  it.each(CASOS_PLANTADOS_COM_VIOLACAO)(
    'violação plantada $arquivo — detector — reporta exatamente as violações plantadas',
    ({ arquivo, violacoes }) => {
      expect(violacoesDe(arquivo)).toEqual([...violacoes].toSorted());
    },
  );

  it.each(CASOS_PLANTADOS_PERMITIDOS)('uso permitido $arquivo — detector — não reporta violação', ({ arquivo }) => {
    expect(violacoesDe(arquivo)).toEqual([]);
  });

  it.each(CASOS_PLANTADOS_PERMITIDOS.filter((caso) => caso.achados !== undefined))(
    'uso permitido $arquivo — detector — ainda enxerga o uso',
    ({ arquivo, achados }) => {
      expect(achadosDe(arquivo)).toEqual(expect.arrayContaining([...(achados ?? [])]));
    },
  );
});
