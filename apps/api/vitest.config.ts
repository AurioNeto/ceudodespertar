import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const CONDICAO_FONTE = '@cdd/fonte';

export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    conditions: [CONDICAO_FONTE],
  },
  ssr: {
    resolve: {
      conditions: [CONDICAO_FONTE],
    },
  },
  test: {
    setupFiles: ['reflect-metadata'],
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
  },
});
