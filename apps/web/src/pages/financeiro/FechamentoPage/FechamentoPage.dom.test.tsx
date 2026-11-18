import { act } from 'react';
import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { botaoComTexto, clicar, digitar, elemento, escolherOpcao } from '@/testes/montagem';
import { assentar, type TelaMontada } from '@/testes/sessaoDeTeste';
import { FechamentoPage } from './FechamentoPage';

const unidadeId = 'd6e9fe82-153f-4dcb-b65d-6c9bda9c3e51';
const rota = `/api/v1/financeiro/periodos/${unidadeId}/2026-10`;
const fechado = { id: 'p1', fechado: true, versao: 1, hash: 'hash-gravado', reaberturas: [] };
const aindaNaoCriado = () => Response.json({
  erro: 'RECURSO_NAO_ENCONTRADO', detalhes: { periodoAindaNaoCriado: true },
}, { status: 404 });

async function consultar(tela: TelaMontada) {
  const unidade = tela.container.querySelector<HTMLSelectElement>('select');
  if (unidade) await escolherOpcao(unidade, unidadeId);
  else await digitar(elemento(tela.container, 'input[type="text"]'), unidadeId);
  await digitar(elemento(tela.container, 'input[type="month"]'), '2026-10');
  await tela.clicar('Consultar período');
}

it('fecha pela primeira vez com If-Match zero e verifica a integridade', async () => {
  let gravado = false;
  const tela = await montarCadastro(<FechamentoPage />, ['financeiro.periodo.fechar', 'financeiro.plano_contas.ler'], (caminho, requisicao) => {
    if (caminho.endsWith('/unidades')) return Response.json({ itens: [{ id: unidadeId, nome: 'Sede' }] });
    if (caminho.endsWith('/integridade')) return Response.json({ integro: true });
    if (requisicao?.method === 'POST') {
      gravado = true;
      return new Response(null, { status: 200 });
    }
    return gravado ? Response.json(fechado) : aindaNaoCriado();
  });
  try {
    await consultar(tela);
    await tela.clicar('Fechar período');
    await clicar(botaoComTexto(elemento(document, '[role="dialog"]'), 'Confirmar fechamento'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamada?.[0]).toBe(`${rota}/fechar`);
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('0');
    expect(new Headers(chamada?.[1]?.headers).get('Idempotency-Key')).toBeTruthy();
    expect(tela.texto()).toContain('Período fechado');
    await tela.clicar('Verificar integridade');
    expect(tela.texto()).toContain('O hash confere');
  } finally {
    await tela.desmontar();
  }
});

it('reabre com o motivo validado e mostra o histórico devolvido pela API', async () => {
  let reaberto = false;
  const motivo = 'Ajuste de conciliação';
  const tela = await montarCadastro(<FechamentoPage />, ['financeiro.periodo.reabrir'], (_caminho, requisicao) => {
    if (requisicao?.method === 'POST') reaberto = true;
    return Response.json(reaberto ? { ...fechado, fechado: false, versao: 2, hash: null,
      reaberturas: [{ motivo, reabertoEm: '2026-11-11T15:00:00Z', hashAnterior: fechado.hash }],
    } : fechado);
  });
  try {
    await consultar(tela);
    await tela.clicar('Reabrir período');
    const painel = elemento(document, '[role="dialog"]');
    const confirmar = botaoComTexto(painel, 'Confirmar reabertura');
    await clicar(confirmar);
    expect(painel.textContent).toContain('Informe um motivo');
    const campo = elemento<HTMLTextAreaElement>(painel, 'textarea');
    const definir = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    await act(async () => {
      definir?.call(campo, motivo);
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clicar(confirmar);
    await assentar();
    const chamadas = tela.fetch.mock.calls.filter(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamadas).toHaveLength(1);
    const chamada = chamadas[0];
    expect(chamada?.[0]).toBe(`${rota}/reabrir`);
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('1');
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ motivo });
    expect(tela.texto()).toContain(motivo);
    expect(tela.texto()).toContain('Histórico de reaberturas');
    expect(tela.texto()).not.toContain('Fechar período');
  } finally {
    await tela.desmontar();
  }
});

it('mostra o bloqueio retornado pela API e mantém o período aberto', async () => {
  const tela = await montarCadastro(<FechamentoPage />, ['financeiro.periodo.fechar'], (_caminho, requisicao) =>
    requisicao?.method === 'POST'
      ? Response.json({ erro: 'PERIODO_COM_PENDENCIAS', detalhes: { quantidade: 3 } }, { status: 409 })
      : aindaNaoCriado());
  try {
    await consultar(tela);
    await tela.clicar('Fechar período');
    const painel = elemento(document, '[role="dialog"]');
    await clicar(botaoComTexto(painel, 'Confirmar fechamento'));
    await assentar();
    expect(painel.textContent).toContain('Pendências: 3');
    expect(tela.texto()).toContain('Aberto');
  } finally {
    await tela.desmontar();
  }
});

it('identificador desconhecido não é tratado como período aberto', async () => {
  const tela = await montarCadastro(<FechamentoPage />, ['financeiro.periodo.fechar'], () =>
    Response.json({ erro: 'RECURSO_NAO_ENCONTRADO' }, { status: 404 }));
  try {
    await consultar(tela);
    expect(tela.texto()).toContain('Unidade não encontrada');
    expect(tela.texto()).not.toContain('Aberto');
    expect(tela.texto()).not.toContain('Fechar período');
  } finally {
    await tela.desmontar();
  }
});
