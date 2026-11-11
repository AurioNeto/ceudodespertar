import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { botaoComTexto, clicar, digitar, elemento, escolherOpcao } from '@/testes/montagem';
import { assentar } from '@/testes/sessaoDeTeste';
import { ContasEFundoPage } from './ContasEFundoPage';

it('consulta saldos e abre o cadastro sem buscar dados pessoais sem permissão', async () => {
  const tela = await montarCadastro(<ContasEFundoPage />, ['financeiro.conta.ler'], caminho => {
    if (caminho.endsWith('/contas/saldos')) return Response.json([{ id: 'c1', nome: 'Caixa', saldo: 123456 }]);
    if (caminho.endsWith('/fundos/saldos')) return Response.json([{ id: 'f1', nome: 'Reserva', valorReservado: 5000 }]);
    return Response.json({ itens: [{ id: 'c1', nome: 'Caixa', ativa: true }] });
  });
  try {
    expect(tela.texto()).toContain('1.234,56');
    expect(tela.texto()).toContain('50,00');
    await tela.clicar('Contas');
    expect(tela.texto()).toContain('Caixa');
    expect(tela.texto()).not.toContain('Adicionar conta');
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toEqual([
      '/api/v1/financeiro/contas/saldos', '/api/v1/financeiro/fundos/saldos', '/api/v1/financeiro/contas',
    ]);
  } finally {
    await tela.desmontar();
  }
});

it('envia o fundo com a conta escolhida, meta em centavos e códigos de categoria', async () => {
  const id = '7565bdeb-7c4a-477d-9e12-44aeb87a1e96';
  const tela = await montarCadastro(<ContasEFundoPage />, ['financeiro.conta.ler', 'financeiro.fundo.gerenciar'], (caminho, requisicao) => {
    if (requisicao?.method === 'POST') return Response.json({}, { status: 201 });
    if (caminho.endsWith('/contas')) return Response.json({ itens: [{ id, nome: 'Caixa', ativa: true }] });
    if (caminho.endsWith('/saldos')) return Response.json([]);
    return Response.json({ itens: [] });
  });
  try {
    await tela.clicar('Fundos');
    await tela.clicar('Adicionar fundo');
    const painel = elemento(document, '[role="dialog"]');
    expect(painel.textContent).not.toContain('Situação');
    const [nome, codigo, , meta, categorias] = painel.querySelectorAll('input');
    if (!nome || !codigo || !meta || !categorias) throw new Error('Campos esperados no cadastro');
    await digitar(nome, 'Reserva de eventos');
    await digitar(codigo, 'RESERVA_EVENTOS');
    await escolherOpcao(elemento<HTMLSelectElement>(painel, 'select'), id);
    await digitar(meta, '123,45');
    await digitar(categorias, 'EVENTOS, INFRA');
    await clicar(botaoComTexto(painel, 'Salvar'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'POST');
    expect(chamada?.[0]).toBe('/api/v1/financeiro/fundos');
    expect(JSON.parse(String(chamada?.[1]?.body))).toMatchObject({
      nome: 'Reserva de eventos', codigoSistema: 'RESERVA_EVENTOS', contaVinculadaId: id, meta: 12345,
      categoriasPermitidas: ['EVENTOS', 'INFRA'],
    });
  } finally {
    await tela.desmontar();
  }
});

it.each(['sem permissão', 'com falha', 'disponível'])('mantém a unidade na edição até a remoção explícita (consulta %s)', async estadoDaConsulta => {
  const id = '7565bdeb-7c4a-477d-9e12-44aeb87a1e96';
  const unidadeId = '236e0a6d-e1c9-4091-a025-37d2a1773ffb';
  const permissoes = ['financeiro.conta.ler', 'financeiro.conta.gerenciar'] as const;
  const tela = await montarCadastro(<ContasEFundoPage />,
    estadoDaConsulta === 'sem permissão' ? [...permissoes] : [...permissoes, 'financeiro.plano_contas.ler'],
    (caminho, requisicao) => {
      if (requisicao?.method === 'PUT') return Response.json({});
      if (caminho.endsWith('/contas')) {
        return Response.json({ itens: [{ id, nome: 'Caixa', ativa: true, unidadeId, versao: 1 }] });
      }
      if (caminho.endsWith('/unidades')) {
        return estadoDaConsulta === 'com falha'
          ? Response.json({}, { status: 500 })
          : Response.json({ itens: [{ id: unidadeId, nome: 'Matriz' }] });
      }
      return Response.json([]);
    });
  try {
    await tela.clicar('Contas');
    await tela.clicar('Editar');
    const painel = elemento(document, '[role="dialog"]');
    expect(painel.textContent).toContain('Situação');
    const campoUnidade = [...painel.querySelectorAll('select')].find(campo => campo.labels?.[0]?.textContent === 'Unidade');
    if (estadoDaConsulta === 'disponível') {
      if (!campoUnidade) throw new Error('Seletor de unidade esperado');
      expect(campoUnidade.value).toBe(unidadeId);
      await escolherOpcao(campoUnidade, '');
    } else {
      expect(campoUnidade).toBeUndefined();
    }
    await digitar(elemento<HTMLInputElement>(painel, 'input'), 'Caixa principal');
    await clicar(botaoComTexto(painel, 'Salvar'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'PUT');
    expect(chamada?.[0]).toBe(`/api/v1/financeiro/contas/${id}`);
    expect(JSON.parse(String(chamada?.[1]?.body))).toMatchObject({
      nome: 'Caixa principal', unidadeId: estadoDaConsulta === 'disponível' ? null : unidadeId,
    });
  } finally {
    await tela.desmontar();
  }
});
