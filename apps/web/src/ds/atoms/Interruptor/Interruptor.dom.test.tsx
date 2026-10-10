import { afterEach, describe, expect, it, vi } from 'vitest';
import { Interruptor } from './Interruptor';
import { clicar, desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('Interruptor', () => {
  const montarInterruptor = (props: Partial<Parameters<typeof Interruptor>[0]> = {}) =>
    montar(<Interruptor ligado={false} onAlternar={() => undefined} rotuloAcessivel="Receber avisos" {...props} />);

  it('é um botão com papel de interruptor e o rótulo acessível', async () => {
    const tela = await montarInterruptor();

    const interruptor = elemento<HTMLButtonElement>(tela.container, '[role="switch"]');
    expect(interruptor.tagName).toBe('BUTTON');
    expect(interruptor.type).toBe('button');
    expect(interruptor.getAttribute('aria-label')).toBe('Receber avisos');
  });

  it('desligado marca aria-checked como false', async () => {
    const tela = await montarInterruptor({ ligado: false });

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });

  it('ligado marca aria-checked como true', async () => {
    const tela = await montarInterruptor({ ligado: true });

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('true');
  });

  it('clicar chama onAlternar uma vez', async () => {
    const onAlternar = vi.fn();
    const tela = await montarInterruptor({ onAlternar });

    await clicar(elemento(tela.container, '[role="switch"]'));

    expect(onAlternar).toHaveBeenCalledTimes(1);
  });

  it('ligado, clicar também chama onAlternar uma vez, para poder desligar', async () => {
    const onAlternar = vi.fn();
    const tela = await montarInterruptor({ ligado: true, onAlternar });

    await clicar(elemento(tela.container, '[role="switch"]'));

    expect(onAlternar).toHaveBeenCalledTimes(1);
  });

  it('cada clique chama onAlternar de novo, mesmo sem o valor mudar por fora', async () => {
    const onAlternar = vi.fn();
    const tela = await montarInterruptor({ onAlternar });

    await clicar(elemento(tela.container, '[role="switch"]'));
    await clicar(elemento(tela.container, '[role="switch"]'));

    expect(onAlternar).toHaveBeenCalledTimes(2);
  });

  it('não alterna sozinho: aria-checked só muda quando o prop muda', async () => {
    const tela = await montarInterruptor({ ligado: false });

    await clicar(elemento(tela.container, '[role="switch"]'));

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });

  it('acompanha o prop quando ele vira ligado', async () => {
    const tela = await montarInterruptor({ ligado: false });

    await tela.atualizar(<Interruptor ligado onAlternar={() => undefined} rotuloAcessivel="Receber avisos" />);

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('true');
  });

  it('desligado a bolinha fica à esquerda e a trilha no tom neutro', async () => {
    const tela = await montarInterruptor({ ligado: false });

    const interruptor = elemento(tela.container, '[role="switch"]');
    expect(interruptor.style.justifyContent).toBe('flex-start');
    expect(interruptor.style.background).toBe('var(--color-line-strong)');
  });

  it('ligado a bolinha vai para a direita e a trilha no tom royal', async () => {
    const tela = await montarInterruptor({ ligado: true });

    const interruptor = elemento(tela.container, '[role="switch"]');
    expect(interruptor.style.justifyContent).toBe('flex-end');
    expect(interruptor.style.background).toBe('var(--color-royal)');
  });

  it('não mostra texto, só a bolinha', async () => {
    const tela = await montarInterruptor();

    expect(tela.container.textContent).toBe('');
  });
});
