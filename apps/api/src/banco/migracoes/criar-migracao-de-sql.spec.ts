import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarMigracaoDeSql } from './criar-migracao-de-sql.js';

describe('criarMigracaoDeSql', () => {
  let diretorioTemporario: string;

  beforeEach(() => {
    diretorioTemporario = mkdtempSync(join(tmpdir(), 'cdd-migracao-de-sql-'));
  });

  afterEach(() => {
    rmSync(diretorioTemporario, { recursive: true, force: true });
  });

  function criarClasseDeTeste(): ReturnType<typeof criarMigracaoDeSql> {
    writeFileSync(join(diretorioTemporario, 'subir.sql'), 'CREATE SCHEMA teste;');
    writeFileSync(join(diretorioTemporario, 'descer.sql'), 'DROP SCHEMA teste;');
    const urlDoModuloFalso = pathToFileURL(join(diretorioTemporario, 'migracao.ts')).href;
    return criarMigracaoDeSql(urlDoModuloFalso, { up: 'subir.sql', down: 'descer.sql' });
  }

  it('up() enfileira o conteúdo inteiro do arquivo .sql de subida num único addSql()', async () => {
    const Classe = criarClasseDeTeste();
    const migracao = new Classe(undefined as never, undefined as never);

    await migracao.up();

    expect(migracao.getQueries()).toEqual(['CREATE SCHEMA teste;']);
  });

  it('down() enfileira o conteúdo inteiro do arquivo .sql de descida', async () => {
    const Classe = criarClasseDeTeste();
    const migracao = new Classe(undefined as never, undefined as never);

    await migracao.down();

    expect(migracao.getQueries()).toEqual(['DROP SCHEMA teste;']);
  });

  it('lê o SQL sempre a partir do diretório da própria migração, nunca do cwd do processo', async () => {
    const outroDiretorio = mkdtempSync(join(tmpdir(), 'cdd-migracao-de-sql-outro-'));
    try {
      writeFileSync(join(outroDiretorio, 'subir.sql'), 'CREATE SCHEMA outro;');
      writeFileSync(join(outroDiretorio, 'descer.sql'), 'DROP SCHEMA outro;');
      const Classe = criarMigracaoDeSql(pathToFileURL(join(outroDiretorio, 'migracao.ts')).href, {
        up: 'subir.sql',
        down: 'descer.sql',
      });
      const migracao = new Classe(undefined as never, undefined as never);

      await migracao.up();

      expect(migracao.getQueries()).toEqual(['CREATE SCHEMA outro;']);
    } finally {
      rmSync(outroDiretorio, { recursive: true, force: true });
    }
  });
});
