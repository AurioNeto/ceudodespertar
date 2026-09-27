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
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: {
        'src/shared/kernel/**': { 100: true },
      },
    },
  },
});
