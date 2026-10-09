import { fileURLToPath, URL } from 'node:url';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';

process.env['TZ'] = 'UTC';

const CONDICAO_FONTE = '@cdd/fonte';

export default defineConfig({
  ssr: {
    resolve: {
      conditions: [CONDICAO_FONTE, 'module', 'node', 'development|production'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    conditions: [CONDICAO_FONTE, ...defaultClientConditions],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'logica',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.dom.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'src/**/*.dom.test.ts'],
        },
      },
    ],
  },
});
