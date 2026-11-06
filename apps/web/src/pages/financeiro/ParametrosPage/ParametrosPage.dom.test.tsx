import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { botaoComTexto, clicar, digitar, elemento } from '@/testes/montagem';
import { assentar } from '@/testes/sessaoDeTeste';
import { ParametrosPage } from './ParametrosPage';

it('reutiliza a chave ao reenviar o mesmo cadastro depois de uma falha', async () => {
  let tentativas = 0;
  const tela = await montarCadastro(<ParametrosPage />, ['financeiro.plano_contas.ler', 'financeiro.plano_contas.gerenciar'], (_caminho, requisicao) => {
    if (requisicao?.method === 'POST') {
      tentativas += 1;
      return tentativas === 1 ? Response.json({}, { status: 500 }) : Response.json({}, { status: 201 });
    }
    return Response.json({ itens: [] });
  });
  try {
    await tela.clicar('Grupos de custo');
    await tela.clicar('Adicionar grupo de custo');
    const painel = elemento(document, '[role="dialog"]');
    expect(painel.textContent).not.toContain('Situação');
    const [nome, codigo] = painel.querySelectorAll('input');
    if (!nome || !codigo) throw new Error('Campos esperados no cadastro');
    await digitar(nome, 'Eventos');
    await digitar(codigo, 'EVENTOS');
    await clicar(botaoComTexto(painel, 'Salvar'));
    await assentar();
    expect(elemento(painel, '[role="alert"]').textContent).toContain('Não foi possível salvar');
    await clicar(botaoComTexto(painel, 'Salvar'));
    await assentar();
    const envios = tela.fetch.mock.calls.filter(([, requisicao]) => requisicao?.method === 'POST');
    expect(envios.map(([caminho]) => caminho)).toEqual(['/api/v1/financeiro/grupos-de-custo', '/api/v1/financeiro/grupos-de-custo']);
    const chaves = envios.map(([, requisicao]) => new Headers(requisicao?.headers).get('Idempotency-Key'));
    expect(chaves[0]).toBeTruthy();
    expect(chaves[0]).toBe(chaves[1]);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    await tela.desmontar();
  }
});
