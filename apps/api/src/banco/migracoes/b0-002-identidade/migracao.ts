import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Migration } from '@mikro-orm/migrations';

const DIRETORIO_DESTA_MIGRACAO = dirname(fileURLToPath(import.meta.url));

function lerSqlIrmao(nomeDoArquivo: string): string {
  return readFileSync(join(DIRETORIO_DESTA_MIGRACAO, nomeDoArquivo), 'utf8');
}

export class MigracaoB0002Identidade extends Migration {
  override async up(): Promise<void> {
    this.addSql(lerSqlIrmao('identidade.sql'));
  }

  override async down(): Promise<void> {
    this.addSql(lerSqlIrmao('desfazer.sql'));
  }
}
