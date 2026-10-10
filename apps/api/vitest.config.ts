import swc from 'unplugin-swc';
import { configDefaults, defineConfig } from 'vitest/config';
import { AMBIENTE_DO_KEYCLOAK_DE_TESTE } from './test/ambiente-de-teste.js';

const CONDICAO_FONTE = '@cdd/fonte';

export default defineConfig({
  plugins: [swc.vite()],
  ssr: {
    resolve: {
      conditions: [CONDICAO_FONTE, 'module', 'node', 'development|production'],
    },
  },
  test: {
    env: { ...AMBIENTE_DO_KEYCLOAK_DE_TESTE },
    setupFiles: ['reflect-metadata'],
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts', 'test/**/*.test.ts'],
    exclude: [...configDefaults.exclude, '**/*.integracao.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: {
        'src/shared/kernel/**': { 100: true },
        'src/modules/identidade/domain/**': { 100: true },
      },
    },
  },
});
