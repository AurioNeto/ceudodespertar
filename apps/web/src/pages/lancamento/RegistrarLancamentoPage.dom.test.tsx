import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, montar, todos } from '@/testes/montagem';
import { RegistrarLancamentoPage } from './RegistrarLancamentoPage';

vi.mock('../../app/sessao', () => ({ useSessao: () => ({ pode: () => false }) }));

const TEXTO_DA_CAPTURA = 'Anexar comprovanteUm toque, direto da câmera. Nunca obrigatório.';
const SELETOR_DE_REMOVER_ANEXO = 'button[title="Remover comprovante"]';

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

const campoDoValor = (container: HTMLElement) => elemento<HTMLInputElement>(container, 'input[inputmode="decimal"]');
const botoesDeRemoverAnexo = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, SELETOR_DE_REMOVER_ANEXO);

describe('RegistrarLancamentoPage: textos que o ds recebe por prop', () => {
  it('sem anexo — a captura mostra o rótulo e a dica de um toque, nunca obrigatório', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    const captura = botaoComTexto(container, TEXTO_DA_CAPTURA);
    expect(captura.type).toBe('button');
    expect(botoesDeRemoverAnexo(container)).toHaveLength(0);
  });

  it('com anexo — o botão de remover se chama Remover comprovante e a oferta de captura some', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await clicar(botaoComTexto(container, TEXTO_DA_CAPTURA));

    expect(botoesDeRemoverAnexo(container)).toHaveLength(1);
    expect(container.textContent).toContain('IMG_2481.jpg');
    expect(container.textContent).not.toContain('Um toque, direto da câmera');
  });

  it('com anexo — o nome acessível do botão de remover é Remover comprovante, vindo só do title', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await clicar(botaoComTexto(container, TEXTO_DA_CAPTURA));

    const remover = elemento<HTMLButtonElement>(container, SELETOR_DE_REMOVER_ANEXO);
    expect(remover.title).toBe('Remover comprovante');
    expect(remover.hasAttribute('aria-label')).toBe(false);
    expect(remover.hasAttribute('aria-labelledby')).toBe(false);
    expect(remover.textContent).toBe('');
    expect(elemento(remover, 'svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('valor somado — a soma reconhecida avisa que o valor composto vira pendência na conferência', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '65+70');

    expect(container.textContent).toContain('Soma reconhecida: 135,00 — o valor composto vira pendência na conferência.');
  });

  it('valor simples — não mostra a soma reconhecida e mantém a dica da página', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '65');

    expect(container.textContent).not.toContain('Soma reconhecida');
    expect(container.textContent).toContain('Escreva como você fala. Soma vale: 65+70.');
  });
});
