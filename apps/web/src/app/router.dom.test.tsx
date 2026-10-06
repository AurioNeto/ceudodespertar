import { describe, expect, it } from 'vitest';
import { router } from './router';
import { ROTAS_ANTIGAS_DA_ENTRADA } from './navegacao';

describe('router', () => {
  it.each(ROTAS_ANTIGAS_DA_ENTRADA)('registra a rota antiga %s', (caminho) => {
    expect(router.routes.map((rota) => rota.path)).toContain(caminho);
  });
});
