import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import {
  ARGUMENTOS_DO_CHROMIUM,
  DENSIDADES,
  FAMILIAS_DE_FONTE,
  FONTES_PADRAO,
  MODULO_DAS_ROTAS,
  SAIDA_PADRAO,
} from './ambiente.mjs';
import { aguardarTelaAssentar, criarContexto, fotografar } from './foto.mjs';
import { familiasSemFonte, importarRotas } from './naPagina.mjs';
import { servidorJaNoAr, subirServidorDeDesenvolvimento } from './servidor.mjs';
import { montarCatalogoDeTelas } from './telas.mjs';

const AJUDA = `Uso: pnpm --filter @cdd/web captura [opções]

  --saida <dir>    onde gravar os PNGs (padrão: apps/web/captura/saida)
  --url <url>      usa um servidor Vite já no ar (precisa de VITE_SESSAO_DE_DEMONSTRACAO=1,
                   VITE_OIDC_EMISSOR e VITE_OIDC_CLIENTE no ambiente dele)
  --so <telas>     só estas telas, separadas por vírgula (ex.: painel,agenda)
  --fontes <dir>   cópia local das fontes do Google (padrão: ~/.cache/cdd-captura/fontes)
`;

const NOME_DE_ARQUIVO_DA_CAPTURA = /^.+--(campo|escritorio)\.png$/;

function lerOpcoes() {
  const { values } = parseArgs({
    options: {
      saida: { type: 'string' },
      url: { type: 'string' },
      so: { type: 'string' },
      fontes: { type: 'string' },
      ajuda: { type: 'boolean', short: 'h' },
    },
  });
  const baseDosCaminhos = process.env.INIT_CWD ?? process.cwd();
  const absoluto = (caminho) => (isAbsolute(caminho) ? caminho : resolve(baseDosCaminhos, caminho));
  return {
    ajuda: values.ajuda === true,
    saida: values.saida ? absoluto(values.saida) : SAIDA_PADRAO,
    fontes: values.fontes ? absoluto(values.fontes) : FONTES_PADRAO,
    url: values.url,
    so: values.so ? values.so.split(',').map((nome) => nome.trim()) : null,
  };
}

async function prepararSaida(saida, filtradas) {
  await mkdir(saida, { recursive: true });
  if (filtradas) return;
  const arquivos = await readdir(saida);
  await Promise.all(
    arquivos.filter((nome) => NOME_DE_ARQUIVO_DA_CAPTURA.test(nome)).map((nome) => rm(join(saida, nome))),
  );
}

async function aquecerEDescobrirTelas({ navegador, url, pastaDeFontes }) {
  const contexto = await criarContexto(navegador, DENSIDADES[DENSIDADES.length - 1], pastaDeFontes);
  try {
    const pagina = await contexto.newPage();
    await pagina.goto(`${url}/`);
    await aguardarTelaAssentar(pagina);

    const naRaiz = new URL(pagina.url()).pathname === '/';
    const temShell = (await pagina.locator('main').count()) > 0;
    if (!naRaiz || !temShell) {
      throw new Error(
        `O painel não abriu em ${url}/ (parou em ${pagina.url()}). A sessão de demonstração está ligada? É preciso VITE_SESSAO_DE_DEMONSTRACAO=1 no servidor.`,
      );
    }

    const semFonte = await pagina.evaluate(familiasSemFonte, FAMILIAS_DE_FONTE);
    if (semFonte.length > 0) {
      throw new Error(`Fontes sem carregar: ${semFonte.join(', ')}. Sem rede e sem cópia local não há captura fiel.`);
    }

    const rotas = await pagina.evaluate(importarRotas, new URL(MODULO_DAS_ROTAS, url).href).catch((erro) => {
      throw new Error(`Não consegui ler as rotas de ${MODULO_DAS_ROTAS}: ${erro.message}`);
    });
    return montarCatalogoDeTelas(rotas);
  } finally {
    await contexto.close();
  }
}

function escolherTelas(catalogo, nomes) {
  if (!nomes) return catalogo;
  const conhecidas = new Set(catalogo.map((tela) => tela.nome));
  const desconhecidas = nomes.filter((nome) => !conhecidas.has(nome));
  if (desconhecidas.length > 0) {
    throw new Error(`Telas desconhecidas: ${desconhecidas.join(', ')}. Existem: ${[...conhecidas].join(', ')}`);
  }
  return catalogo.filter((tela) => nomes.includes(tela.nome));
}

async function capturarTodas({ navegador, url, telas, saida, pastaDeFontes }) {
  let total = 0;
  for (const densidade of DENSIDADES) {
    const contexto = await criarContexto(navegador, densidade, pastaDeFontes);
    try {
      for (const tela of telas) {
        const arquivo = `${tela.nome}--${densidade.nome}.png`;
        const inicio = performance.now();
        let png;
        try {
          png = await fotografar({ contexto, url, tela });
        } catch (erro) {
          throw new Error(`${arquivo}: ${erro.message}`, { cause: erro });
        }
        await writeFile(join(saida, arquivo), png);
        total += 1;
        console.log(`  ${arquivo}  ${Math.round(performance.now() - inicio)} ms`);
      }
    } finally {
      await contexto.close();
    }
  }
  return total;
}

async function principal() {
  const opcoes = lerOpcoes();
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }

  const inicio = performance.now();
  const recursos = [];
  const encerrarTudo = async () => {
    for (const encerrar of recursos.splice(0).reverse()) await encerrar().catch(() => undefined);
  };
  for (const sinal of ['SIGINT', 'SIGTERM']) {
    process.once(sinal, () => void encerrarTudo().finally(() => process.exit(130)));
  }

  try {
    const servidor = opcoes.url ? servidorJaNoAr(opcoes.url) : await subirServidorDeDesenvolvimento();
    recursos.push(servidor.encerrar);
    const navegador = await chromium.launch({ args: ARGUMENTOS_DO_CHROMIUM });
    recursos.push(() => navegador.close());

    const catalogo = await aquecerEDescobrirTelas({ navegador, url: servidor.url, pastaDeFontes: opcoes.fontes });
    const telas = escolherTelas(catalogo, opcoes.so);
    await prepararSaida(opcoes.saida, opcoes.so !== null);

    console.log(`Capturando ${telas.length} telas em ${DENSIDADES.length} densidades (${servidor.url})`);
    const total = await capturarTodas({
      navegador,
      url: servidor.url,
      telas,
      saida: opcoes.saida,
      pastaDeFontes: opcoes.fontes,
    });
    const segundos = ((performance.now() - inicio) / 1000).toFixed(1);
    console.log(`${total} capturas em ${opcoes.saida} (${segundos} s)`);
  } finally {
    await encerrarTudo();
  }
}

principal().catch((erro) => {
  console.error(`Falha na captura: ${erro.message}`);
  process.exitCode = 1;
});
