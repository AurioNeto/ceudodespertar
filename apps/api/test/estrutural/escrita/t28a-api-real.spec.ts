import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { detectarEscrita } from './detector-de-escrita.js';
import type { Relatorio } from './detector-de-escrita.js';
import { abrirPrograma, arquivosDoTsconfig, modulosNaoResolvidos } from './motor-de-programa.js';
import type { ProgramaAnalisavel } from './motor-de-programa.js';

const RAIZ_DA_API = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RAIZ_DE_SRC = join(RAIZ_DA_API, 'src');
const TSCONFIG_DA_API = join(RAIZ_DA_API, 'tsconfig.json');
const TEMPO_MAXIMO_DA_ABERTURA_EM_MS = 120_000;
const MINIMO_DE_ARQUIVOS_ANALISADOS = 100;

function ehCodigoDeProducao(caminho: string): boolean {
  return caminho.startsWith(`${RAIZ_DE_SRC}/`) && !caminho.endsWith('.spec.ts');
}

const ACHADOS_CONHECIDOS = [
  {
    arquivo: 'modules/identidade/infrastructure/persistencia/repositorio-de-usuario.mikro-orm.ts',
    achado: 'escrita:insert',
  },
  { arquivo: 'modules/identidade/infrastructure/auditoria/gravador-de-trilha.ts', achado: 'escrita:insertInto' },
  { arquivo: 'shared/infrastructure/eventos/despachante.ts', achado: 'escrita:sql:execute' },
  { arquivo: 'shared/infrastructure/eventos/despachante.ts', achado: 'set-config:set-config' },
  { arquivo: 'shared/infrastructure/eventos/despachante.ts', achado: 'transacao-em-sql:transacao' },
  { arquivo: 'shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.ts', achado: 'set-config:set-config' },
  { arquivo: 'composicao/aplicacao.ts', achado: 'rota-fora-do-nest:use' },
] as const;

describe('T28a · api · escrita só pela camada de persistência em apps/api/src', () => {
  let programa: ProgramaAnalisavel;
  let relatorio: Relatorio;

  beforeAll(() => {
    const raizes = arquivosDoTsconfig(TSCONFIG_DA_API).filter(ehCodigoDeProducao);
    programa = abrirPrograma(TSCONFIG_DA_API, raizes, ehCodigoDeProducao);
    relatorio = detectarEscrita(programa, RAIZ_DE_SRC);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('programa da api — resolução de módulos — nenhum import fica sem resolver', () => {
    const naoResolvidos = modulosNaoResolvidos(programa);

    expect(naoResolvidos).toEqual([]);
  }, TEMPO_MAXIMO_DA_ABERTURA_EM_MS);

  it('programa da api — arquivos analisados — cobre o src inteiro e não só uma amostra', () => {
    const analisados = programa.arquivos.map((arquivo) => relative(RAIZ_DE_SRC, arquivo.fileName));

    expect(analisados.length).toBeGreaterThanOrEqual(MINIMO_DE_ARQUIVOS_ANALISADOS);
    expect(analisados).toContain('modules/identidade/infrastructure/persistencia/repositorio-de-usuario.mikro-orm.ts');
  });

  it.each(ACHADOS_CONHECIDOS)(
    'produção — $arquivo — o detector ainda enxerga $achado',
    ({ arquivo, achado }) => {
      const achados = relatorio.achados
        .filter((candidato) => candidato.arquivo === arquivo)
        .map((candidato) => `${candidato.categoria}:${candidato.simbolo}`);

      expect(achados).toContain(achado);
    },
  );

  it('produção — escrita fora da persistência, SQL indeterminado e rota fora do Nest — nenhuma violação', () => {
    const violacoes = relatorio.violacoes.map(
      (violacao) => `${violacao.arquivo}:${violacao.linha} ${violacao.regra} ${violacao.simbolo}`,
    );

    expect(violacoes).toEqual([]);
  });
});
