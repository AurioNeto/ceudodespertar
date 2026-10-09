import { createServer as criarServidorDeRede } from 'node:net';
import { createServer } from 'vite';
import { RAIZ_DO_WEB, VARIAVEIS_DO_SERVIDOR } from './ambiente.mjs';

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
  const servidor = await createServer({
    root: RAIZ_DO_WEB,
    logLevel: 'warn',
    clearScreen: false,
    server: { host: ENDERECO_LOCAL, port: porta, strictPort: true, open: false, hmr: false, watch: null },
  });
  await servidor.listen();
  return { url: `http://${ENDERECO_LOCAL}:${porta}`, encerrar: () => servidor.close() };
}

export const servidorJaNoAr = (url) => ({ url: url.replace(/\/$/, ''), encerrar: async () => undefined });
