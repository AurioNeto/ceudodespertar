import { describe, expect, it } from 'vitest';
import { ROTAS, rotaAtiva, type RotaId } from './navegacao';

describe('rotaAtiva', () => {
  it.each(Object.entries(ROTAS) as [RotaId, string][])('caminho exato de %s', (id, caminho) => {
    expect(rotaAtiva(caminho)).toBe(id);
  });

  it('usa o prefixo mais longo', () => {
    expect(rotaAtiva('/lancamentos/123')).toBe('lancamentos');
    expect(rotaAtiva('/verificacao-de-lote/abc')).toBe('lote');
  });

  it('a raiz só casa exata', () => {
    expect(rotaAtiva('/')).toBe('painel');
    expect(rotaAtiva('/inexistente')).toBe('painel');
  });

  it('entre prefixos concorrentes vence o mais longo', () => {
    expect(rotaAtiva('/meus-registros/x')).toBe('meus');
    expect(rotaAtiva('/meu-perfil/editar')).toBe('perfil');
  });
});
