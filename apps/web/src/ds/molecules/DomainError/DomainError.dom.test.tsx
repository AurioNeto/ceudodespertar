import { afterEach, describe, expect, it } from 'vitest';
import { DomainError } from './DomainError';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');
const paragrafosDe = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('p')).map((paragrafo) => paragrafo.textContent);

describe('DomainError', () => {
  it('só a regra — mostra a regra e nenhum parágrafo', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" />);

    expect(container.textContent).toBe('Período fechado');
    expect(paragrafosDe(container)).toEqual([]);
  });

  it('com explicação — mostra a regra e a explicação em parágrafo', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" explanation="Março já foi encerrado." />);

    expect(paragrafosDe(container)).toEqual(['Março já foi encerrado.']);
  });

  it('com o caminho — mostra a regra e o caminho em parágrafo', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" way="Peça a reabertura ao tesoureiro." />);

    expect(paragrafosDe(container)).toEqual(['Peça a reabertura ao tesoureiro.']);
  });

  it('com explicação e caminho — explicação vem antes do caminho', async () => {
    const { container } = await montar(
      <DomainError rule="Período fechado" explanation="Março já foi encerrado." way="Peça a reabertura." />,
    );

    expect(paragrafosDe(container)).toEqual(['Março já foi encerrado.', 'Peça a reabertura.']);
  });

  it('explicação e caminho vazios — não desenha parágrafos', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" explanation="" way="" />);

    expect(paragrafosDe(container)).toEqual([]);
  });

  it('a regra vem antes dos parágrafos', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" explanation="E" way="C" />);

    expect(container.textContent).toBe('Período fechadoEC');
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<DomainError rule="R" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});
