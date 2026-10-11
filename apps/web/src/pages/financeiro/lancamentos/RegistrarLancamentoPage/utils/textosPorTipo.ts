import { opcoesDeConta } from '../mocks/opcoes';
import { metaDaOpcao } from './opcao';
import type { EstadoDoFormulario, RegrasDoLancamento } from './regrasDoLancamento';

export function textosPorTipo(regras: RegrasDoLancamento, campos: EstadoDoFormulario, consolida: boolean) {
  const {
    ehTransferencia,
    ehEntrada,
    mesmaConta,
    competenciaFechada,
    bloqueado,
    composto,
    semCategoria,
    conta,
    contaDestino,
  } = regras;

  return {
    notaTipo: ehTransferencia
      ? 'Dinheiro que sai de uma conta da casa e entra em outra. Não é despesa nem receita: o total não muda, só o lugar onde o dinheiro está.'
      : ehEntrada
        ? 'Dinheiro que entrou: doação, venda da lojinha, contribuição de cerimônia.'
        : 'Dinheiro que saiu para fora da casa.',
    labelValor: ehTransferencia ? 'Quanto transferir' : ehEntrada ? 'Quanto entrou' : 'Quanto foi',
    labelDescricao: ehTransferencia ? 'Motivo da transferência' : ehEntrada ? 'De onde veio' : 'O que foi',
    placeholderDescricao: ehTransferencia
      ? 'repasse do caixa da lojinha para o Cora'
      : ehEntrada
        ? 'contribuições da cerimônia de agosto'
        : 'mercado cerimônia mãe divina',
    labelData: ehTransferencia ? 'Data da transferência' : ehEntrada ? 'Data da entrada' : 'Data do gasto',
    labelContraparte: ehEntrada ? 'De quem veio' : 'Fornecedor',
    placeholderContraparte: ehEntrada ? 'quem entregou o dinheiro' : 'quem recebeu o dinheiro',
    labelConta: ehTransferencia ? 'Conta de origem' : ehEntrada ? 'Conta de entrada' : 'Conta de saída',
    labelPagamento: ehTransferencia
      ? 'Forma da transferência'
      : ehEntrada
        ? 'Forma de recebimento'
        : 'Forma de pagamento',
    notaGrupo: ehEntrada ? 'De onde veio a entrada. Um por lançamento.' : 'Onde o gasto aconteceu. Um por lançamento.',
    notaConta: ehTransferencia ? 'De onde o dinheiro sai.' : metaDaOpcao(opcoesDeConta, campos.conta),
    notaContaDestino: mesmaConta
      ? 'Escolha uma conta diferente da origem.'
      : metaDaOpcao(opcoesDeConta, campos.contaDestino),
    notaCompetencia: competenciaFechada ? 'Veio da data do gasto — julho está fechado.' : 'Mês corrente.',
    notaBarra: bloqueado
      ? 'Enquanto isso não se resolve, dá para salvar como rascunho — nada se perde.'
      : ehTransferencia
        ? `Grava os dois lados de uma vez: saída em ${conta} e entrada em ${contaDestino}.`
        : !consolida && composto
          ? 'Grava como a conferir: o valor composto vira pendência na conferência.'
          : semCategoria
            ? 'Nada bloqueia o registro. Sem categoria, grava e marca como não classificado.'
            : consolida
              ? 'Consolidado é definitivo: depois de gravado, só estorno.'
              : 'Grava como a conferir: a tesouraria confere antes de consolidar.',
  };
}
