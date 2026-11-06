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
