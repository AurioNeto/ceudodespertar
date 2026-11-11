import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { digitar, elemento } from '@/testes/montagem';
import { RelatoriosPage } from './RelatoriosPage';

it('consulta a DRE por competência e mostra apenas os relatórios permitidos', async () => {
  const tela = await montarCadastro(<RelatoriosPage />, ['financeiro.dre.ler'], () =>
    Response.json({ receitas: 1050, despesas: 500, resultado: 550, linhas: [
      { linhaRelatorio: 'Contribuições', natureza: 'RECEITA', valor: 1050 },
    ] }));
  try {
    expect(tela.texto()).toContain('Contribuições');
    expect(tela.texto()).not.toContain('Fluxo de caixa');
    await digitar(elemento(tela.container, 'input[type="month"]'), '2026-10');
    await tela.clicar('Aplicar filtros');
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toContain('/api/v1/financeiro/relatorios/dre?competencia=2026-10');
    expect(tela.fetch.mock.calls.every(([caminho]) => String(caminho).includes('/relatorios/dre'))).toBe(true);
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
        linhas: [{ linhaRelatorio: 'Transporte', natureza: 'DESPESA', valor: 2000 }] }
      : { itens: [{ evento, resultado: 1000 }], proximaPagina: null }));
  try {
    await tela.clicar('Encontro');
    expect(elemento(document, '[role="dialog"]').textContent).toContain('Transporte');
    expect(tela.fetch.mock.calls.some(([caminho]) => String(caminho).includes('/relatorios/cerimonias/ev1?'))).toBe(true);
  } finally {
    await tela.desmontar();
  }
});
