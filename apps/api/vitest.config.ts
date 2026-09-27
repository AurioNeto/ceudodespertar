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
      include: ['src/shared/kernel/**/*.ts'],
      exclude: ['src/shared/kernel/**/*.spec.ts'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
