import { act } from 'react';
import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { digitar, elemento } from '@/testes/montagem';
import { RegistrarLancamentoPage } from './RegistrarLancamentoPage';

it('registra uma saída com chave de idempotência e anexa o comprovante com a versão devolvida', async () => {
  const registro = { id: 'l1', motivo: 'Compra de velas', valor: 4550, versao: 1 };
  const tela = await montarCadastro(<RegistrarLancamentoPage />, ['financeiro.lancamento.registrar'], (_caminho, requisicao) =>
    Response.json(registro, { status: requisicao?.method === 'POST' ? 201 : 200 }));
  try {
    await digitar(elemento(tela.container, 'input[aria-label="Valor"]'), '40+5,50');
    await digitar(elemento(tela.container, '[name="motivo"]'), registro.motivo);
    await tela.clicar('Registrar lançamento');
    const chamada = tela.fetch.mock.calls[0];
    expect(chamada?.[0]).toBe('/api/v1/financeiro/lancamentos');
    expect(new Headers(chamada?.[1]?.headers).get('Idempotency-Key')).toBeTruthy();
    expect(JSON.parse(String(chamada?.[1]?.body))).toMatchObject({ natureza: 'DESPESA', valor: 4550, motivo: registro.motivo });
    expect(tela.texto()).toContain('Status: A conferir');
    const arquivo = new File(['comprovante'], 'recibo.pdf', { type: 'application/pdf' });
    const input = elemento(tela.container, 'input[type="file"]');
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [arquivo] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await tela.clicar('Anexar comprovante');
    const anexo = tela.fetch.mock.calls[1];
    expect(anexo?.[0]).toBe('/api/v1/financeiro/lancamentos/l1/comprovante');
    const cabecalhos = new Headers(anexo?.[1]?.headers);
    expect(cabecalhos.get('If-Match')).toBe('1');
    expect(cabecalhos.get('Content-Type')).toBeNull();
    const corpo = anexo?.[1]?.body;
    expect(corpo instanceof FormData && corpo.get('arquivo')).toBe(arquivo);
    expect(tela.texto()).toContain('Comprovante anexado');
  } finally {
    await tela.desmontar();
  }
});

it('permite anexar depois de reenviar um registro cuja resposta se perdeu', async () => {
  const id = '0199b95e-5107-7000-8000-000000000001';
  const localizacao = `/api/v1/financeiro/lancamentos/${id}`;
  let primeiroEnvio = true;
  const tela = await montarCadastro(<RegistrarLancamentoPage />, ['financeiro.lancamento.registrar'], (_caminho, requisicao) => {
    if (requisicao?.method !== 'POST') return new Response(null, { status: 200 });
    if (primeiroEnvio) {
      primeiroEnvio = false;
      throw new TypeError('Falha de rede');
    }
    return new Response(null, { status: 201, headers: { Location: localizacao } });
  });
  try {
    await digitar(elemento(tela.container, 'input[aria-label="Valor"]'), '45,50');
    await digitar(elemento(tela.container, '[name="motivo"]'), 'Compra de velas');
    await tela.clicar('Registrar lançamento');
    expect(tela.texto()).toContain('Não foi possível concluir a operação');
    await tela.clicar('Registrar lançamento');

    const chaves = tela.fetch.mock.calls.map(([, requisicao]) => new Headers(requisicao?.headers).get('Idempotency-Key'));
    expect(chaves[0]).toBeTruthy();
    expect(chaves).toEqual([chaves[0], chaves[0]]);
    expect(tela.texto()).toContain('Compra de velas');

    const input = elemento(tela.container, 'input[type="file"]');
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [new File(['comprovante'], 'recibo.pdf', { type: 'application/pdf' })] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await tela.clicar('Anexar comprovante');
    const anexo = tela.fetch.mock.calls[2];
    expect(anexo?.[0]).toBe(`${localizacao}/comprovante`);
    expect(new Headers(anexo?.[1]?.headers).get('If-Match')).toBe('1');
    expect(tela.texto()).toContain('Comprovante anexado');
  } finally {
    await tela.desmontar();
  }
});
