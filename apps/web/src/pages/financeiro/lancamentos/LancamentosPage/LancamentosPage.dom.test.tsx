import { act } from 'react';
import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { botaoComTexto, clicar, digitar, elemento } from '@/testes/montagem';
import { assentar } from '@/testes/sessaoDeTeste';
import { LancamentosPage } from './LancamentosPage';

const registro = { id: 'l1', tipo: 'SAIDA', valor: 2500, motivo: 'Velas', versao: 7,
  status: 'CONFIRMADO', registradoEm: '2026-11-05T15:00:00Z', pendencias: [] };

it('pagina o livro e envia o estorno com a versão do detalhe', async () => {
  let estornado = false;
  const tela = await montarCadastro(<LancamentosPage />, ['financeiro.lancamento.ler', 'financeiro.lancamento.estornar'], (caminho, requisicao) => {
    if (requisicao?.method === 'POST') {
      estornado = true;
      return Response.json({ id: 'l2' }, { status: 201 });
    }
    if (caminho.endsWith('/l1')) return Response.json({ ...registro, versao: 8, estornadoPorId: estornado ? 'l2' : null });
    if (caminho.endsWith('pagina=1')) return Response.json({ itens: [], proximaPagina: 2 });
    return Response.json({ itens: [{ ...registro, status: estornado ? 'ESTORNADO' : 'CONFIRMADO' }], proximaPagina: null });
  });
  try {
    await tela.clicar('Próxima página');
    expect(tela.texto()).toContain('Velas');
    await tela.clicar('Ver detalhes');
    const painel = elemento(document, '[role="dialog"]');
    await clicar(botaoComTexto(painel, 'Estornar lançamento'));
    await preencherTexto(painel, 'Compra cancelada');
    await clicar(botaoComTexto(painel, 'Confirmar estorno'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamada?.[0]).toBe('/api/v1/financeiro/lancamentos/l1/estornar');
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('8');
    expect(new Headers(chamada?.[1]?.headers).get('Idempotency-Key')).toBeTruthy();
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ motivo: 'Compra cancelada' });
    expect(painel.textContent).toContain('Estorno registrado');
    expect(tela.texto()).toContain('Estornado');
  } finally {
    await tela.desmontar();
  }
});

it('envia a competência selecionada e volta à primeira página', async () => {
  const tela = await montarCadastro(<LancamentosPage />, ['financeiro.lancamento.ler'], () =>
    Response.json({ itens: [], proximaPagina: 2 }));
  try {
    await tela.clicar('Próxima página');
    await digitar(elemento(tela.container, 'input[type="month"]'), '2026-10');
    await assentar();
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toEqual([
      '/api/v1/financeiro/lancamentos?pagina=1',
      '/api/v1/financeiro/lancamentos?pagina=2',
      '/api/v1/financeiro/lancamentos?pagina=1&competencia=2026-10',
    ]);
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

it('abre uma pendência para o autor e atualiza a conversa com a resposta do servidor', async () => {
  let aberta = false;
  const pendencia = { id: 'p1', texto: 'Qual foi o fornecedor?', abertaEm: registro.registradoEm, resolvidaEm: null };
  const tela = await montarCadastro(<LancamentosPage />, ['financeiro.lancamento.ler', 'financeiro.lancamento.confirmar'], (caminho, requisicao) => {
    if (requisicao?.method === 'POST') {
      aberta = true;
      return new Response(null, { status: 200 });
    }
    if (caminho.endsWith('/l1')) return Response.json({
      ...registro, registradoPor: 'outro', status: 'A_CONFERIR', pendencias: aberta ? [pendencia] : [],
    });
    return Response.json({ itens: [{ ...registro, status: 'A_CONFERIR' }], proximaPagina: null });
  });
  try {
    await tela.clicar('Ver detalhes');
    const painel = elemento(document, '[role="dialog"]');
    await clicar(botaoComTexto(painel, 'Abrir pendência'));
    await preencherTexto(painel, pendencia.texto);
    await clicar(botaoComTexto(painel, 'Abrir pendência'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamada?.[0]).toBe('/api/v1/financeiro/lancamentos/l1/pendencias');
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ texto: pendencia.texto });
    expect(painel.textContent).toContain(pendencia.texto);
    expect(painel.textContent).not.toContain('Responder pendência');
  } finally {
    await tela.desmontar();
  }
});
