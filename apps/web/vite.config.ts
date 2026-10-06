import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defaultClientConditions, defineConfig } from 'vite';

const ORIGEM_DA_API = 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    conditions: ['@cdd/fonte', ...defaultClientConditions],
  },
  server: {
    proxy: {
      '/api': ORIGEM_DA_API,
    },
  },
});
