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

const COR_DO_SELO_PENDENTE = 'var(--color-pending)';
const FUNDO_DO_SELO_PENDENTE = 'var(--color-pending-soft)';

const selosPendentesDaLinha = (linha: HTMLElement) =>
  todos<HTMLSpanElement>(linha, 'span').filter((span) => span.style.color === COR_DO_SELO_PENDENTE);

describe('FaturasPage: selo das compras a conferir', () => {
  it('compra a conferir — leva um único selo com o texto exato A conferir, no tom pendente', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFaturaDeSetembro(container);

    const selos = selosPendentesDaLinha(linhaDaCompra(container, 'aluguel de betoneira'));

    expect(selos.map((selo) => [selo.textContent, selo.style.color, selo.style.background])).toEqual([
      ['A conferir', COR_DO_SELO_PENDENTE, FUNDO_DO_SELO_PENDENTE],
    ]);
  });

  it('compra já confirmada — não leva selo nenhum e o texto A conferir não aparece na linha', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFaturaDeSetembro(container);

    const linha = linhaDaCompra(container, 'mercado do trabalho de setembro');

    expect(selosPendentesDaLinha(linha)).toHaveLength(0);
    expect(linha.textContent).not.toContain('A conferir');
  });
});
