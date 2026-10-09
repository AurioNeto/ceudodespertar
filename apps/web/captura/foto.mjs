import {
  AGORA_FIXO,
  ALTURA_MAXIMA_DA_PAGINA,
  ATRIBUTO_DA_ROLAGEM_HORIZONTAL,
  FUSO,
  IDIOMA,
  LIMITE_DE_ESPERA_MS,
  ORIGEM_DAS_FONTES,
  SOSSEGO_DO_DOM_MS,
} from './ambiente.mjs';
import { servirFontesDoCache } from './fontes.mjs';
import {
  esperarDoisQuadros,
  esperarTelaAssentar,
  marcarRolagensHorizontais,
  medirExcessoDeRolagem,
  refazerOLayoutDoZero,
  posicoesDaRolagemHorizontal,
  rolarHorizontalPara,
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

async function prepararParaFoto(pagina) {
  await pagina.evaluate(tirarFocoDoElementoAtivo);
  await pagina.mouse.move(0, 0);
  await ajustarAlturaAoConteudo(pagina);
  await pagina.evaluate(refazerOLayoutDoZero);
  await pagina.evaluate(esperarDoisQuadros);
  await aguardarTelaAssentar(pagina);
  return pagina.evaluate(medirExcessoDeRolagem);
}

async function fotografarRolagensHorizontais(pagina) {
  const total = await pagina.evaluate(marcarRolagensHorizontais, ATRIBUTO_DA_ROLAGEM_HORIZONTAL);
  const fotos = [];
  for (let area = 1; area <= total; area += 1) {
    const elemento = pagina.locator(`[${ATRIBUTO_DA_ROLAGEM_HORIZONTAL}="${area}"]`);
    const posicoes = await elemento.evaluate(posicoesDaRolagemHorizontal);
    for (const [indice, posicao] of posicoes.entries()) {
      await elemento.evaluate(rolarHorizontalPara, posicao);
      await pagina.evaluate(esperarDoisQuadros);
      const png = await elemento.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
      fotos.push({ area, passo: indice + 1, png });
    }
  }
  return fotos;
}

function observarFalhas(pagina) {
  const falhas = [];
  pagina.on('pageerror', (erro) => falhas.push(`erro não tratado: ${erro.message}`));
  pagina.on('response', (resposta) => {
    if (resposta.status() >= PRIMEIRO_STATUS_DE_FALHA_DO_SERVIDOR) {
      falhas.push(`${resposta.status()} em ${resposta.url()}`);
    }
  });
  return falhas;
}

export async function fotografar({ contexto, falhas, url, tela }) {
  const pagina = await contexto.newPage();
  const falhasDaPagina = observarFalhas(pagina);
  try {
    return await conferindoFalhasDaRota(falhas, async () => {
      const sessao = await aplicarSessao(pagina, tela.sessao);
      await pagina.goto(`${url}${tela.caminho}`);
      await pagina.addStyleTag({ content: ESTILO_SEM_MOVIMENTO });
      sessao.conferir();
      await aguardarTelaAssentar(pagina);
      if (tela.preparar) {
        await tela.preparar(pagina);
        await aguardarTelaAssentar(pagina);
      }
      const sobraDeRolagemEmPx = await prepararParaFoto(pagina);
      if (falhasDaPagina.length > 0) throw new Error(falhasDaPagina.join('; '));
      const png = await pagina.screenshot({ type: 'png', fullPage: true, animations: 'disabled', caret: 'hide' });
      const rolagens = await fotografarRolagensHorizontais(pagina);
      return { png, rolagens, sobraDeRolagemEmPx };
    });
  } finally {
    await pagina.close();
  }
}
