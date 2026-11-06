import { expect, it } from 'vitest';
import { CriarGrupoDeCusto, EditarGrupoDeCusto } from '@cdd/contracts';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { CadastroDaApi } from './CadastroDaApi';

it('distingue falha de consulta de cadastro vazio e permite tentar novamente', async () => {
  let primeira = true;
  const tela = await montarCadastro(<CadastroDaApi definicao={{
    caminho: '/financeiro/grupos-de-custo', singular: 'grupo de custo', campos: [],
    permissaoDeCriar: 'financeiro.plano_contas.gerenciar', permissaoDeEditar: 'financeiro.plano_contas.gerenciar',
    criar: CriarGrupoDeCusto, editar: EditarGrupoDeCusto,
  }} />, ['financeiro.plano_contas.ler'], () => {
    if (!primeira) return Response.json({ itens: [] });
    primeira = false;
    return Response.json({}, { status: 500 });
  });
  try {
    expect(tela.texto()).toContain('Não foi possível carregar o cadastro');
    expect(tela.texto()).not.toContain('Nenhum registro encontrado');
    await tela.clicar('Tentar novamente');
    expect(tela.texto()).toContain('Nenhum registro encontrado');
  } finally {
    await tela.desmontar();
  }
});
