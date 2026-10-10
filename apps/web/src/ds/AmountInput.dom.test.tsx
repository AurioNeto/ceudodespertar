import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { AmountInput } from './AmountInput';
import { desmontarTudo, digitar, elemento, montar } from '@/testes/montagem';
import { atributosComTexto } from './apoioDeTeste';

afterEach(desmontarTudo);

const campoDe = (container: HTMLElement) => elemento<HTMLInputElement>(container, 'input');
const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');

const ROTULO_DO_CONSUMIDOR = 'Rótulo do consumidor';
const ROTULO_DA_SOMA = 'Total lido:';
const NOTA_DA_SOMA = 'nota do consumidor.';
const TEXTOS = { label: ROTULO_DO_CONSUMIDOR, sumLabel: ROTULO_DA_SOMA, sumNote: NOTA_DA_SOMA } as const;

const FRASE_DA_SOMA = (total: string) => `${ROTULO_DA_SOMA} ${total} — ${NOTA_DA_SOMA}`;

const SOMA_POR_EXPRESSAO: readonly [string, string][] = [
  ['65+70', '135,00'],
  ['40+25,50', '65,50'],
  ['10,5+0,25', '10,75'],
  ['1+2+3', '6,00'],
  ['65+', '65,00'],
  ['+65', '65,00'],
  ['+', '0,00'],
  ['abc+1', '1,00'],
  ['-5+10', '5,00'],
  [' 10 + 5 ', '15,00'],
  ['0,1+0,2', '0,30'],
  ['1e3+1', '1.001,00'],
  ['1.200+50', '51,20'],
  ['1.200,50+50', '51,20'],
  ['1,2,3+1', '2,20'],
];

const SEM_SOMA: readonly string[] = ['', '65', '65,50', '1.200', '1.200,50', 'abc'];

function ControladoPeloPai({ inicial }: { inicial: string }) {
  const [valor, setValor] = useState(inicial);
  return <AmountInput {...TEXTOS} value={valor} onChange={setValor} />;
}

describe('AmountInput — apresentação', () => {
  it('label recebido — rotula o texto e o campo, sem rótulo próprio', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} />);

    expect(container.textContent).toContain(ROTULO_DO_CONSUMIDOR);
    expect(campoDe(container).getAttribute('aria-label')).toBe(ROTULO_DO_CONSUMIDOR);
  });

  it('label próprio — rotula o texto e o campo', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} label="Valor pago" />);

    expect(container.textContent).toContain('Valor pago');
    expect(campoDe(container).getAttribute('aria-label')).toBe('Valor pago');
  });

  it('campo — é decimal, com placeholder 0,00 e prefixo R$', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} />);

    const campo = campoDe(container);
    expect([campo.inputMode, campo.placeholder]).toEqual(['decimal', '0,00']);
    expect(container.textContent).toContain('R$');
  });

  it('sem value — o campo começa vazio', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} />);

    expect(campoDe(container).value).toBe('');
  });

  it('value inicial — o campo começa com ele', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="40,00" />);

    expect(campoDe(container).value).toBe('40,00');
  });

  it('style próprio — sobrepõe o fundo da raiz', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});

describe('AmountInput — sem onChange (estado interno)', () => {
  it('digitar — o campo passa a mostrar o que foi digitado', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} />);

    await digitar(campoDe(container), '123,45');

    expect(campoDe(container).value).toBe('123,45');
  });

  it('value inicial e depois digitar — o digitado vence o inicial', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="40,00" />);

    await digitar(campoDe(container), '50,00');

    expect(campoDe(container).value).toBe('50,00');
  });

  it('value muda depois de montado — o campo continua com o valor interno', async () => {
    const { container, atualizar } = await montar(<AmountInput {...TEXTOS} value="40,00" />);

    await atualizar(<AmountInput {...TEXTOS} value="99,00" />);

    expect(campoDe(container).value).toBe('40,00');
  });

  it('digitar uma soma — mostra a soma reconhecida', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} />);

    await digitar(campoDe(container), '65+70');

    expect(container.textContent).toContain(FRASE_DA_SOMA('135,00'));
  });
});

