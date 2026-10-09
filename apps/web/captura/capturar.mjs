import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:os';
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
import { criarApiDaCaptura } from './apiDaCaptura.mjs';
import { aguardarTelaAssentar, conferindoFalhasDaRota, criarContexto, fotografar } from './foto.mjs';
import { familiasSemFonte, importarRotas } from './naPagina.mjs';
import { criarRegistroDeFalhas } from './registroDeFalhas.mjs';
import { servidorJaNoAr, subirServidorDeDesenvolvimento } from './servidor.mjs';
import { montarCatalogoDeTelas } from './telas.mjs';

const AJUDA = `Uso: pnpm --filter @cdd/web captura [opções]

  --saida <dir>    onde gravar os PNGs (padrão: apps/web/captura/saida)
  --url <url>      usa um servidor Vite já no ar (precisa de VITE_SESSAO_DE_DEMONSTRACAO=1,
                   VITE_OIDC_EMISSOR e VITE_OIDC_CLIENTE no ambiente dele)
  --so <telas>     só estas telas, separadas por vírgula (ex.: painel,agenda)
  --fontes <dir>   cópia local das fontes do Google (padrão: ~/.cache/cdd-captura/fontes)

Não precisa de API nem de .env. Toda requisição /api das telas é respondida por
fixtures fixas de captura/fixturesDaApi.mjs; uma requisição /api sem fixture
derruba a captura ("requisição /api sem fixture: <método> <caminho>"). O proxy
do Vite aponta para uma porta sem ninguém, então o que escapar não chega a
nenhuma API. Ao final, o resumo informa quantas requisições /api foram
respondidas por fixture e quantas chegaram ao proxy (precisa ser 0).

Arquivos gerados em --saida:
  <tela>--<campo|escritorio>.png            a tela inteira
  <tela>--<campo|escritorio>--rolagem-N-P.png
                                            área N com rolagem horizontal (tabela,
                                            carrossel), no passo P: rolada de uma
                                            largura visível por vez até o fim
  <tela>--<campo|escritorio>--painel-P.png
                                            só nas telas de painel: cada área com
                                            rolagem vertical dentro do painel,
                                            uma altura visível por vez, no passo P
                                            (a foto de cima, sem rolar, já é o PNG
                                            da tela; o último passo termina no fim)
  Telas com passo próprio levam o passo no nome: acessos.grupos, acessos.erro (a lista
  de usuários responde 500), inscricaoPublica.cadastro, .anamnese, .declaracao,
  .participacao, .pronto.

Telas de painel (altura fixa): acessos.gerenciar (usuário ativo), acessos.gerenciar.semMotivo
(Suspender acesso com o Motivo vazio), acessos.gerenciar.suspenso, acessos.gerenciar.revogado,
acessos.gerenciar.convite (convite pendente), acessos.convidar e acessos.convidar.invalido
(Registrar convite com os campos vazios). Nenhuma envia comando: abrem o painel e, nas
duas de validação, clicam no botão com o campo vazio; como só existem fixtures de GET,
um POST derrubaria a captura.
Nelas o painel de ação está aberto (folha no campo, lateral no escritório) e a janela
NÃO cresce: fica no tamanho da densidade (390x844 no campo, 1440x900 no escritório).
Assim o limite de altura da folha (90dvh) e a rolagem interna aparecem como o usuário
os vê, e uma regressão na altura muda o PNG. O que rola dentro do painel é paginado
em --painel-P.png. O fundo atrás do painel sai cortado na janela, como na tela real.

Fixtures por tela: uma tela do catálogo pode trazer "fixtures" (captura/telas.mjs) que
valem só para ela e vencem as fixtures gerais, com { status, corpo }. Um 5xx assim é
esperado e não derruba a captura; qualquer outro 5xx derruba.

O que a captura NÃO prova: a comparação é por pixel. Mudança que não altera nenhum
pixel (papel e nome acessível, ordem de foco, atributos ARIA, estrutura do DOM que
renderiza igual) passa despercebida; isso fica com os testes de caracterização (*.dom.test.tsx). Também
não mostra hover, foco nem movimento (a captura desliga animações, tira o foco e
põe o mouse em 0,0), nem o seletor em folha (BottomSheet), que só a página de
registrar lançamento abre e nenhuma tela do catálogo abre.

Sobra conhecida de rolagem interna: o corpo do app rola por dentro e a captura
cresce a janela até o conteúdo caber. Nas telas em que um wrapper com
min-height:100% vem abaixo de uma faixa de aviso, o ajuste nunca converge: o fim
do wrapper (área vazia, sem conteúdo) fica abaixo da foto exatamente a altura da
faixa (70px em campo, 32px em escritório). A captura imprime
"aviso: <arquivo>: Npx" para cada foto assim; o valor é o mesmo em toda execução.
`;

