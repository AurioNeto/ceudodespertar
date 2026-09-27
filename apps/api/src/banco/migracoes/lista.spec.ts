import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MIGRACOES_DO_CDD } from './lista.js';

const DIRETORIO_DE_MIGRACOES = dirname(fileURLToPath(import.meta.url));

function pastasDeMigracaoNoDisco(): string[] {
  return readdirSync(DIRETORIO_DE_MIGRACOES)
    .filter((nome) => statSync(join(DIRETORIO_DE_MIGRACOES, nome)).isDirectory())
    .sort();
}

describe('MIGRACOES_DO_CDD', () => {
  it('registra, na mesma ordem alfabética das pastas, exatamente as migrações existentes em disco', () => {
    const pastas = pastasDeMigracaoNoDisco();
    const registradas = MIGRACOES_DO_CDD.map((migracao) => migracao.name);

    expect(registradas).toEqual(pastas);
  });

  it('cada migração registrada tem um migracao.ts na sua própria pasta', () => {
    for (const migracao of MIGRACOES_DO_CDD) {
      const caminho = join(DIRETORIO_DE_MIGRACOES, migracao.name, 'migracao.ts');
      expect(existsSync(caminho)).toBe(true);
    }
  });
});
