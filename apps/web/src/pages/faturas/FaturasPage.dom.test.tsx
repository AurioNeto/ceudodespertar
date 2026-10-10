import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clicar, desmontarTudo, montar, todos } from '@/testes/montagem';
import { FaturasPage } from './FaturasPage';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const linhasDaTabela = (container: HTMLElement) => todos<HTMLTableRowElement>(container, 'tbody tr');
const linhaDaCompra = (container: HTMLElement, motivo: string) => {
  const achada = linhasDaTabela(container).find((linha) => linha.textContent?.includes(motivo));
  if (!achada) throw new Error(`compra não encontrada: ${motivo}`);
  return achada;
};

async function abrirFaturaDeSetembro(container: HTMLElement) {
  const botaoDaFatura = todos<HTMLButtonElement>(container, 'button').find((botao) =>
    botao.textContent?.includes('setembro de 2026'),
  );
  if (!botaoDaFatura) throw new Error('fatura de setembro não encontrada');
  await clicar(botaoDaFatura);
}

describe('FaturasPage: selo das compras a conferir', () => {
  it('compra a conferir — leva o selo com o texto A conferir', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFaturaDeSetembro(container);

    expect(linhaDaCompra(container, 'aluguel de betoneira').textContent).toContain('A conferir');
  });

  it('compra já confirmada — não leva o selo', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFaturaDeSetembro(container);

    expect(linhaDaCompra(container, 'mercado do trabalho de setembro').textContent).not.toContain('A conferir');
  });
});
