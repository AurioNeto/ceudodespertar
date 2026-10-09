export const semearAleatorio = () => {
  let estado = 0x2f6e2b1;
  Math.random = () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const esperarTelaAssentar = async ({ sossego, limite }) => {
  const inicio = performance.now();

  const silencioDoDom = () =>
    new Promise((resolver) => {
      let temporizador = setTimeout(encerrar, sossego);
      const observador = new MutationObserver(() => {
        clearTimeout(temporizador);
        temporizador = setTimeout(encerrar, sossego);
      });
      observador.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      function encerrar() {
        observador.disconnect();
        resolver();
      }
    });

  for (;;) {
    await document.fonts.ready;
    await silencioDoDom();
    const falhas = [...document.fonts].filter((fonte) => fonte.status === 'error');
    if (falhas.length > 0) throw new Error(`fontes que falharam: ${falhas.map((fonte) => fonte.family).join(', ')}`);
    if (document.fonts.status === 'loaded') return;
    if (performance.now() - inicio > limite) throw new Error('a tela não parou de mudar a tempo');
  }
};

export const medirExcessoDeRolagem = () => {
  const metadeDaJanela = window.innerHeight / 2;
  const doDocumento = document.documentElement.scrollHeight - window.innerHeight;
  const dosContainers = [...document.querySelectorAll('*')]
    .filter(
      (elemento) =>
        elemento.clientHeight >= metadeDaJanela && ['auto', 'scroll'].includes(getComputedStyle(elemento).overflowY),
    )
    .map((elemento) => elemento.scrollHeight - elemento.clientHeight);
  return Math.max(0, doDocumento, ...dosContainers);
};

export const esperarDoisQuadros = () =>
  new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(() => resolver())));

export const refazerOLayoutDoZero = () => {
  const raiz = document.documentElement;
  raiz.style.display = 'none';
  void raiz.offsetHeight;
  raiz.style.display = '';
};

export const tirarFocoDoElementoAtivo = () => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
};

export const familiasSemFonte = async (familias) => {
  const ausentes = [];
  for (const familia of familias) {
    const carregadas = await document.fonts.load(`400 16px "${familia}"`);
    if (carregadas.length === 0) ausentes.push(familia);
  }
  return ausentes;
};

export const importarRotas = async (endereco) => {
  const { ROTAS, ROTAS_PUBLICAS } = await import(endereco);
  return { rotas: { ...ROTAS }, publicas: { ...ROTAS_PUBLICAS } };
};
