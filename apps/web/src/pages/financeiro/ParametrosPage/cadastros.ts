import {
  CriarCategoria, CriarGrupoDeCusto, CriarUnidade, EditarCategoria, EditarGrupoDeCusto, EditarUnidade,
  type Unidade,
} from '@cdd/contracts';
import type { DefinicaoDoCadastro } from '@/pages/components/CadastroDaApi';

const permissoes = {
  permissaoDeCriar: 'financeiro.plano_contas.gerenciar',
  permissaoDeEditar: 'financeiro.plano_contas.gerenciar',
} as const;
const nome = { nome: 'nome', rotulo: 'Nome' };
const codigo = { nome: 'codigoSistema', rotulo: 'Código de sistema', soNaCriacao: true, exibir: true };
const situacoes = [{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }];
const ativa = { nome: 'ativa', rotulo: 'Situação', formato: 'booleano', soNaEdicao: true, opcoes: situacoes } as const;

export const unidades: DefinicaoDoCadastro = {
  ...permissoes, caminho: '/financeiro/unidades', singular: 'unidade', criar: CriarUnidade, editar: EditarUnidade,
  campos: [nome, codigo,
    { nome: 'regime', rotulo: 'Regime', inicial: 'CONTRIBUICAO', exibir: true, opcoes: [
      { value: 'CONTRIBUICAO', label: 'Contribuição' }, { value: 'COMERCIAL', label: 'Comercial' },
    ] },
    { nome: 'tetoAnual', rotulo: 'Teto anual em reais', formato: 'moeda', visivel: valores => valores['regime'] === 'COMERCIAL' },
    ativa,
  ],
};

export const grupos: DefinicaoDoCadastro = {
  ...permissoes, caminho: '/financeiro/grupos-de-custo', singular: 'grupo de custo',
  criar: CriarGrupoDeCusto, editar: EditarGrupoDeCusto,
  campos: [nome, codigo, { ...ativa, nome: 'ativo' }],
};

export function categorias(unidadesDaCasa: readonly Unidade[]): DefinicaoDoCadastro {
  return {
    ...permissoes, caminho: '/financeiro/categorias', singular: 'categoria', criar: CriarCategoria, editar: EditarCategoria,
    campos: [nome, codigo,
      { nome: 'natureza', rotulo: 'Natureza', inicial: 'DESPESA', soNaCriacao: true, exibir: true, opcoes: [
        { value: 'RECEITA', label: 'Receita' }, { value: 'DESPESA', label: 'Despesa' },
      ] },
      { nome: 'tipo', rotulo: 'Tipo', inicial: 'OPERACIONAL', soNaCriacao: true, opcoes: [
        { value: 'OPERACIONAL', label: 'Operacional' }, { value: 'INVESTIMENTO', label: 'Investimento' },
        { value: 'MANUTENCAO', label: 'Manutenção' }, { value: 'PATRIMONIAL', label: 'Patrimonial' },
      ] },
      { nome: 'regimesPermitidos', rotulo: 'Regimes permitidos', formato: 'lista', inicial: 'CONTRIBUICAO', opcoes: [
        { value: 'CONTRIBUICAO', label: 'Contribuição' }, { value: 'COMERCIAL', label: 'Comercial' },
        { value: 'COMERCIAL,CONTRIBUICAO', label: 'Ambos' },
      ] },
      { nome: 'linhaRelatorio', rotulo: 'Linha de relatório', exibir: true },
      { nome: 'unidadePadraoId', rotulo: 'Unidade padrão', opcional: true, opcoes: [
        { value: '', label: 'Sem unidade padrão' }, ...unidadesDaCasa.map(u => ({ value: u.id, label: u.nome })),
      ] },
      ativa,
    ],
  };
}
