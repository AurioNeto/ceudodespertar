import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { digitar, elemento } from '@/testes/montagem';
import { RelatoriosPage } from './RelatoriosPage';

it('consulta a DRE por competência e mostra apenas os relatórios permitidos', async () => {
  const tela = await montarCadastro(<RelatoriosPage />, ['financeiro.dre.ler'], () =>
    Response.json({ receitas: 1050, despesas: 500, resultado: 550, linhas: [
      { unidadeId: 'u1', competencia: '2026-10', linhaRelatorio: 'Contribuições', natureza: 'RECEITA', tipo: 'OPERACIONAL', valor: 1050 },
    ] }));
  try {
    expect(tela.texto()).toContain('Contribuições');
    expect(tela.texto()).toContain('u1 · 10/2026 · Operacional');
    expect(tela.texto()).not.toContain('Fluxo de caixa');
    await digitar(elemento(tela.container, 'input[type="month"]'), '2026-10');
    await tela.clicar('Aplicar filtros');
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toContain('/api/v1/financeiro/relatorios/dre?competencia=2026-10');
    expect(tela.fetch.mock.calls.every(([caminho]) => String(caminho).includes('/relatorios/dre'))).toBe(true);
  } finally {
    await tela.desmontar();
  }
});

it('distingue linhas com o mesmo nome por unidade, competência e tipo de categoria', async () => {
  const tela = await montarCadastro(<RelatoriosPage />, ['financeiro.dre.ler', 'financeiro.plano_contas.ler'], caminho => {
    if (caminho.endsWith('/unidades')) return Response.json({ itens: [{ id: 'u1', nome: 'Sede' }] });
    return Response.json({ receitas: 0, despesas: 750, resultado: -750, linhas: [
      { unidadeId: 'u1', competencia: '2026-10', linhaRelatorio: 'Transporte', natureza: 'DESPESA', tipo: 'OPERACIONAL', valor: 500 },
      { unidadeId: null, competencia: '2026-10', linhaRelatorio: 'Transporte', natureza: 'DESPESA', tipo: 'INVESTIMENTO', valor: 250 },
    ] });
  });
  try {
    expect(tela.texto()).toContain('Transporte · Sede · 10/2026 · Operacional · Despesa · R$ 5,00');
    expect(tela.texto()).toContain('Transporte · Sem unidade · 10/2026 · Investimento · Despesa · R$ 2,50');
  } finally {
    await tela.desmontar();
  }
});

it('consulta fluxo de caixa com as datas escolhidas e mostra o líquido das transferências', async () => {
  const tela = await montarCadastro(<RelatoriosPage />, ['financeiro.fluxo_caixa.ler'], () =>
    Response.json({ entradas: 1000, saidas: 700, transferenciasLiquidas: -200, liquido: 100, dias: [] }));
  try {
    await digitar(elemento(tela.container, '[type="date"]'), '2026-10-01');
    const ate = tela.container.querySelectorAll<HTMLInputElement>('[type="date"]')[1];
    if (!ate) throw new Error('Data final ausente');
    await digitar(ate, '2026-10-31');
    await tela.clicar('Aplicar filtros');
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toContain('/api/v1/financeiro/relatorios/fluxo-de-caixa?de=2026-10-01&ate=2026-10-31');
    expect(tela.texto()).toContain('Transferências líquidas');
    expect(tela.texto()).toContain('2,00');
  } finally {
    await tela.desmontar();
  }
});

it('abre o resultado detalhado da cerimônia', async () => {
  const evento = { id: 'ev1', nome: 'Encontro', dataInicio: '2026-10-01' };
  const tela = await montarCadastro(<RelatoriosPage />, ['financeiro.resultado_evento.ler'], caminho =>
    Response.json(caminho.includes('/cerimonias/ev1')
      ? { evento, receitas: 3000, despesas: 2000, resultado: 1000,
        linhas: [{ unidadeId: 'u2', competencia: '2026-10', linhaRelatorio: 'Transporte', natureza: 'DESPESA', tipo: 'MANUTENCAO', valor: 2000 }] }
      : { itens: [{ evento, resultado: 1000 }], proximaPagina: null }));
  try {
    await tela.clicar('Encontro');
    expect(elemento(document, '[role="dialog"]').textContent).toContain('Transporte · u2 · 10/2026 · Manutenção');
    expect(tela.fetch.mock.calls.some(([caminho]) => String(caminho).includes('/relatorios/cerimonias/ev1?'))).toBe(true);
  } finally {
    await tela.desmontar();
  }
});
