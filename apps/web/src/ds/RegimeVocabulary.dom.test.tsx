import type { RegimeDaUnidade } from '@cdd/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';
import { RegimeVocabulary, useTermo, type Vocabulario } from './RegimeVocabulary';

afterEach(desmontarTudo);

function Termo({ chave }: { chave: keyof Vocabulario }) {
  return <span data-termo={chave}>{useTermo(chave)}</span>;
}

const CHAVES: readonly (keyof Vocabulario)[] = ['receita', 'pessoa', 'valor', 'documento'];

const todosOsTermos = () => (
  <>
    {CHAVES.map((chave) => (
      <Termo key={chave} chave={chave} />
    ))}
  </>
);

const termoLido = (origem: ParentNode, chave: keyof Vocabulario) =>
  elemento(origem, `[data-termo="${chave}"]`).textContent;

describe('useTermo: dentro do provedor', () => {
  it.each([
    ['CONTRIBUICAO', 'receita', 'contribuição'],
    ['CONTRIBUICAO', 'pessoa', 'participante'],
    ['CONTRIBUICAO', 'valor', 'valor sugerido'],
    ['CONTRIBUICAO', 'documento', 'recibo de contribuição'],
    ['COMERCIAL', 'receita', 'venda'],
    ['COMERCIAL', 'pessoa', 'cliente'],
    ['COMERCIAL', 'valor', 'preço'],
    ['COMERCIAL', 'documento', 'nota / comprovante de venda'],
  ] as const)('regime %s, termo %s: devolve "%s"', async (regime, chave, esperado) => {
    const { container } = await montar(
      <RegimeVocabulary regime={regime}>
        <Termo chave={chave} />
      </RegimeVocabulary>,
    );
    expect(termoLido(container, chave)).toBe(esperado);
  });

  it('sem regime informado, o vocabulário é o de contribuição', async () => {
    const { container } = await montar(<RegimeVocabulary>{todosOsTermos()}</RegimeVocabulary>);
    expect(termoLido(container, 'receita')).toBe('contribuição');
    expect(termoLido(container, 'pessoa')).toBe('participante');
  });

  it('trocar o regime do provedor troca os termos já exibidos', async () => {
    const montado = await montar(<RegimeVocabulary regime="CONTRIBUICAO">{todosOsTermos()}</RegimeVocabulary>);
    await montado.atualizar(<RegimeVocabulary regime="COMERCIAL">{todosOsTermos()}</RegimeVocabulary>);
    expect(termoLido(montado.container, 'receita')).toBe('venda');
    expect(termoLido(montado.container, 'documento')).toBe('nota / comprovante de venda');
  });

  it('provedor aninhado vale para o seu miolo e o de fora continua valendo fora dele', async () => {
    const { container } = await montar(
      <RegimeVocabulary regime="CONTRIBUICAO">
        <Termo chave="pessoa" />
        <section data-miolo>
          <RegimeVocabulary regime="COMERCIAL">
            <Termo chave="pessoa" />
          </RegimeVocabulary>
        </section>
      </RegimeVocabulary>,
    );
    const textos = Array.from(container.querySelectorAll('[data-termo="pessoa"]')).map((termo) => termo.textContent);
    expect(textos).toEqual(['participante', 'cliente']);
  });

  it('provedores irmãos não se contaminam', async () => {
    const { container } = await montar(
      <>
        <RegimeVocabulary regime="COMERCIAL">
          <Termo chave="receita" />
        </RegimeVocabulary>
        <RegimeVocabulary regime="CONTRIBUICAO">
          <Termo chave="receita" />
        </RegimeVocabulary>
      </>,
    );
    const textos = Array.from(container.querySelectorAll('[data-termo="receita"]')).map((termo) => termo.textContent);
    expect(textos).toEqual(['venda', 'contribuição']);
  });
});

describe('useTermo: fora do provedor', () => {
  it.each([
    ['receita', 'contribuição'],
    ['pessoa', 'participante'],
    ['valor', 'valor sugerido'],
    ['documento', 'recibo de contribuição'],
  ] as const)('termo %s cai no vocabulário de contribuição: "%s"', async (chave, esperado) => {
    const { container } = await montar(<Termo chave={chave} />);
    expect(termoLido(container, chave)).toBe(esperado);
  });
});

describe('RegimeVocabulary: o invólucro', () => {
  it.each([
    ['CONTRIBUICAO', 'contribuicao'],
    ['COMERCIAL', 'comercial'],
  ] as const)('regime %s marca o invólucro com data-regime="%s"', async (regime, marca) => {
    const { container } = await montar(<RegimeVocabulary regime={regime}>{null}</RegimeVocabulary>);
    expect((container.firstElementChild as HTMLElement).dataset['regime']).toBe(marca);
  });

  it('sem regime informado, o invólucro é marcado como contribuição', async () => {
    const { container } = await montar(<RegimeVocabulary>{null}</RegimeVocabulary>);
    expect((container.firstElementChild as HTMLElement).dataset['regime']).toBe('contribuicao');
  });

  it('renderiza os filhos dentro do invólucro', async () => {
    const { container } = await montar(
      <RegimeVocabulary regime="COMERCIAL">
        <p>conteúdo da tela</p>
      </RegimeVocabulary>,
    );
    expect(elemento(container, '[data-regime] > p').textContent).toBe('conteúdo da tela');
  });

  it('repassa o style ao invólucro', async () => {
    const { container } = await montar(<RegimeVocabulary style={{ marginTop: 20 }}>{null}</RegimeVocabulary>);
    expect((container.firstElementChild as HTMLElement).style.marginTop).toBe('20px');
  });

  it('não escreve nenhum termo de negócio por conta própria: sem filhos, o invólucro fica vazio', async () => {
    const { container } = await montar(<RegimeVocabulary regime="COMERCIAL">{null}</RegimeVocabulary>);
    expect(container.textContent).toBe('');
  });
});

describe('RegimeVocabulary: regime fora do contrato', () => {
  it('um regime desconhecido derruba a renderização de quem lê um termo', async () => {
    const regimeDeOutraVersao = 'ATACADO' as unknown as RegimeDaUnidade;
    const lerTermoDoRegimeDesconhecido = montar(
      <RegimeVocabulary regime={regimeDeOutraVersao}>
        <Termo chave="receita" />
      </RegimeVocabulary>,
    );
    await expect(lerTermoDoRegimeDesconhecido).rejects.toThrow(TypeError);
  });
});