describe('AmountInput — com onChange (controlado pelo pai)', () => {
  it('digitar — chama onChange com o texto digitado', async () => {
    const aoMudar = vi.fn();
    const { container } = await montar(<AmountInput {...TEXTOS} value="" onChange={aoMudar} />);

    await digitar(campoDe(container), '12,5');

    expect(aoMudar).toHaveBeenCalledTimes(1);
    expect(aoMudar).toHaveBeenCalledWith('12,5');
  });

  it('digitar sem o pai atualizar value — o campo volta ao value recebido', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="40,00" onChange={vi.fn()} />);

    await digitar(campoDe(container), '99');

    expect(campoDe(container).value).toBe('40,00');
  });

  it('onChange sem value — o campo fica vazio e a digitação ainda chega ao pai', async () => {
    const aoMudar = vi.fn();
    const { container } = await montar(<AmountInput {...TEXTOS} onChange={aoMudar} />);

    await digitar(campoDe(container), '7');

    expect(campoDe(container).value).toBe('');
    expect(aoMudar).toHaveBeenCalledWith('7');
  });

  it('pai que guarda o valor — o campo acompanha o que foi digitado', async () => {
    const { container } = await montar(<ControladoPeloPai inicial="" />);

    await digitar(campoDe(container), '88,10');

    expect(campoDe(container).value).toBe('88,10');
  });

  it('pai que guarda o valor — digitar uma soma mostra a soma reconhecida', async () => {
    const { container } = await montar(<ControladoPeloPai inicial="" />);

    await digitar(campoDe(container), '65+70');

    expect(container.textContent).toContain(FRASE_DA_SOMA('135,00'));
  });

  it('pai muda o value — o campo mostra o novo value', async () => {
    const { container, atualizar } = await montar(<AmountInput {...TEXTOS} value="40,00" onChange={vi.fn()} />);

    await atualizar(<AmountInput {...TEXTOS} value="99,00" onChange={vi.fn()} />);

    expect(campoDe(container).value).toBe('99,00');
  });
});

describe('AmountInput — soma de parcelas', () => {
  it.each(SOMA_POR_EXPRESSAO)('expressão "%s" — reconhece a soma %s', async (expressao, total) => {
    const { container } = await montar(<AmountInput {...TEXTOS} value={expressao} onChange={vi.fn()} />);

    expect(container.textContent).toContain(FRASE_DA_SOMA(total));
  });

  it('soma — a linha é só o que o consumidor mandou: sumLabel, o total e sumNote', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="65+70" onChange={vi.fn()} />);

    expect(elemento(container, 'b').parentElement?.textContent).toBe(FRASE_DA_SOMA('135,00'));
  });

  it('soma — sumLabel e sumNote trocados mudam a linha inteira', async () => {
    const { container } = await montar(
      <AmountInput {...TEXTOS} sumLabel="Parcelas:" sumNote="confira depois." value="65+70" onChange={vi.fn()} />,
    );

    expect(elemento(container, 'b').parentElement?.textContent).toBe('Parcelas: 135,00 — confira depois.');
  });

  it('soma — o total sai em negrito numérico', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="65+70" onChange={vi.fn()} />);

    const total = elemento<HTMLElement>(container, 'b');
    expect([total.textContent, total.hasAttribute('data-numeric')]).toEqual(['135,00', true]);
  });

  it.each(SEM_SOMA)('valor "%s" sem sinal de mais — não mostra a soma', async (valor) => {
    const { container } = await montar(<AmountInput {...TEXTOS} value={valor} onChange={vi.fn()} />);

    expect(container.textContent).not.toContain(ROTULO_DA_SOMA);
  });
});

describe('AmountInput — textos vazios', () => {
  const TEXTOS_VAZIOS = { label: '', sumLabel: '', sumNote: '', hint: '' } as const;

  it('sem soma — só sobra o prefixo R$ e o campo fica sem nome próprio', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS_VAZIOS} value="65" onChange={vi.fn()} />);

    expect(container.textContent).toBe('R$');
    expect(campoDe(container).getAttribute('aria-label')).toBe('');
    expect(atributosComTexto(container, { placeholder: '0,00' })).toEqual([]);
  });

  it('com soma — sobra só o total e o travessão que separa a nota: o componente não escreve rótulo nem nota', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS_VAZIOS} value="65+70" onChange={vi.fn()} />);

    expect(container.textContent).toBe('R$ 135,00 — ');
    expect(atributosComTexto(container, { placeholder: '0,00' })).toEqual([]);
  });
});

describe('AmountInput — dica', () => {
  it('com hint e sem soma — mostra a dica', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="40" onChange={vi.fn()} hint="Use ponto ou vírgula" />);

    expect(container.textContent).toContain('Use ponto ou vírgula');
  });

  it('com hint e com soma — a soma ocupa o lugar da dica', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="40+25" onChange={vi.fn()} hint="Use ponto ou vírgula" />);

    expect(container.textContent).not.toContain('Use ponto ou vírgula');
    expect(container.textContent).toContain(FRASE_DA_SOMA('65,00'));
  });

  it('sem hint e sem soma — não há linha de apoio', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} value="40" onChange={vi.fn()} />);

    expect(container.textContent).toBe(`${ROTULO_DO_CONSUMIDOR}R$`);
  });

  it('com hint — a dica some quando o usuário digita uma soma e volta quando apaga o sinal', async () => {
    const { container } = await montar(<AmountInput {...TEXTOS} hint="Use ponto ou vírgula" />);

    await digitar(campoDe(container), '40+25');
    const aoSomar = container.textContent;
    await digitar(campoDe(container), '40');
    const aposApagar = container.textContent;

    expect(aoSomar).not.toContain('Use ponto ou vírgula');
    expect(aposApagar).toContain('Use ponto ou vírgula');
  });
});
