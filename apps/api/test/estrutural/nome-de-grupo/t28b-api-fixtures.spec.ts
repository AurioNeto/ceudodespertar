import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { abrirPrograma, diagnosticosDeTipos } from '../escrita/motor-de-programa.js';
import type { ProgramaAnalisavel } from '../escrita/motor-de-programa.js';
import { CASOS_NEGATIVOS, CASOS_POSITIVOS } from './casos-de-fixture.js';
import { detectarNomeDeGrupo } from './detector-de-nome-de-grupo.js';
import type { Ocorrencia } from './detector-de-nome-de-grupo.js';
import { conjuntoProibido, ehExcluidoNaApi, politicaDaApi } from './politica-da-api.js';

const RAIZ_DA_API = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TSCONFIG_DA_API = join(RAIZ_DA_API, 'tsconfig.json');
const PASTA_DOS_CASOS = join(RAIZ_DA_API, 'test', 'estrutural', 'fixtures', 'nome-de-grupo');
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
  return { ...programa, arquivos: programa.arquivos.filter((arquivo) => arquivo.fileName.startsWith(`${pastaDoCaso(caso)}/`)) };
}

function comoTexto(ocorrencias: readonly Ocorrencia[]): readonly string[] {
  return ocorrencias.map((achada) => `${achada.arquivo}:${achada.linha}|${achada.forma}`);
}

describe('T28b · api · fixtures de nome de grupo no código', () => {
  let programa: ProgramaAnalisavel;

  beforeAll(() => {
    const arquivos = arquivosTs(PASTA_DOS_CASOS);
    programa = abrirPrograma(TSCONFIG_DA_API, arquivos, (caminho) => arquivos.includes(caminho));
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  function ocorrenciasDoCaso(caso: string): readonly string[] {
    const relatorio = detectarNomeDeGrupo(programaSoDoCaso(programa, caso), join(pastaDoCaso(caso), 'src'), politicaDaApi());
    return comoTexto(relatorio.ocorrencias);
  }

  it('pasta de fixtures — casos registrados — cobre exatamente os diretórios existentes', () => {
    const existentes = readdirSync(PASTA_DOS_CASOS, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name);
    const registrados = [...CASOS_POSITIVOS, ...CASOS_NEGATIVOS].map((caso) => caso.caso);

    expect(registrados.toSorted()).toEqual(existentes.toSorted());
  });

  it.each([...CASOS_POSITIVOS, ...CASOS_NEGATIVOS].map((caso) => ({ caso: caso.caso })))(
    'fixture $caso — diagnóstico de tipos — nenhum erro',
    ({ caso }) => {
      const diagnosticos = diagnosticosDeTipos(programaSoDoCaso(programa, caso));

      expect(diagnosticos).toEqual([]);
    },
  );

  it.each(CASOS_POSITIVOS.map((caso) => ({ caso: caso.caso, esperado: caso.ocorrencias })))(
    'fixture positiva $caso — detector — reporta exatamente as ocorrências plantadas',
    ({ caso, esperado }) => {
      const ocorrencias = ocorrenciasDoCaso(caso);

      expect(ocorrencias).toEqual(esperado);
    },
  );

  it.each(CASOS_NEGATIVOS.map((caso) => ({ caso: caso.caso })))(
    'fixture negativa $caso — detector — não reporta ocorrência',
    ({ caso }) => {
      const ocorrencias = ocorrenciasDoCaso(caso);

      expect(ocorrencias).toEqual([]);
    },
  );

  it('fixture negativa com a mesma forma — detector com grupo novo no conjunto — passa a reportar sem editar a regra', () => {
    const caso = 'caixa-diferente';
    const politica = { proibidos: conjuntoProibido(['leitura'], []), ehExcluido: () => false };

    const relatorio = detectarNomeDeGrupo(programaSoDoCaso(programa, caso), join(pastaDoCaso(caso), 'src'), politica);

    expect(comoTexto(relatorio.ocorrencias)).toEqual(['modo.ts:2|comparacao']);
  });
});

describe('T28b · api · conjunto proibido e exclusões', () => {
  it('conjunto proibido — códigos e nomes de exibição da fonte — traz os dois formatos dos seis grupos', () => {
    const proibidos = conjuntoProibido();

    expect([...proibidos].toSorted()).toEqual(
      [
        'ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'ACOLHIMENTO', 'REGISTRO', 'LEITURA',
        'Administrador', 'Governança', 'Tesouraria', 'Acolhimento e Organização', 'Registro rápido', 'Leitura',
      ].toSorted(),
    );
  });

  it.each([
    { caminho: 'modules/m/a.spec.ts', excluido: true },
    { caminho: 'modules/m/a.test.ts', excluido: true },
    { caminho: 'modules/identidade/domain/grupo/grupos-de-sistema.ts', excluido: true },
    { caminho: 'modules/identidade/domain/grupo/grupo.ts', excluido: false },
    { caminho: 'modules/m/aspecto.ts', excluido: false },
  ])('exclusão — $caminho — excluido=$excluido', ({ caminho, excluido }) => {
    expect(ehExcluidoNaApi(caminho)).toBe(excluido);
  });
});
