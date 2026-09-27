import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const CONDICAO_FONTE = '@cdd/fonte';

export default defineConfig({
  plugins: [swc.vite()],
  ssr: {
    resolve: {
      conditions: [CONDICAO_FONTE, 'module', 'node', 'development|production'],
    },
  },
  test: {
    setupFiles: ['reflect-metadata'],
    include: ['test/banco/garantias/**/*.test.ts'],
    globalSetup: ['test/integracao/preparacao-global.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
