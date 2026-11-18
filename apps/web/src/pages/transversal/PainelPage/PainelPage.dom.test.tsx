import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { PainelPage } from './PainelPage';

it('mostra apenas os blocos permitidos e consulta seus dados reais', async () => {
  const tela = await montarCadastro(<PainelPage />, ['financeiro.conta.ler', 'financeiro.lancamento.confirmar'], caminho =>
    Response.json(caminho.includes('/contas/saldos')
      ? [{ id: 'c1', nome: 'Caixa institucional', saldo: 50000 }]
      : { itens: [{ id: 'm1', motivo: 'Compra de material', valor: 1200 }], proximaPagina: 2 }));
  try {
    expect(tela.texto()).toContain('Caixa institucional');
    expect(tela.texto()).toContain('500,00');
    expect(tela.texto()).toContain('Compra de material');
    expect(tela.texto()).toContain('Veja os demais');
    expect(tela.texto()).not.toContain('Resultado da competência');
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toEqual([
      '/api/v1/financeiro/contas/saldos', '/api/v1/financeiro/fila-conferencia?limite=5',
    ]);
  } finally {
    await tela.desmontar();
  }
});

it('continua acessível para quem não tem permissão de leitura financeira', async () => {
  const tela = await montarCadastro(<PainelPage />, [], () => Response.json({}));
  try {
    expect(tela.texto()).toContain('Nenhum resumo financeiro disponível');
    expect(tela.fetch).not.toHaveBeenCalled();
  } finally {
    await tela.desmontar();
  }
});
