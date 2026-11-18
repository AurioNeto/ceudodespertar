import { act } from 'react';
import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { botaoComTexto, clicar, elemento } from '@/testes/montagem';
import { assentar, criarEu } from '@/testes/sessaoDeTeste';
import { MeusRegistrosPage } from './MeusRegistrosPage';

it('mostra os registros e a paginação do servidor', async () => {
  const tela = await montarCadastro(<MeusRegistrosPage />, ['financeiro.lancamento.ler_proprios'], caminho => {
    const primeira = caminho.endsWith('pagina=1');
    return Response.json({
      itens: [{ id: 'l1', motivo: primeira ? 'Velas' : 'Limpeza', tipo: 'SAIDA', valor: 2500,
        registradoEm: '2026-11-06T01:05:00.123456Z', status: 'A_CONFERIR', pendencia: { texto: 'Qual foi o fornecedor?' } }],
      proximaPagina: primeira ? 2 : null,
    });
  });
  try {
    expect(tela.texto()).toContain('Velas');
    expect(tela.texto()).toContain('05/11/2026 22:05');
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

const registro = { id: 'l1', tipo: 'SAIDA', valor: 2500, motivo: 'Velas', versao: 7,
  status: 'CONFIRMADO', registradoEm: '2026-11-05T15:00:00Z', pendencias: [] };

it('permite responder pelo próprio registro usando a versão lida', async () => {
  let respondeu = false;
  const texto = 'Fornecedor do bairro';
  const pendencia = { id: 'p1', texto: 'Qual foi o fornecedor?', abertaEm: registro.registradoEm, destinatario: criarEu().usuario.id };
  const permissoes = ['financeiro.lancamento.ler_proprios', 'financeiro.lancamento.registrar'] as const;
  const tela = await montarCadastro(<MeusRegistrosPage />, [...permissoes], (caminho, requisicao) => {
    if (requisicao?.method === 'POST') {
      respondeu = true;
      return new Response(null, { status: 200 });
    }
    if (caminho.endsWith('/l1')) return Response.json({ ...registro, status: 'A_CONFERIR',
      pendencias: [{ ...pendencia, resposta: respondeu ? texto : null, resolvidaEm: respondeu ? registro.registradoEm : null }],
    });
    return Response.json({ itens: [{ ...registro, pendencia, status: 'A_CONFERIR' }], proximaPagina: null });
  });
  try {
    await tela.clicar('Ver detalhes');
    const painel = elemento(document, '[role="dialog"]');
    await clicar(botaoComTexto(painel, 'Responder pendência'));
    await preencherTexto(painel, texto);
    await clicar(botaoComTexto(painel, 'Enviar resposta'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamada?.[0]).toBe('/api/v1/financeiro/lancamentos/l1/pendencias/p1/resposta');
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('7');
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ texto });
    expect(painel.textContent).toContain(texto);
  } finally {
    await tela.desmontar();
  }
});

async function preencherTexto(painel: HTMLElement, valor: string) {
  const campo = elemento<HTMLTextAreaElement>(painel, 'textarea');
  const definir = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definir?.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
