import {
  AGORA_FIXO,
  ALTURA_MAXIMA_DA_PAGINA,
  ATRIBUTO_DA_ROLAGEM_DO_PAINEL,
  ATRIBUTO_DA_ROLAGEM_HORIZONTAL,
  FUSO,
  IDIOMA,
  LIMITE_DE_ESPERA_MS,
  ORIGEM_DAS_FONTES,
  SOSSEGO_DO_DOM_MS,
} from './ambiente.mjs';
import { chaveDaRequisicao } from './apiDaCaptura.mjs';
import { servirFontesDoCache } from './fontes.mjs';
import {
  esperarDoisQuadros,
  esperarTelaAssentar,
  levarRolagensDoPainelAoTopo,
  marcarRolagensHorizontais,
  marcarRolagensVerticaisDoPainel,
  medirExcessoDeRolagem,
  posicoesDaRolagem,
  refazerOLayoutDoZero,
  rolarPara,
  semearAleatorio,
  tirarFocoDoElementoAtivo,
} from './naPagina.mjs';
import { aplicarSessao } from './sessaoDaCaptura.mjs';

const TENTATIVAS_DE_AJUSTE_DA_ALTURA = 4;
const PRIMEIRO_STATUS_DE_FALHA_DO_SERVIDOR = 500;
const ESTILO_SEM_MOVIMENTO =
  '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }';

