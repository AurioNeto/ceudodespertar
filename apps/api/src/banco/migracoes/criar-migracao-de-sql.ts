import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Migration } from '@mikro-orm/migrations';

export interface ArquivosDaMigracaoDeSql {
  readonly up: string;
  readonly down: string;
}

export interface MigracaoDeSql extends Migration {
  up(): Promise<void>;
  down(): Promise<void>;
}

export type ConstrutorDeMigracaoDeSql = new (...args: ConstructorParameters<typeof Migration>) => MigracaoDeSql;

export function criarMigracaoDeSql(
  urlDoModulo: string,
  arquivos: ArquivosDaMigracaoDeSql,
): ConstrutorDeMigracaoDeSql {
  const diretorioDaMigracao = dirname(fileURLToPath(urlDoModulo));

  function lerSqlIrmao(nomeDoArquivo: string): string {
    return readFileSync(join(diretorioDaMigracao, nomeDoArquivo), 'utf8');
  }

  return class extends Migration {
    override async up(): Promise<void> {
      this.addSql(lerSqlIrmao(arquivos.up));
    }

    override async down(): Promise<void> {
      this.addSql(lerSqlIrmao(arquivos.down));
    }
  };
}
