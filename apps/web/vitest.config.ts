import { defineConfig } from 'vitest/config';

const CONDICAO_FONTE = '@cdd/fonte';

export default defineConfig({
  ssr: {
    resolve: {
      conditions: [CONDICAO_FONTE, 'module', 'node', 'development|production'],
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
