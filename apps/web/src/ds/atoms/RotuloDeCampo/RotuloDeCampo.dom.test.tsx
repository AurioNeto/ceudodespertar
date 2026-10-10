import { afterEach, describe, expect, it } from 'vitest';
import { RotuloDeCampo } from './RotuloDeCampo';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('RotuloDeCampo', () => {
  it('mostra o texto num label ligado ao campo pelo htmlFor', async () => {
    const tela = await montar(<RotuloDeCampo htmlFor="campo-1">Valor</RotuloDeCampo>);

    const rotulo = elemento<HTMLLabelElement>(tela.container, 'label');
    expect(rotulo.textContent).toBe('Valor');
    expect(rotulo.htmlFor).toBe('campo-1');
  });

  it('sem htmlFor o label não aponta para campo nenhum', async () => {
    const tela = await montar(<RotuloDeCampo>Valor</RotuloDeCampo>);

    expect(elemento(tela.container, 'label').hasAttribute('for')).toBe(false);
  });

  it('aceita elementos como conteúdo', async () => {
    const tela = await montar(
      <RotuloDeCampo>
        Valor <strong>obrigatório</strong>
      </RotuloDeCampo>,
    );

    expect(elemento(tela.container, 'label strong').textContent).toBe('obrigatório');
  });
});
