import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clicar, digitar } from '@/testes/montagem';
import { TextField, type TextFieldProps } from './TextField';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLElement;
let raiz: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  raiz = createRoot(container);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  container.remove();
});

async function montar(props: TextFieldProps = {}) {
  await act(async () => raiz.render(<TextField label="Nome" {...props} />));
}

const campo = () => container.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
const idsDescritivos = () => (campo().getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
const textoDe = (id: string | undefined) => document.getElementById(id ?? '')?.textContent;

describe('TextField: ligação acessível', () => {
  it('o rótulo aponta para o campo', async () => {
    await montar();
    const etiqueta = container.querySelector('label') as HTMLLabelElement;
    expect(etiqueta.htmlFor).toBe(campo().id);
  });

  it('sem erro nem dica, não descreve nem marca inválido', async () => {
    await montar();
    expect(campo().hasAttribute('aria-describedby')).toBe(false);
    expect(campo().hasAttribute('aria-invalid')).toBe(false);
  });

  it('o erro marca o campo como inválido e é a descrição dele', async () => {
    await montar({ error: 'Informe o nome.' });
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(idsDescritivos()).toHaveLength(1);
    expect(textoDe(idsDescritivos()[0])).toBe('Informe o nome.');
  });

  it('a dica descreve o campo sem marcá-lo como inválido', async () => {
    await montar({ hint: 'Como aparece no crachá' });
    expect(campo().hasAttribute('aria-invalid')).toBe(false);
    expect(textoDe(idsDescritivos()[0])).toBe('Como aparece no crachá');
  });

  it('com erro e dica juntos, só o erro aparece e descreve', async () => {
    await montar({ error: 'Informe o nome.', hint: 'Como aparece no crachá' });
    expect(container.textContent).not.toContain('Como aparece no crachá');
    expect(textoDe(idsDescritivos()[0])).toBe('Informe o nome.');
  });

  it('aria-describedby vindo de fora é mantido antes da mensagem do campo', async () => {
    const aviso = document.createElement('p');
    aviso.id = 'aviso-externo';
    aviso.textContent = 'Aviso externo';
    document.body.append(aviso);
    await montar({ 'aria-describedby': 'aviso-externo', error: 'Informe o nome.' });
    const ids = idsDescritivos();
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe('aviso-externo');
    expect(textoDe(ids[1])).toBe('Informe o nome.');
    aviso.remove();
  });

  it('aria-describedby vindo de fora sozinho não ganha id fantasma', async () => {
    await montar({ 'aria-describedby': 'aviso-externo' });
    expect(campo().getAttribute('aria-describedby')).toBe('aviso-externo');
  });

  it('a mesma ligação vale para o campo multilinha', async () => {
    await montar({ multiline: true, error: 'Informe o motivo.' });
    expect(campo().tagName).toBe('TEXTAREA');
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(textoDe(idsDescritivos()[0])).toBe('Informe o motivo.');
  });

  it('com id próprio a mensagem ganha o id derivado dele e o rótulo aponta para o id', async () => {
    await montar({ id: 'nome-da-pessoa', error: 'Informe o nome.' });
    expect(campo().id).toBe('nome-da-pessoa');
    expect((container.querySelector('label') as HTMLLabelElement).htmlFor).toBe('nome-da-pessoa');
    expect(idsDescritivos()).toEqual(['nome-da-pessoa-mensagem']);
  });

  it('sem id próprio dois campos recebem ids diferentes', async () => {
    await act(async () =>
      raiz.render(
        <>
          <TextField label="Nome" />
          <TextField label="Sobrenome" />
        </>,
      ),
    );
    const [primeiro, segundo] = Array.from(container.querySelectorAll('input'));
    expect(primeiro?.id).not.toBe('');
    expect(primeiro?.id).not.toBe(segundo?.id);
  });

  it('com erro vazio e dica, a dica aparece mas o campo não aponta para ela', async () => {
    await montar({ error: '', hint: 'Como aparece no crachá' });
    expect(container.textContent).toContain('Como aparece no crachá');
    expect(campo().hasAttribute('aria-describedby')).toBe(false);
    expect(campo().hasAttribute('aria-invalid')).toBe(false);
  });

  it('corrigir o erro devolve o campo ao estado neutro', async () => {
    await montar({ error: 'Informe o nome.' });
    await montar({});
    expect(campo().hasAttribute('aria-invalid')).toBe(false);
    expect(campo().hasAttribute('aria-describedby')).toBe(false);
    expect(container.textContent).toBe('Nome');
  });
});

describe('TextField: rótulo', () => {
  it('mostra o texto do rótulo antes do controle', async () => {
    await montar();
    const etiqueta = container.querySelector('label') as HTMLLabelElement;
    expect(etiqueta.textContent).toBe('Nome');
    expect(etiqueta.nextElementSibling?.contains(campo())).toBe(true);
  });

  it.each([
    ['ausente', undefined],
    ['vazio', ''],
  ])('com rótulo %s não há label', async (_descricao, label) => {
    await act(async () => raiz.render(<TextField {...(label === undefined ? {} : { label })} />));
    expect(container.querySelector('label')).toBeNull();
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(1);
  });
});

describe('TextField: controle', () => {
  it('sem type é um campo de texto', async () => {
    await montar();
    expect(campo().tagName).toBe('INPUT');
    expect(campo().getAttribute('type')).toBe('text');
  });

  it('o type recebido vai para o campo', async () => {
    await montar({ type: 'password' });
    expect(campo().getAttribute('type')).toBe('password');
  });

  it('multilinha é uma textarea de 3 linhas, sem atributo type', async () => {
    await montar({ multiline: true });
    expect(campo().tagName).toBe('TEXTAREA');
    expect((campo() as HTMLTextAreaElement).rows).toBe(3);
    expect(campo().hasAttribute('type')).toBe(false);
  });

  it('o rows recebido vence as 3 linhas da multilinha', async () => {
    await montar({ multiline: true, rows: 6 });
    expect((campo() as HTMLTextAreaElement).rows).toBe(6);
  });

  it('atributos nativos chegam ao controle', async () => {
    await montar({ placeholder: 'Nome completo', name: 'nome', maxLength: 40, disabled: true });
    expect(campo().getAttribute('placeholder')).toBe('Nome completo');
    expect(campo().getAttribute('name')).toBe('nome');
    expect(campo().getAttribute('maxlength')).toBe('40');
    expect((campo() as HTMLInputElement).disabled).toBe(true);
  });

  it('digitar atualiza o valor e chama onChange uma vez', async () => {
    const aoMudar = vi.fn();
    await montar({ onChange: aoMudar });
    await digitar(campo() as HTMLInputElement, 'Ana');
    expect(campo().value).toBe('Ana');
    expect(aoMudar).toHaveBeenCalledOnce();
  });

  it('somente leitura mostra o valor, marca readonly e troca o fundo', async () => {
    await montar({ readOnly: true, value: 'Ana', onChange: () => undefined });
    expect(campo().value).toBe('Ana');
    expect((campo() as HTMLInputElement).readOnly).toBe(true);
    expect(campo().style.background).toBe('var(--bg-sunken)');
  });

  it('editável tem o fundo de cartão', async () => {
    await montar();
    expect(campo().style.background).toBe('var(--bg-card)');
  });

  it('o style recebido vai para o quadro externo, não para o controle', async () => {
    await montar({ style: { marginTop: 9 } });
    expect((container.firstElementChild as HTMLElement).style.marginTop).toBe('9px');
    expect(campo().style.marginTop).toBe('');
  });

  it.each([
    { nome: 'sem densidade, vale a de escritório', density: undefined, altura: 'var(--target-office)', cima: '10px', esquerda: '13px' },
    { nome: 'escritório', density: 'office', altura: 'var(--target-office)', cima: '10px', esquerda: '13px' },
    { nome: 'campo, com alvo de toque maior', density: 'field', altura: 'var(--target-field)', cima: '12px', esquerda: '14px' },
  ] as const)('$nome: altura mínima $altura e respiro $cima em cima e $esquerda à esquerda', async ({ density, altura, cima, esquerda }) => {
    await montar(density ? { density } : {});
    expect(campo().style.minHeight).toBe(altura);
    expect(campo().style.paddingTop).toBe(cima);
    expect(campo().style.paddingLeft).toBe(esquerda);
  });

  it('sem sufixo nem ação o respiro da direita fica sem valor declarado, e o atalho padding some do estilo', async () => {
    await montar();
    expect(campo().style.paddingRight).toBe('');
    expect(campo().style.padding).toBe('');
  });
});

describe('TextField: estado de erro', () => {
  it('com erro a borda e a sombra usam o tom de atenção', async () => {
    await montar({ error: 'Informe o nome.' });
    expect(campo().style.border).toBe('1px solid var(--color-attention)');
    expect(campo().style.boxShadow).toBe('0 0 0 3px var(--color-attention-soft)');
  });

  it('sem erro a borda é neutra e não há sombra', async () => {
    await montar({ hint: 'Como aparece no crachá' });
    expect(campo().style.border).toBe('1px solid var(--color-line-strong)');
    expect(campo().style.boxShadow).toBe('none');
  });

  it('a mensagem de erro vem depois do controle, no tom de atenção', async () => {
    await montar({ error: 'Informe o nome.' });
    const mensagem = container.querySelector(`[id="${idsDescritivos()[0]}"]`) as HTMLElement;
    expect(mensagem.style.color).toBe('var(--color-attention)');
    expect((container.firstElementChild as HTMLElement).lastElementChild).toBe(mensagem);
  });

  it('a dica vem depois do controle, em tom secundário', async () => {
    await montar({ hint: 'Como aparece no crachá' });
    const mensagem = container.querySelector(`[id="${idsDescritivos()[0]}"]`) as HTMLElement;
    expect(mensagem.style.color).toBe('var(--text-secondary)');
    expect((container.firstElementChild as HTMLElement).lastElementChild).toBe(mensagem);
  });

  it('sem erro nem dica não há bloco de mensagem', async () => {
    await montar();
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(2);
  });
});

describe('TextField: sufixo', () => {
  it('aparece depois do controle e não captura o mouse', async () => {
    await montar({ suffix: 'R$' });
    const sufixo = campo().nextElementSibling as HTMLElement;
    expect(sufixo.textContent).toBe('R$');
    expect(sufixo.style.pointerEvents).toBe('none');
  });

  it('sem sufixo não há nada depois do controle', async () => {
    await montar();
    expect(campo().nextElementSibling).toBeNull();
  });

  it('sufixo vazio não ocupa lugar', async () => {
    await montar({ suffix: '' });
    expect(campo().nextElementSibling).toBeNull();
  });
});

describe('TextField: ação do campo', () => {
  const acao = (onClick: () => void = () => undefined) => ({ icon: 'eye' as const, label: 'Mostrar senha', onClick });
  const botaoDaAcao = () => container.querySelector('button') as HTMLButtonElement;

  it('o botão se chama pelo rótulo da ação, tem o mesmo title e não tem texto', async () => {
    await montar({ action: acao() });
    expect(botaoDaAcao().getAttribute('aria-label')).toBe('Mostrar senha');
    expect(botaoDaAcao().title).toBe('Mostrar senha');
    expect(botaoDaAcao().textContent).toBe('');
  });

  it('o ícone da ação é decorativo e fica dentro do botão', async () => {
    await montar({ action: acao() });
    expect(botaoDaAcao().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('clicar chama onClick da ação uma vez', async () => {
    const aoClicar = vi.fn();
    await montar({ action: acao(aoClicar) });
    await clicar(botaoDaAcao());
    expect(aoClicar).toHaveBeenCalledOnce();
  });

  it('é um botão de tipo button e dentro de um formulário não o envia', async () => {
    const aoEnviar = vi.fn();
    await act(async () =>
      raiz.render(
        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            aoEnviar();
          }}
        >
          <TextField label="Senha" action={acao()} />
        </form>,
      ),
    );
    await clicar(botaoDaAcao());
    expect(aoEnviar).not.toHaveBeenCalled();
    expect(botaoDaAcao().type).toBe('button');
  });

  it('clicar na ação não muda o valor do campo', async () => {
    await montar({ action: acao(), defaultValue: 'segredo' });
    await clicar(botaoDaAcao());
    expect(campo().value).toBe('segredo');
  });

  it('o botão vem depois do controle', async () => {
    await montar({ action: acao() });
    expect(campo().nextElementSibling).toBe(botaoDaAcao());
  });

  it('sem ação não há botão', async () => {
    await montar();
    expect(container.querySelector('button')).toBeNull();
  });

  it.each([
    { nome: 'escritório', density: 'office', medida: '36px' },
    { nome: 'campo', density: 'field', medida: '42px' },
  ] as const)('em $nome o botão mede $medida', async ({ density, medida }) => {
    await montar({ action: acao(), density });
    expect(botaoDaAcao().style.width).toBe(medida);
    expect(botaoDaAcao().style.height).toBe(medida);
  });

  it.each([
    { nome: 'só ação em escritório', props: { action: acao() }, espaco: '46px' },
    { nome: 'só ação em campo', props: { action: acao(), density: 'field' as const }, espaco: '52px' },
    { nome: 'só sufixo', props: { suffix: 'R$' }, espaco: '64px' },
    { nome: 'sufixo e ação juntos, vale o do sufixo', props: { suffix: 'R$', action: acao() }, espaco: '64px' },
  ] as const)('o texto reserva espaço à direita: $nome deixa $espaco', async ({ props, espaco }) => {
    await montar(props);
    expect(campo().style.paddingRight).toBe(espaco);
  });

  it('com sufixo e ação juntos os dois aparecem, o sufixo antes da ação', async () => {
    await montar({ suffix: 'R$', action: acao() });
    const irmaos = Array.from((campo().parentElement as HTMLElement).children).map((filho) => filho.tagName);
    expect(irmaos).toEqual(['INPUT', 'SPAN', 'BUTTON']);
  });
});
