import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { useChaveDeIdempotencia } from './chaveDeIdempotencia';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type ChavePara = ReturnType<typeof useChaveDeIdempotencia>;

describe('useChaveDeIdempotencia', () => {
  it('mantém a chave entre renderizações e começa outra a cada montagem', async () => {
    let contador = 0;
    const gerar = () => `chave-${++contador}`;
    const capturadas: ChavePara[] = [];

    function Formulario() {
      capturadas.push(useChaveDeIdempotencia(gerar));
      return null;
    }

    const container = document.createElement('div');
    const raiz = createRoot(container);
    await act(async () => raiz.render(<Formulario />));
    await act(async () => raiz.render(<Formulario />));
    const [primeira, segunda] = capturadas;
    expect(primeira).toBe(segunda);
    expect(primeira?.({ a: 1 })).toBe(segunda?.({ a: 1 }));
    await act(async () => raiz.unmount());

    const outraRaiz = createRoot(container);
    await act(async () => outraRaiz.render(<Formulario />));
    const montagemNova = capturadas.at(-1);
    expect(montagemNova?.({ a: 1 })).not.toBe(primeira?.({ a: 1 }));
    await act(async () => outraRaiz.unmount());
  });
});
