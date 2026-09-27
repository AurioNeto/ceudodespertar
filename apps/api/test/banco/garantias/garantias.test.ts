import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';

const DIRETORIO_DESTE_ARQUIVO = dirname(fileURLToPath(import.meta.url));
const DIRETORIO_DOS_CASOS = join(DIRETORIO_DESTE_ARQUIVO, 'casos');
const HELPERS_VERIF = readFileSync(join(DIRETORIO_DESTE_ARQUIVO, 'instalar-helpers.sql'), 'utf8');

const PADRAO_DE_CHAMADA_VERIF = /verif\.(confere|espera_ok|espera_erro)\s*\(/g;

function nomesDosArquivosDeCaso(): string[] {
  return readdirSync(DIRETORIO_DOS_CASOS)
    .filter((nome) => nome.endsWith('.sql'))
    .toSorted();
}

function quantidadeDeChamadasVerifNoArquivo(sqlDoCaso: string): number {
  return sqlDoCaso.match(PADRAO_DE_CHAMADA_VERIF)?.length ?? 0;
}

describe('verificação de garantias do banco (Documento 7 §15, §22, §26)', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await banco.owner.query(HELPERS_VERIF);
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  it.each(nomesDosArquivosDeCaso())('%s', async (nomeDoArquivo) => {
    const sqlDoCaso = readFileSync(join(DIRETORIO_DOS_CASOS, nomeDoArquivo), 'utf8');
    const noticesOk: string[] = [];
    const capturarNoticeOk = (aviso: { message?: string }): void => {
      if (aviso.message !== undefined) {
        noticesOk.push(aviso.message);
      }
    };

    banco.owner.on('notice', capturarNoticeOk);
    try {
      await banco.owner.query(sqlDoCaso);
    } finally {
      banco.owner.off('notice', capturarNoticeOk);
    }

    const chamadasNoArquivo = quantidadeDeChamadasVerifNoArquivo(sqlDoCaso);
    const todasAsNoticesComecamComOk = noticesOk.every((mensagem) => mensagem.startsWith('OK'));

    expect(chamadasNoArquivo).toBeGreaterThan(0);
    expect(noticesOk).toHaveLength(chamadasNoArquivo);
    expect(todasAsNoticesComecamComOk).toBe(true);
  });
});
