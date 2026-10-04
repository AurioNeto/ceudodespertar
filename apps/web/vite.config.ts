import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defaultClientConditions, defineConfig } from 'vite';

const ORIGEM_DA_API = 'http://localhost:3000';

export default defineConfig({
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    conditions: ['@cdd/fonte', ...defaultClientConditions],
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        silencioso: fileURLToPath(new URL('./silencioso.html', import.meta.url)),
      },
    },
  },
  server: {
    proxy: {
      '/api': ORIGEM_DA_API,
    },
  },
});
