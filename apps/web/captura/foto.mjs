import {
  AGORA_FIXO,
  ALTURA_MAXIMA_DA_PAGINA,
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
  medirExcessoDeRolagem,
  refazerOLayoutDoZero,
  semearAleatorio,
  tirarFocoDoElementoAtivo,
} from './naPagina.mjs';
import { aplicarSessao } from './sessaoDaCaptura.mjs';

const TENTATIVAS_DE_AJUSTE_DA_ALTURA = 4;
const PRIMEIRO_STATUS_DE_FALHA_DO_SERVIDOR = 500;
const ESTILO_SEM_MOVIMENTO =
  '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }';

export async function criarContexto(navegador, densidade, pastaDeFontes) {
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
  await contexto.route(ORIGEM_DAS_FONTES, servirFontesDoCache(pastaDeFontes));
  return contexto;
}

export async function aguardarTelaAssentar(pagina) {
  await pagina.waitForLoadState('networkidle');
  await pagina.evaluate(esperarTelaAssentar, { sossego: SOSSEGO_DO_DOM_MS, limite: LIMITE_DE_ESPERA_MS });
}

async function ajustarAlturaAoConteudo(pagina) {
  let excessoAnterior = Infinity;
  for (let tentativa = 0; tentativa < TENTATIVAS_DE_AJUSTE_DA_ALTURA; tentativa += 1) {
    const excesso = await pagina.evaluate(medirExcessoDeRolagem);
    if (excesso <= 0 || excesso >= excessoAnterior) return;
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

export async function fotografar({ contexto, url, tela }) {
  const pagina = await contexto.newPage();
  const falhas = observarFalhas(pagina);
  try {
    const sessao = await aplicarSessao(pagina, tela.sessao);
    await pagina.goto(`${url}${tela.caminho}`);
    await pagina.addStyleTag({ content: ESTILO_SEM_MOVIMENTO });
    sessao.conferir();
    await aguardarTelaAssentar(pagina);
    if (tela.preparar) {
      await tela.preparar(pagina);
      await aguardarTelaAssentar(pagina);
    }
    await prepararParaFoto(pagina);
    if (falhas.length > 0) throw new Error(falhas.join('; '));
    return await pagina.screenshot({ type: 'png', fullPage: true, animations: 'disabled', caret: 'hide' });
  } finally {
    await pagina.close();
  }
}