export async function criarContexto(navegador, densidade, { pastaDeFontes, api, falhas }) {
  const contexto = await navegador.newContext({
    viewport: densidade.viewport,
    deviceScaleFactor: 1,
    locale: IDIOMA,
    timezoneId: FUSO,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  await contexto.clock.setFixedTime(AGORA_FIXO);
  await contexto.addInitScript(semearAleatorio);
  await contexto.route(ORIGEM_DAS_FONTES, servirFontesDoCache(pastaDeFontes, falhas));
  await contexto.route(api.ehDaApi, api.responder);
  return contexto;
}

export async function conferindoFalhasDaRota(falhas, acao) {
  let resultado;
  try {
    resultado = await acao();
  } catch (erro) {
    falhas.conferir();
    throw erro;
  }
  falhas.conferir();
  return resultado;
}

export async function aguardarTelaAssentar(pagina) {
  await pagina.waitForLoadState('networkidle');
  await pagina.evaluate(esperarTelaAssentar, { sossego: SOSSEGO_DO_DOM_MS, limite: LIMITE_DE_ESPERA_MS });
}

async function ajustarAlturaAoConteudo(pagina) {
  let excessoAnterior = Infinity;
  for (let tentativa = 0; tentativa < TENTATIVAS_DE_AJUSTE_DA_ALTURA; tentativa += 1) {
    const excesso = await pagina.evaluate(medirExcessoDeRolagem);
    if (excesso <= 0 || excesso >= excessoAnterior) break;
    const { width, height } = pagina.viewportSize();
    const nova = height + excesso;
    if (nova > ALTURA_MAXIMA_DA_PAGINA) {
      throw new Error(`a página pede ${nova}px de altura, acima do limite de ${ALTURA_MAXIMA_DA_PAGINA}px`);
    }
    await pagina.setViewportSize({ width, height: nova });
    await pagina.evaluate(esperarDoisQuadros);
    excessoAnterior = excesso;
  }
}

async function prepararParaFoto(pagina, tela) {
  await pagina.evaluate(tirarFocoDoElementoAtivo);
  await pagina.mouse.move(0, 0);
  if (!tela.alturaFixa) await ajustarAlturaAoConteudo(pagina);
  await pagina.evaluate(refazerOLayoutDoZero);
  if (tela.alturaFixa) await pagina.evaluate(levarRolagensDoPainelAoTopo);
  await pagina.evaluate(esperarDoisQuadros);
  await aguardarTelaAssentar(pagina);
  return tela.alturaFixa ? 0 : pagina.evaluate(medirExcessoDeRolagem);
}

async function fotografarPassosDe(pagina, { atributo, eixo, area }) {
  const elemento = pagina.locator(`[${atributo}="${area}"]`);
  const posicoes = await elemento.evaluate(posicoesDaRolagem, eixo);
  const fotos = [];
  for (const posicao of posicoes) {
    await elemento.evaluate(rolarPara, { eixo, posicao });
    await pagina.evaluate(esperarDoisQuadros);
    fotos.push(await elemento.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' }));
  }
  return fotos;
}

async function fotografarRolagensHorizontais(pagina) {
  const total = await pagina.evaluate(marcarRolagensHorizontais, ATRIBUTO_DA_ROLAGEM_HORIZONTAL);
  const fotos = [];
  for (let area = 1; area <= total; area += 1) {
    const passos = await fotografarPassosDe(pagina, { atributo: ATRIBUTO_DA_ROLAGEM_HORIZONTAL, eixo: 'horizontal', area });
    passos.forEach((png, indice) => fotos.push({ area, passo: indice + 1, png }));
  }
  return fotos;
}

async function fotografarRolagensDoPainel(pagina, tela) {
  if (!tela.alturaFixa) return [];
  const total = await pagina.evaluate(marcarRolagensVerticaisDoPainel, ATRIBUTO_DA_ROLAGEM_DO_PAINEL);
  const fotos = [];
  for (let area = 1; area <= total; area += 1) {
    fotos.push(...(await fotografarPassosDe(pagina, { atributo: ATRIBUTO_DA_ROLAGEM_DO_PAINEL, eixo: 'vertical', area })));
  }
  return fotos;
}

function falhasSimuladasPelaTela(tela) {
  const respostas = Object.entries(tela.fixtures ?? {});
  return new Set(respostas.filter(([, { status }]) => status >= PRIMEIRO_STATUS_DE_FALHA_DO_SERVIDOR).map(([chave]) => chave));
}

function observarFalhas(pagina, simuladas) {
  const falhas = [];
  pagina.on('pageerror', (erro) => falhas.push(`erro não tratado: ${erro.message}`));
  pagina.on('response', (resposta) => {
    const chave = chaveDaRequisicao(resposta.request().method(), new URL(resposta.url()).pathname);
    if (resposta.status() >= PRIMEIRO_STATUS_DE_FALHA_DO_SERVIDOR && !simuladas.has(chave)) {
      falhas.push(`${resposta.status()} em ${resposta.url()}`);
    }
  });
  return falhas;
}

export async function fotografar({ contexto, api, falhas, url, tela }) {
  const pagina = await contexto.newPage();
  const falhasDaPagina = observarFalhas(pagina, falhasSimuladasPelaTela(tela));
  try {
    return await conferindoFalhasDaRota(falhas, async () => {
      const sessao = await aplicarSessao(pagina, tela.sessao);
      if (tela.fixtures) await pagina.route(api.ehDaApi, api.responderComAsFixturesDe(tela.fixtures));
      await pagina.goto(`${url}${tela.caminho}`);
      await pagina.addStyleTag({ content: ESTILO_SEM_MOVIMENTO });
      sessao.conferir();
      await aguardarTelaAssentar(pagina);
      if (tela.preparar) {
        await tela.preparar(pagina);
        await aguardarTelaAssentar(pagina);
      }
      const sobraDeRolagemEmPx = await prepararParaFoto(pagina, tela);
      if (falhasDaPagina.length > 0) throw new Error(falhasDaPagina.join('; '));
      const png = await pagina.screenshot({ type: 'png', fullPage: true, animations: 'disabled', caret: 'hide' });
      const rolagens = await fotografarRolagensHorizontais(pagina);
      const passosDoPainel = await fotografarRolagensDoPainel(pagina, tela);
      return { png, rolagens, passosDoPainel, sobraDeRolagemEmPx };
    });
  } finally {
    await pagina.close();
  }
}
