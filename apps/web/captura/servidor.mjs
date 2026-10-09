import { createServer as criarServidorDeRede } from 'node:net';
import { createServer } from 'vite';
import { CAMINHO_DA_API, ORIGEM_DA_API_INEXISTENTE, RAIZ_DO_WEB, VARIAVEIS_DO_SERVIDOR } from './ambiente.mjs';

const ENDERECO_LOCAL = '127.0.0.1';

const descobrirPortaLivre = () =>
  new Promise((resolver, rejeitar) => {
    const sonda = criarServidorDeRede();
    sonda.once('error', rejeitar);
    sonda.listen(0, ENDERECO_LOCAL, () => {
      const { port } = sonda.address();
      sonda.close(() => resolver(port));
    });
  });

export async function subirServidorDeDesenvolvimento() {
  Object.assign(process.env, VARIAVEIS_DO_SERVIDOR);
  const porta = await descobrirPortaLivre();
  let requisicoesNoProxy = 0;
  const servidor = await createServer({
    root: RAIZ_DO_WEB,
    logLevel: 'warn',
    clearScreen: false,
    server: {
      host: ENDERECO_LOCAL,
      port: porta,
      strictPort: true,
      open: false,
      hmr: false,
      watch: null,
      proxy: {
        [CAMINHO_DA_API]: {
          target: ORIGEM_DA_API_INEXISTENTE,
          configure: (proxy) => {
            proxy.on('proxyReq', () => {
              requisicoesNoProxy += 1;
            });
          },
        },
      },
    },
  });
  await servidor.listen();
  return {
    url: `http://${ENDERECO_LOCAL}:${porta}`,
    encerrar: () => servidor.close(),
    requisicoesNoProxy: () => requisicoesNoProxy,
  };
}

export const servidorJaNoAr = (url) => ({
  url: url.replace(/\/$/, ''),
  encerrar: async () => undefined,
  requisicoesNoProxy: () => null,
});
