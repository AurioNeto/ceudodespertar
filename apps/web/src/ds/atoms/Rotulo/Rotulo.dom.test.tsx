import { afterEach, describe, expect, it } from 'vitest';
import { Rotulo } from './Rotulo';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('Rotulo', () => {
  it('mostra o texto num span', async () => {
    const tela = await montar(<Rotulo>Saldo</Rotulo>);

    expect(elemento(tela.container, 'span').textContent).toBe('Saldo');
  });

  it('o estilo recebido vence o padrão onde há conflito e preserva o resto', async () => {
    const tela = await montar(<Rotulo style={{ color: 'red', marginBottom: 4 }}>Saldo</Rotulo>);

    const rotulo = elemento(tela.container, 'span');
    expect(rotulo.style.color).toBe('red');
    expect(rotulo.style.marginBottom).toBe('4px');
    expect(rotulo.style.textTransform).toBe('uppercase');
  });

  it('aceita elementos como conteúdo', async () => {
    const tela = await montar(
      <Rotulo>
        Saldo <em>do mês</em>
      </Rotulo>,
    );

    expect(elemento(tela.container, 'span em').textContent).toBe('do mês');
  });
});
