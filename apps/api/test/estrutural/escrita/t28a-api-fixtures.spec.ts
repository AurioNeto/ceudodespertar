import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CASOS_NEGATIVOS, CASOS_POSITIVOS } from './casos-de-fixture.js';
import type { CasoDeFixture } from './casos-de-fixture.js';
import { detectarEscrita } from './detector-de-escrita.js';
import { abrirPrograma, modulosNaoResolvidos } from './motor-de-programa.js';
import type { ProgramaAnalisavel } from './motor-de-programa.js';

const RAIZ_DA_API = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TSCONFIG_DA_API = join(RAIZ_DA_API, 'tsconfig.json');
const PASTA_DOS_CASOS = join(RAIZ_DA_API, 'test', 'estrutural', 'fixtures', 'escrita-so-na-persistencia');
const PASTA_DO_SENTINELA = join(
  RAIZ_DA_API,
  'test',
  'estrutural',
  'fixtures',
  'escrita-so-na-persistencia-sentinela',
);
const TEMPO_MAXIMO_DA_ABERTURA_EM_MS = 120_000;

function arquivosTs(pasta: string): readonly string[] {
  return readdirSync(pasta, { recursive: true, encoding: 'utf8' })
    .filter((caminho) => caminho.endsWith('.ts'))
    .map((caminho) => join(pasta, caminho));
}

function pastaDoCaso(caso: string): string {
  return join(PASTA_DOS_CASOS, caso);
}

function programaSoDoCaso(programa: ProgramaAnalisavel, caso: string): ProgramaAnalisavel {
  const pasta = pastaDoCaso(caso);
  return { ...programa, arquivos: programa.arquivos.filter((arquivo) => arquivo.fileName.startsWith(`${pasta}/`)) };
}

function relatorioDoCaso(programa: ProgramaAnalisavel, caso: string) {
  return detectarEscrita(programaSoDoCaso(programa, caso), join(pastaDoCaso(caso), 'src'));
}

function violacoesComoTexto(programa: ProgramaAnalisavel, caso: string): readonly string[] {
  return relatorioDoCaso(programa, caso)
    .violacoes.map((violacao) => `${violacao.arquivo}|${violacao.regra}|${violacao.simbolo}`)
    .toSorted();
}

function achadosComoTexto(programa: ProgramaAnalisavel, caso: string): readonly string[] {
  return relatorioDoCaso(programa, caso).achados.map((achado) => `${achado.categoria}:${achado.simbolo}`);
}

describe('T28a · api · fixtures de escrita só pela persistência', () => {
  let programa: ProgramaAnalisavel;

  beforeAll(() => {
    const arquivos = arquivosTs(PASTA_DOS_CASOS);
    programa = abrirPrograma(TSCONFIG_DA_API, arquivos, (caminho) => arquivos.includes(caminho));
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it.each([...CASOS_POSITIVOS, ...CASOS_NEGATIVOS].map((caso) => ({ caso: caso.caso })))(
    'fixture $caso — resolução de módulos — nenhum import fica sem resolver',
    ({ caso }) => {
      const naoResolvidos = modulosNaoResolvidos(programaSoDoCaso(programa, caso));

      expect(naoResolvidos).toEqual([]);
    },
  );

  it.each(CASOS_POSITIVOS.map((caso) => ({ caso: caso.caso, esperado: caso })))(
    'fixture positiva $caso — detector — reporta exatamente as violações plantadas',
    ({ esperado }: { esperado: CasoDeFixture }) => {
      const violacoes = violacoesComoTexto(programa, esperado.caso);

      expect(violacoes).toEqual([...esperado.violacoes].toSorted());
    },
  );

  it.each(CASOS_NEGATIVOS.map((caso) => ({ caso: caso.caso, esperado: caso })))(
    'fixture negativa $caso — detector — não reporta violação',
    ({ esperado }: { esperado: CasoDeFixture }) => {
      const violacoes = violacoesComoTexto(programa, esperado.caso);

      expect(violacoes).toEqual([]);
    },
  );

  it.each(CASOS_NEGATIVOS.filter((caso) => caso.achados !== undefined).map((caso) => ({ caso: caso.caso, esperado: caso })))(
    'fixture negativa $caso — detector — ainda enxerga o uso permitido',
    ({ esperado }: { esperado: CasoDeFixture }) => {
      const achados = achadosComoTexto(programa, esperado.caso);

      expect(achados).toEqual(expect.arrayContaining([...(esperado.achados ?? [])]));
    },
  );
});

describe('T28a · api · sentinela da resolução de módulos', () => {
  it('fixture com import inexistente — modulosNaoResolvidos — aponta os dois imports quebrados', () => {
    const arquivos = arquivosTs(PASTA_DO_SENTINELA);
    const programa = abrirPrograma(TSCONFIG_DA_API, arquivos, (caminho) => arquivos.includes(caminho));

    const naoResolvidos = modulosNaoResolvidos(programa);

    expect(naoResolvidos).toHaveLength(2);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);
});
