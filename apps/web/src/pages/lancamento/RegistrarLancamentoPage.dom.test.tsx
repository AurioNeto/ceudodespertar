import { afterEach, describe, expect, it } from 'vitest';
import { criarEntradaFalsa, criarEu, montarComSessao, type TelaMontada } from '@/app/apoioDeTeste';
import { botaoComTexto, clicar, digitar, elemento, todos } from '@/testes/montagem';
import { RegistrarLancamentoPage } from './RegistrarLancamentoPage';

const montadas: TelaMontada[] = [];

async function montarPagina(): Promise<TelaMontada> {
  const tela = await montarComSessao(
    { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) },
    <RegistrarLancamentoPage />,
  );
  montadas.push(tela);
  return tela;
}

afterEach(async () => {
  while (montadas.length > 0) await montadas.pop()?.desmontar();
});

const campoDoValor = (tela: TelaMontada) => elemento<HTMLInputElement>(tela.container, 'input[inputmode="decimal"]');
const botaoDeRemoverAnexo = (tela: TelaMontada) => todos<HTMLButtonElement>(tela.container, 'button[title="Remover comprovante"]');

describe('RegistrarLancamentoPage: textos que o ds recebe por prop', () => {
  it('sem anexo — a captura mostra o rótulo e a dica de um toque, nunca obrigatório', async () => {
    const tela = await montarPagina();

    const captura = botaoComTexto(tela.container, 'Anexar comprovanteUm toque, direto da câmera. Nunca obrigatório.');
    expect(captura.type).toBe('button');
    expect(botaoDeRemoverAnexo(tela)).toHaveLength(0);
  });

  it('com anexo — o botão de remover se chama Remover comprovante e a oferta de captura some', async () => {
    const tela = await montarPagina();

    await clicar(botaoComTexto(tela.container, 'Anexar comprovanteUm toque, direto da câmera. Nunca obrigatório.'));

    expect(botaoDeRemoverAnexo(tela)).toHaveLength(1);
    expect(tela.texto()).toContain('IMG_2481.jpg');
    expect(tela.texto()).not.toContain('Um toque, direto da câmera');
  });

  it('valor somado — a soma reconhecida avisa que o valor composto vira pendência na conferência', async () => {
    const tela = await montarPagina();

    await digitar(campoDoValor(tela), '65+70');

    expect(tela.texto()).toContain('Soma reconhecida: 135,00 — o valor composto vira pendência na conferência.');
  });

  it('valor simples — não mostra a soma reconhecida e mantém a dica da página', async () => {
    const tela = await montarPagina();

    await digitar(campoDoValor(tela), '65');

    expect(tela.texto()).not.toContain('Soma reconhecida');
    expect(tela.texto()).toContain('Escreva como você fala. Soma vale: 65+70.');
  });
});
