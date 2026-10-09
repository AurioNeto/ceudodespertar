import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const AJUDA = `Uso: pnpm --filter @cdd/web captura:comparar <dirA> <dirB>

Compara byte a byte os PNGs de duas execuções de captura. Lista as telas e
densidades diferentes ou ausentes e sai com código 1 se houver alguma.
`;

const EXTENSAO_DA_CAPTURA = '.png';
const POSICAO_DA_LARGURA_NO_PNG = 16;
const POSICAO_DA_ALTURA_NO_PNG = 20;
const FIM_DO_CABECALHO_DO_PNG = 24;

const absoluto = (caminho) =>
  isAbsolute(caminho) ? caminho : resolve(process.env.INIT_CWD ?? process.cwd(), caminho);

async function listarCapturas(diretorio) {
  let arquivos;
  try {
    arquivos = await readdir(diretorio);
  } catch (erro) {
    if (erro.code === 'ENOENT') throw new Error(`Diretório não existe: ${diretorio}`);
    throw erro;
  }
  const capturas = arquivos.filter((nome) => nome.endsWith(EXTENSAO_DA_CAPTURA)).toSorted();
  if (capturas.length === 0) throw new Error(`Nenhuma captura em ${diretorio}`);
  return capturas;
}

function dimensoes(png) {
  const cabecalho = png.subarray(0, FIM_DO_CABECALHO_DO_PNG);
  return {
    largura: cabecalho.readUInt32BE(POSICAO_DA_LARGURA_NO_PNG),
    altura: cabecalho.readUInt32BE(POSICAO_DA_ALTURA_NO_PNG),
  };
}

function descreverDiferenca(pngA, pngB) {
  const a = dimensoes(pngA);
  const b = dimensoes(pngB);
  if (a.largura === b.largura && a.altura === b.altura) {
    return `pixels diferentes (${a.largura}x${a.altura})`;
  }
  return `tamanho mudou: ${a.largura}x${a.altura} -> ${b.largura}x${b.altura}`;
}

async function compararArquivo(nome, dirA, dirB, nomesA, nomesB) {
  if (!nomesB.has(nome)) return { nome, situacao: 'AUSENTE EM B', detalhe: '' };
  if (!nomesA.has(nome)) return { nome, situacao: 'AUSENTE EM A', detalhe: '' };
  const [pngA, pngB] = await Promise.all([readFile(join(dirA, nome)), readFile(join(dirB, nome))]);
  if (pngA.equals(pngB)) return { nome, situacao: 'IGUAL', detalhe: '' };
  return { nome, situacao: 'DIFERENTE', detalhe: descreverDiferenca(pngA, pngB) };
}

async function principal() {
  const { values, positionals } = parseArgs({
    options: { ajuda: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
  });
  if (values.ajuda) {
    console.log(AJUDA);
    return;
  }
  if (positionals.length !== 2) {
    console.error(AJUDA);
    process.exitCode = 2;
    return;
  }

  const [dirA, dirB] = positionals.map(absoluto);
  const [capturasA, capturasB] = await Promise.all([listarCapturas(dirA), listarCapturas(dirB)]);
  const nomesA = new Set(capturasA);
  const nomesB = new Set(capturasB);
  const todos = [...new Set([...capturasA, ...capturasB])].toSorted();

  const resultados = await Promise.all(todos.map((nome) => compararArquivo(nome, dirA, dirB, nomesA, nomesB)));
  const diferencas = resultados.filter((resultado) => resultado.situacao !== 'IGUAL');

  for (const { nome, situacao, detalhe } of diferencas) {
    console.log(`${situacao.padEnd(12)} ${nome}${detalhe ? `  ${detalhe}` : ''}`);
  }
  const iguais = resultados.length - diferencas.length;
  console.log(`${resultados.length} capturas: ${iguais} iguais, ${diferencas.length} com diferença ou ausentes`);
  process.exitCode = diferencas.length > 0 ? 1 : 0;
}

principal().catch((erro) => {
  console.error(`Falha ao comparar: ${erro.message}`);
  process.exitCode = 2;
});
