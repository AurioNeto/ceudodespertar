import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { botaoComTexto, clicar, digitar, elemento, todos } from '@/testes/montagem';
import { assentar } from '@/testes/sessaoDeTeste';
import { VerificacaoLotePage } from './VerificacaoLotePage';

it('bloqueia itens incompletos e confirma os aptos com If-Match', async () => {
  const item = { id: 'l1', tipo: 'SAIDA', valor: 2500, motivo: 'Velas', versao: 7, faltas: [] };
  let confirmado = false;
  const tela = await montarCadastro(<VerificacaoLotePage />, ['financeiro.lancamento.confirmar'], (_caminho, requisicao) => {
    if (requisicao?.method === 'POST') {
      confirmado = true;
      return Response.json({ ...item, status: 'CONFIRMADO' });
    }
    return Response.json({
      itens: [...(confirmado ? [] : [item]), { ...item, id: 'l2', motivo: 'Limpeza', faltas: ['CONTA'] }],
      proximaPagina: null,
    });
  });
  try {
    const botoes = todos<HTMLButtonElement>(tela.container, 'article button');
    expect(botoes.map(botao => botao.disabled)).toEqual([false, true]);
    expect(tela.texto()).toContain('Falta conferir: Conta');
    await tela.clicar('Confirmar');
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamada?.[0]).toBe('/api/v1/financeiro/lancamentos/l1/confirmar');
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('7');
    expect(tela.texto()).toContain('Lançamento confirmado');
    expect(tela.texto()).not.toContain('Velas');
  } finally {
    await tela.desmontar();
  }
});

it('salva ajustes usando a versão do detalhe e preserva os vínculos existentes', async () => {
  const pessoaId = 'a3e292a4-4e30-435d-8cd1-304c058adf64';
  const lancamento = { id: 'l1', motivo: 'Velas', natureza: 'DESPESA', valor: 2500, pessoaId, versao: 9, status: 'A_CONFERIR', etiquetas: [] };
  const tela = await montarCadastro(<VerificacaoLotePage />, ['financeiro.lancamento.confirmar', 'financeiro.lancamento.ler'], (caminho, requisicao) => {
    if (requisicao?.method === 'PUT') return Response.json(lancamento);
    if (caminho.endsWith('/l1')) return Response.json(lancamento);
    return Response.json({ itens: [{ ...lancamento, tipo: 'SAIDA', versao: 7, faltas: ['CONTA'] }], proximaPagina: null });
  });
  try {
    await tela.clicar('Revisar');
    const painel = elemento(document, '[role="dialog"]');
    await digitar(elemento(painel, '[name="motivo"]'), 'Velas para a cerimônia');
    await clicar(botaoComTexto(painel, 'Salvar ajustes'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'PUT');
    expect(chamada?.[0]).toBe('/api/v1/financeiro/lancamentos/l1');
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('9');
    expect(JSON.parse(String(chamada?.[1]?.body))).toMatchObject({ pessoaId, motivo: 'Velas para a cerimônia' });
  } finally {
    await tela.desmontar();
  }
});

it('recarrega o detalhe antes de confirmar e atualiza a fila', async () => {
  const item = { id: 't1', tipo: 'TRANSFERENCIA', valor: 1000, motivo: 'Reposição', versao: 5,
    faltas: [], status: 'A_CONFERIR', registradoEm: '2026-11-11T12:00:00Z' };
  let confirmou = false;
  let leituras = 0;
  const tela = await montarCadastro(<VerificacaoLotePage />, ['financeiro.lancamento.confirmar', 'financeiro.conta.ler'], (caminho, requisicao) => {
    if (requisicao?.method === 'POST') {
      confirmou = true;
      return new Response(null, { status: 200 });
    }
    if (caminho.endsWith('/transferencias/t1')) {
      leituras += 1;
      if (leituras === 1) return Response.json({ erro: 'ERRO_INTERNO' }, { status: 500 });
      return Response.json({
        ...item, versao: 7, finalidade: 'MOVIMENTACAO_SIMPLES', registradoPor: 'outro', status: confirmou ? 'CONFIRMADO' : 'A_CONFERIR',
      });
    }
    return Response.json({ itens: confirmou ? [] : [item], proximaPagina: null });
  });
  try {
    await tela.clicar('Revisar transferência');
    const painel = elemento(document, '[role="dialog"]');
    expect(painel.textContent).not.toContain('Confirmar transferência');
    expect(painel.textContent).not.toContain('Descartar transferência');
    await clicar(botaoComTexto(painel, 'Recarregar transferência'));
    await assentar();
    await clicar(botaoComTexto(painel, 'Confirmar transferência'));
    await clicar(botaoComTexto(painel, 'Confirmar movimento'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamada?.[0]).toBe('/api/v1/financeiro/transferencias/t1/confirmar');
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('7');
    expect(painel.textContent).toContain('Transferência confirmada');
    expect(tela.container.querySelector('article')).toBeNull();
  } finally {
    await tela.desmontar();
  }
});

it('pede nova revisão após conflito de versão para quem confere apenas pela fila', async () => {
  const item = { id: 't1', tipo: 'TRANSFERENCIA', valor: 1000, motivo: 'Reposição', versao: 5,
    faltas: [], status: 'A_CONFERIR', registradoEm: '2026-11-11T12:00:00Z' };
  const versoesEnviadas: (string | null)[] = [];
  const tela = await montarCadastro(<VerificacaoLotePage />, ['financeiro.lancamento.confirmar'], (caminho, requisicao) => {
    if (caminho.endsWith('/transferencias/t1/confirmar')) {
      versoesEnviadas.push(new Headers(requisicao?.headers).get('If-Match'));
      return versoesEnviadas.length === 1
        ? Response.json({ erro: 'VERSAO_DESATUALIZADA' }, { status: 409 })
        : new Response(null, { status: 200 });
    }
    return Response.json({ itens: versoesEnviadas.length < 2 ? [{ ...item, versao: versoesEnviadas.length ? 6 : 5 }] : [], proximaPagina: null });
  });
  try {
    await tela.clicar('Revisar transferência');
    const painel = elemento(document, '[role="dialog"]');
    await clicar(botaoComTexto(painel, 'Confirmar transferência'));
    await clicar(botaoComTexto(painel, 'Confirmar movimento'));
    await assentar();
    expect(painel.textContent).toContain('Feche e abra o detalhe atualizado');
    expect(painel.textContent).not.toContain('Confirmar movimento');
    await clicar(botaoComTexto(painel, 'Fechar'));
    await tela.clicar('Revisar transferência');
    const atualizado = elemento(document, '[role="dialog"]');
    await clicar(botaoComTexto(atualizado, 'Confirmar transferência'));
    await clicar(botaoComTexto(atualizado, 'Confirmar movimento'));
    await assentar();
    expect(versoesEnviadas).toEqual(['5', '6']);
    expect(atualizado.textContent).toContain('Transferência confirmada');
    expect(tela.fetch.mock.calls.some(([caminho]) => String(caminho).endsWith('/transferencias/t1'))).toBe(false);
  } finally {
    await tela.desmontar();
  }
});
