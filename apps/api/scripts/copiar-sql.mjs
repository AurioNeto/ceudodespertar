#!/usr/bin/env node

import { cpSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizDoPacote = dirname(dirname(fileURLToPath(import.meta.url)));
const diretorioDeMigracoesNaFonte = join(raizDoPacote, 'src', 'banco', 'migracoes');
const diretorioDeMigracoesCompilado = join(raizDoPacote, 'dist', 'banco', 'migracoes');

function ehDiretorioOuArquivoSql(caminhoDeOrigem) {
  return statSync(caminhoDeOrigem).isDirectory() || caminhoDeOrigem.endsWith('.sql');
}

function copiarSqlDasMigracoesParaODist() {
  if (!existsSync(diretorioDeMigracoesNaFonte)) {
    return;
  }

  cpSync(diretorioDeMigracoesNaFonte, diretorioDeMigracoesCompilado, {
    recursive: true,
    filter: ehDiretorioOuArquivoSql,
  });
}

copiarSqlDasMigracoesParaODist();
