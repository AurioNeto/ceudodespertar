import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import ts from 'typescript';
import { abrirPrograma, arquivosDoTsconfig, declaradoEm, linhaDe, percorrer, simboloDoUso } from './motor-de-programa.js';
import type { ProgramaAnalisavel } from './motor-de-programa.js';
import { ARQUIVOS_QUE_VINCULAM_INSTITUICAO, PASTA_DO_BANCO } from './politica-da-api.js';

const RAIZ_DA_API = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RAIZ_DE_SRC = join(RAIZ_DA_API, 'src');
const TSCONFIG_DA_API = join(RAIZ_DA_API, 'tsconfig.json');
const TEMPO_MAXIMO_DA_ABERTURA_EM_MS = 120_000;
const MEMBRO_DO_VINCULO = 'vincularInstituicao';
const PORTA_DA_UNIDADE_DE_TRABALHO = /\/shared\/infrastructure\/banco\/unidade-de-trabalho\.ts$/;

const VINCULO_PLANTADO = join(RAIZ_DE_SRC, 'modules/plantado/infrastructure/consumidor-que-troca-a-instituicao.ts');
const VINCULO_PLANTADO_POR_DESESTRUTURACAO = join(RAIZ_DE_SRC, 'shared/infrastructure/eventos/plantado-desestruturado.ts');
const ARQUIVOS_PLANTADOS: ReadonlyMap<string, string> = new Map([
  [
    VINCULO_PLANTADO,
    [
      "import type { ContextoDaTransacao } from '../../../shared/infrastructure/banco/unidade-de-trabalho.js';",
      "export const trocar = (contexto: ContextoDaTransacao) => contexto.vincularInstituicao('outra');",
    ].join('\n'),
  ],
  [
    VINCULO_PLANTADO_POR_DESESTRUTURACAO,
    [
      "import type { ContextoDaTransacao } from '../banco/unidade-de-trabalho.js';",
      "export const trocar = ({ vincularInstituicao }: ContextoDaTransacao) => vincularInstituicao('outra');",
    ].join('\n'),
  ],
]);

function ehCodigoDeProducao(caminho: string): boolean {
  return caminho.startsWith(`${RAIZ_DE_SRC}/`) && !caminho.endsWith('.spec.ts');
}

function usosDoVinculo(programa: ProgramaAnalisavel): readonly string[] {
  return programa.arquivos.flatMap((arquivo) => {
    const relativo = relative(RAIZ_DE_SRC, arquivo.fileName).split('\\').join('/');
    const usos: string[] = [];
    percorrer(arquivo, (no) => {
      if (!ts.isIdentifier(no) || no.text !== MEMBRO_DO_VINCULO) return;
      const simbolo = simboloDoUso(programa.checker, no);
      if (simbolo !== undefined && declaradoEm(simbolo, PORTA_DA_UNIDADE_DE_TRABALHO)) {
        usos.push(`${relativo}:${linhaDe(arquivo, no)}`);
      }
    });
    return usos;
  });
}

function ehPermitido(uso: string): boolean {
  const arquivo = uso.slice(0, uso.lastIndexOf(':'));
  return arquivo.startsWith(PASTA_DO_BANCO) || Object.hasOwn(ARQUIVOS_QUE_VINCULAM_INSTITUICAO, arquivo);
}

describe('T28a · api · trocar a instituição da transação só no banco e no despachante', () => {
  let usos: readonly string[];

  beforeAll(() => {
    const raizes = arquivosDoTsconfig(TSCONFIG_DA_API).filter(ehCodigoDeProducao);
    usos = usosDoVinculo(abrirPrograma(TSCONFIG_DA_API, raizes, ehCodigoDeProducao, ARQUIVOS_PLANTADOS));
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('produção — vincularInstituicao — só na infraestrutura de banco e nos arquivos com motivo', () => {
    const plantados = [...ARQUIVOS_PLANTADOS.keys()].map((caminho) => relative(RAIZ_DE_SRC, caminho));
    const reais = usos.filter((uso) => !plantados.some((plantado) => uso.startsWith(`${plantado}:`)));

    expect(reais.filter((uso) => !ehPermitido(uso))).toEqual([]);
    expect(reais.some((uso) => uso.startsWith('shared/infrastructure/eventos/despachante.ts:'))).toBe(true);
  });

  it('violação plantada — chamada e desestruturação fora do banco — são vistas e recusadas', () => {
    const recusados = usos.filter((uso) => !ehPermitido(uso));

    expect(recusados).toEqual(
      expect.arrayContaining([
        'modules/plantado/infrastructure/consumidor-que-troca-a-instituicao.ts:2',
        'shared/infrastructure/eventos/plantado-desestruturado.ts:2',
      ]),
    );
  });
});