const NOME_DE_ARQUIVO_DA_CAPTURA = /^.+--(campo|escritorio)(--rolagem-\d+-\d+|--painel-\d+)?\.png$/;
const BASE_DO_CODIGO_DE_SAIDA_POR_SINAL = 128;
const SINAIS_DE_ENCERRAMENTO = ['SIGINT', 'SIGTERM'];

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

async function lerAPaginaInicial(pagina, url) {
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
}

async function aquecerEDescobrirTelas({ navegador, url, ambiente }) {
  const contexto = await criarContexto(navegador, DENSIDADES[DENSIDADES.length - 1], ambiente);
  try {
    const pagina = await contexto.newPage();
    return await conferindoFalhasDaRota(ambiente.falhas, () => lerAPaginaInicial(pagina, url));
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

const nomeDaRolagem = (tela, densidade, { area, passo }) =>
  `${tela.nome}--${densidade.nome}--rolagem-${area}-${passo}.png`;

const nomeDoPassoDoPainel = (tela, densidade, passo) => `${tela.nome}--${densidade.nome}--painel-${passo}.png`;

async function gravarFotos({ saida, tela, densidade, foto }) {
  const arquivo = `${tela.nome}--${densidade.nome}.png`;
  await writeFile(join(saida, arquivo), foto.png);
  await Promise.all(
    foto.rolagens.map((rolagem) => writeFile(join(saida, nomeDaRolagem(tela, densidade, rolagem)), rolagem.png)),
  );
  await Promise.all(
    foto.passosDoPainel.map((png, indice) => writeFile(join(saida, nomeDoPassoDoPainel(tela, densidade, indice + 1)), png)),
  );
  if (foto.sobraDeRolagemEmPx > 0) {
    console.warn(`  aviso: ${arquivo}: ${foto.sobraDeRolagemEmPx}px de rolagem interna ficam abaixo da foto (ver --ajuda)`);
  }
  return 1 + foto.rolagens.length + foto.passosDoPainel.length;
}

async function capturarTodas({ navegador, url, telas, saida, ambiente }) {
  let total = 0;
  for (const densidade of DENSIDADES) {
    const contexto = await criarContexto(navegador, densidade, ambiente);
    try {
      for (const tela of telas) {
        const arquivo = `${tela.nome}--${densidade.nome}.png`;
        const inicio = performance.now();
        let foto;
        try {
          foto = await fotografar({ contexto, api: ambiente.api, falhas: ambiente.falhas, url, tela });
        } catch (erro) {
          throw new Error(`${arquivo}: ${erro.message}`, { cause: erro });
        }
        total += await gravarFotos({ saida, tela, densidade, foto });
        console.log(`  ${arquivo}  ${Math.round(performance.now() - inicio)} ms`);
      }
    } finally {
      await contexto.close();
    }
  }
  return total;
}

function conferirQueNadaChegouAoProxy(servidor) {
  const noProxy = servidor.requisicoesNoProxy();
  if (noProxy) throw new Error(`${noProxy} requisições /api chegaram ao proxy do Vite; faltou interceptar`);
  return noProxy === null ? 'proxy fora do controle da captura' : `${noProxy} chegaram ao proxy`;
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
  for (const sinal of SINAIS_DE_ENCERRAMENTO) {
    const codigoDeSaida = BASE_DO_CODIGO_DE_SAIDA_POR_SINAL + constants.signals[sinal];
    process.once(sinal, () => void encerrarTudo().finally(() => process.exit(codigoDeSaida)));
  }

  try {
    const servidor = opcoes.url ? servidorJaNoAr(opcoes.url) : await subirServidorDeDesenvolvimento();
    recursos.push(servidor.encerrar);
    const navegador = await chromium.launch({ args: ARGUMENTOS_DO_CHROMIUM });
    recursos.push(() => navegador.close());

    const falhas = criarRegistroDeFalhas();
    const api = criarApiDaCaptura(falhas);
    const ambiente = { pastaDeFontes: opcoes.fontes, api, falhas };

    const catalogo = await aquecerEDescobrirTelas({ navegador, url: servidor.url, ambiente });
    const telas = escolherTelas(catalogo, opcoes.so);
    await prepararSaida(opcoes.saida, opcoes.so !== null);

    console.log(`Capturando ${telas.length} telas em ${DENSIDADES.length} densidades (${servidor.url})`);
    const total = await capturarTodas({
      navegador,
      url: servidor.url,
      telas,
      saida: opcoes.saida,
      ambiente,
    });
    falhas.conferir();
    const { respondidas, semFixture } = api.contagem();
    const destinoDasRequisicoes = conferirQueNadaChegouAoProxy(servidor);
    const segundos = ((performance.now() - inicio) / 1000).toFixed(1);
    console.log(`${total} capturas em ${opcoes.saida} (${segundos} s)`);
    console.log(
      `requisições /api: ${respondidas} respondidas por fixture, ${semFixture} sem fixture, ${destinoDasRequisicoes}`,
    );
  } finally {
    await encerrarTudo();
  }
}

principal().catch((erro) => {
  console.error(`Falha na captura: ${erro.message}`);
  process.exitCode = 1;
});
