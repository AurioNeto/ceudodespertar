import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CODIGOS_DE_ERRO } from '@cdd/contracts';
import { STATUS_POR_CODIGO } from '../../src/shared/infrastructure/http/status-por-codigo.js';
import { RESTRICAO_PARA_CODIGO } from '../../src/shared/infrastructure/http/restricao-para-codigo.js';
import { CODIGOS_DE_GUARDA_MINIMA } from '../../src/shared/infrastructure/http/guardas-minimas-do-banco.js';

const DIRETORIO_DO_TESTE = dirname(fileURLToPath(import.meta.url));
const DIRETORIO_DAS_MIGRACOES = join(DIRETORIO_DO_TESTE, '..', '..', 'src', 'banco', 'migracoes');

const RESTRICOES_QUE_O_DOMINIO_MAPEIA_NO_B0: readonly string[] = ['usuario_email_unico', 'usuario_pessoa_unica'];

function arquivosSqlRecursivos(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name);
    return entrada.isDirectory()
      ? arquivosSqlRecursivos(caminho)
      : entrada.name.endsWith('.sql')
        ? [caminho]
        : [];
  });
}

function conteudoDasMigracoes(): string {
  return arquivosSqlRecursivos(DIRETORIO_DAS_MIGRACOES)
    .map((caminho) => readFileSync(caminho, 'utf8'))
    .join('\n');
}

function restricoesNomeadas(sql: string): Set<string> {
  const nomes = new Set<string>();
  for (const casamento of sql.matchAll(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(\w+)/gi)) {
    nomes.add(casamento[1] as string);
  }
  for (const casamento of sql.matchAll(/\bCONSTRAINT\s+(\w+)/gi)) {
    nomes.add(casamento[1] as string);
  }
  return nomes;
}

function prefixosDeGuardaMinima(sql: string): Set<string> {
  const prefixos = new Set<string>();
  for (const casamento of sql.matchAll(/RAISE EXCEPTION '([A-Z_]+):/g)) {
    prefixos.add(casamento[1] as string);
  }
  return prefixos;
}

describe('catálogo de erros — contrato (Documento 7 §12)', () => {
  const sqlDasMigracoes = conteudoDasMigracoes();
  const restricoesDasMigracoes = restricoesNomeadas(sqlDasMigracoes);

  it('todo código do catálogo tem um status HTTP inteiro no mapa', () => {
    for (const codigo of CODIGOS_DE_ERRO) {
      expect(Number.isInteger(STATUS_POR_CODIGO[codigo])).toBe(true);
    }
  });

  it('o mapa de status não tem código a mais nem a menos que o catálogo', () => {
    expect(Object.keys(STATUS_POR_CODIGO).toSorted()).toStrictEqual([...CODIGOS_DE_ERRO].toSorted());
  });

  it('toda restrição nomeada que o domínio mapeia neste B0 tem entrada em RESTRICAO_PARA_CODIGO', () => {
    for (const restricao of RESTRICOES_QUE_O_DOMINIO_MAPEIA_NO_B0) {
      expect(restricoesDasMigracoes.has(restricao)).toBe(true);
      expect(RESTRICAO_PARA_CODIGO[restricao]).toBeDefined();
    }
  });

  it('as restrições do mapa existem, com esse nome exato, nas migrations', () => {
    for (const restricao of Object.keys(RESTRICAO_PARA_CODIGO)) {
      expect(restricoesDasMigracoes.has(restricao)).toBe(true);
    }
  });

  it('cada código do mapa de restrições existe no catálogo de códigos de erro', () => {
    for (const codigo of Object.values(RESTRICAO_PARA_CODIGO)) {
      expect(CODIGOS_DE_ERRO).toContain(codigo);
    }
  });

  it('todo prefixo de guarda mínima usado nas migrations está na lista de guardas mínimas', () => {
    const prefixosUsados = prefixosDeGuardaMinima(sqlDasMigracoes);

    expect(prefixosUsados.size).toBeGreaterThan(0);
    for (const prefixo of prefixosUsados) {
      expect(CODIGOS_DE_GUARDA_MINIMA).toContain(prefixo);
    }
  });
});
