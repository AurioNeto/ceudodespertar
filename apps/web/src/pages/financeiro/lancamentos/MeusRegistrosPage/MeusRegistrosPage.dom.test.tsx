import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { MeusRegistrosPage } from './MeusRegistrosPage';

it('mostra os registros e a paginação do servidor', async () => {
  const tela = await montarCadastro(<MeusRegistrosPage />, ['financeiro.lancamento.ler_proprios'], caminho => {
    const primeira = caminho.endsWith('pagina=1');
    return Response.json({
      itens: [{ id: 'l1', motivo: primeira ? 'Velas' : 'Limpeza', tipo: 'SAIDA', valor: 2500,
        registradoEm: '2026-11-05T15:00:00Z', status: 'A_CONFERIR', pendencia: { texto: 'Qual foi o fornecedor?' } }],
      proximaPagina: primeira ? 2 : null,
    });
  });
  try {
    expect(tela.texto()).toContain('Velas');
    expect(tela.texto()).toContain('Qual foi o fornecedor?');
    await tela.clicar('Próxima página');
    expect(tela.texto()).toContain('Limpeza');
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toEqual([
      '/api/v1/financeiro/meus-registros?pagina=1', '/api/v1/financeiro/meus-registros?pagina=2',
    ]);
  } finally {
    await tela.desmontar();
  }
});
