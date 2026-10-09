import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
});
