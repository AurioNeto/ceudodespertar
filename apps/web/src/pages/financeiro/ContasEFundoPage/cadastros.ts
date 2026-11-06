import { CriarConta, CriarFundo, EditarConta, EditarFundo, type Conta, type Unidade } from '@cdd/contracts';
import type { CampoDoCadastro, DefinicaoDoCadastro, OpcaoDeCadastro } from '@/pages/components/CadastroDaApi';

const nome = { nome: 'nome', rotulo: 'Nome' };
const situacao = { nome: 'ativa', rotulo: 'Situação', formato: 'booleano', inicial: 'true', opcoes: [
  { value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' },
] } as const satisfies CampoDoCadastro;

export function cadastroDeContas(unidades: readonly Unidade[], titulares: readonly OpcaoDeCadastro[], podeBuscarTitular: boolean): DefinicaoDoCadastro {
  return {
    caminho: '/financeiro/contas', singular: 'conta',
    permissaoDeCriar: 'financeiro.conta.gerenciar', permissaoDeEditar: 'financeiro.conta.gerenciar',
    criar: CriarConta, editar: EditarConta,
    campos: [
      nome,
      { nome: 'descricao', rotulo: 'Descrição', exibir: true },
      { nome: 'identificadorBancario', rotulo: 'Identificador bancário', opcional: true },
      { nome: 'unidadeId', rotulo: 'Unidade', opcional: true, oculto: unidades.length === 0, opcoes: [
        { value: '', label: 'Sem unidade' }, ...unidades.map(unidade => ({ value: unidade.id, label: unidade.nome })),
      ] },
      { nome: 'tipo', rotulo: 'Tipo de conta', inicial: 'CONTA_CORRENTE', soNaCriacao: true, exibir: true, opcoes: [
        { value: 'CONTA_CORRENTE', label: 'Conta corrente' }, { value: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
        { value: 'DINHEIRO', label: 'Dinheiro' }, { value: 'FUNDO', label: 'Fundo' },
      ] },
      { nome: 'titularidade', rotulo: 'Titularidade', inicial: 'INSTITUCIONAL', soNaCriacao: true, exibir: true, opcoes: [
        { value: 'INSTITUCIONAL', label: 'Institucional' },
        ...(podeBuscarTitular ? [{ value: 'PESSOAL_DE_TERCEIRO', label: 'Pessoal de terceiro' }] : []),
      ] },
      { nome: 'pessoaTitularId', rotulo: 'Pessoa titular', opcional: true, soNaCriacao: true,
        visivel: valores => valores['titularidade'] === 'PESSOAL_DE_TERCEIRO',
        opcoes: [{ value: '', label: 'Selecione uma pessoa' }, ...titulares] },
      situacao,
    ],
  };
}

export function cadastroDeFundos(contas: readonly Conta[]): DefinicaoDoCadastro {
  return {
    caminho: '/financeiro/fundos', singular: 'fundo',
    permissaoDeCriar: 'financeiro.fundo.gerenciar', permissaoDeEditar: 'financeiro.fundo.gerenciar',
    criar: CriarFundo, editar: EditarFundo,
    campos: [
      nome,
      { nome: 'codigoSistema', rotulo: 'Código de sistema', soNaCriacao: true, exibir: true },
      { nome: 'contaVinculadaId', rotulo: 'Conta vinculada', opcoes: [
        { value: '', label: 'Selecione uma conta' }, ...contas.map(conta => ({ value: conta.id, label: conta.nome })),
      ] },
      { nome: 'nota', rotulo: 'Nota', exibir: true },
      { nome: 'meta', rotulo: 'Meta em reais', formato: 'moeda' },
      { nome: 'categoriasPermitidas', rotulo: 'Códigos das categorias permitidas (separados por vírgula)', formato: 'lista' },
      { ...situacao, nome: 'ativo' },
    ],
  };
}
