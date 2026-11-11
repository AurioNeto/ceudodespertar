import { CadastrarPessoa, EditarPessoa } from '@cdd/contracts';
import type { DefinicaoDoCadastro } from '@/pages/components/CadastroDaApi';

export const CADASTRO_DE_PESSOAS: DefinicaoDoCadastro = {
  caminho: '/pessoas', singular: 'pessoa', paginado: true,
  permissaoDeCriar: 'pessoas.pessoa.registrar', permissaoDeEditar: 'pessoas.pessoa.editar',
  criar: CadastrarPessoa, editar: EditarPessoa,
  campos: [
    { nome: 'nome', rotulo: 'Nome' },
    { nome: 'tipo', rotulo: 'Tipo de pessoa', inicial: 'FISICA', exibir: true, opcoes: [
      { value: 'FISICA', label: 'Pessoa física' }, { value: 'JURIDICA', label: 'Pessoa jurídica' },
    ] },
    { nome: 'documento', rotulo: 'CPF ou CNPJ (só dígitos)', opcional: true },
  ],
};
