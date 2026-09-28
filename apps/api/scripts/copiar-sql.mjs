#!/usr/bin/env node

import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizDoPacote = dirname(dirname(fileURLToPath(import.meta.url)));
const diretorioDeMigracoesNaFonte = join(raizDoPacote, 'src', 'banco', 'migracoes');
const diretorioDeMigracoesCompilado = join(raizDoPacote, 'dist', 'banco', 'migracoes');

function ehDiretorioOuArquivoSql(caminhoDeOrigem) {
  return statSync(caminhoDeOrigem).isDirectory() || caminhoDeOrigem.endsWith('.sql');
}

function removerSqlOrfaosDoDist(diretorioCompilado, diretorioFonte) {
  if (!existsSync(diretorioCompilado)) {
    return;
  }

  for (const entrada of readdirSync(diretorioCompilado, { withFileTypes: true })) {
    const caminhoCompilado = join(diretorioCompilado, entrada.name);
    const caminhoFonte = join(diretorioFonte, entrada.name);

    if (entrada.isDirectory()) {
      removerSqlOrfaosDoDist(caminhoCompilado, caminhoFonte);
      continue;
    }

    if (entrada.name.endsWith('.sql') && !existsSync(caminhoFonte)) {
      rmSync(caminhoCompilado, { force: true });
    }
  }
}

function copiarSqlDasMigracoesParaODist() {
  if (!existsSync(diretorioDeMigracoesNaFonte)) {
    return;
  }

  removerSqlOrfaosDoDist(diretorioDeMigracoesCompilado, diretorioDeMigracoesNaFonte);

  cpSync(diretorioDeMigracoesNaFonte, diretorioDeMigracoesCompilado, {
    recursive: true,
    filter: ehDiretorioOuArquivoSql,
  });
}

copiarSqlDasMigracoesParaODist();
