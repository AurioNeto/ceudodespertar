import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClimaProvider } from './ClimaProvider';
import { CHAVE_DO_CLIMA, COR_DO_TEMA_POR_CLIMA } from './constantes';
import { useClima } from './hooks/useClima';

let container: HTMLElement;
let raiz: Root;

function ClimaAtual() {
  return <p data-testid="clima">{useClima().clima}</p>;
}

function criarArmazenamento(inicial: Record<string, string> = {}) {
  const valores = new Map(Object.entries(inicial));
  return {
    getItem: (chave: string) => valores.get(chave) ?? null,
    setItem: (chave: string, valor: string) => void valores.set(chave, valor),
  };
}

async function montar(inicial: Record<string, string> = {}) {
  await act(async () =>
    raiz.render(
      <ClimaProvider armazenamento={criarArmazenamento(inicial)}>
        <ClimaAtual />
      </ClimaProvider>,
    ),
  );
}

async function avisarOutraAba(key: string | null, newValue: string | null) {
  await act(async () => {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
  });
}

const climaNaTela = () => container.querySelector('[data-testid="clima"]')?.textContent;
const corDoTema = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

beforeEach(() => {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.append(meta);
  container = document.createElement('div');
  document.body.append(container);
  raiz = createRoot(container);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  container.remove();
  document.querySelector('meta[name="theme-color"]')?.remove();
  delete document.documentElement.dataset.clima;
});

describe('ClimaProvider entre abas', () => {
  it('aplica o clima escolhido em outra aba sem recarregar', async () => {
    await montar();

    await avisarOutraAba(CHAVE_DO_CLIMA, 'amanhecer');

    expect(climaNaTela()).toBe('amanhecer');
    expect(document.documentElement.dataset.clima).toBe('amanhecer');
    expect(corDoTema()).toBe(COR_DO_TEMA_POR_CLIMA.amanhecer);
  });

  it.each([
    ['outra chave', 'cdd.outra', 'amanhecer'],
    ['valor que não é clima', CHAVE_DO_CLIMA, 'chuva'],
    ['chave apagada', CHAVE_DO_CLIMA, null],
    ['armazenamento limpo', null, null],
  ])('ignora %s', async (_caso, chave, valor) => {
    await montar({ [CHAVE_DO_CLIMA]: 'amanhecer' });

    await avisarOutraAba(chave, valor);

    expect(climaNaTela()).toBe('amanhecer');
  });

  it('deixa de ouvir depois de desmontar', async () => {
    await montar();
    await act(async () => raiz.unmount());
    raiz = createRoot(container);

    await avisarOutraAba(CHAVE_DO_CLIMA, 'amanhecer');

    expect(document.documentElement.dataset.clima).toBe('noite');
  });
});
