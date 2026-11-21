import type { TipoLancamento } from '@cdd/contracts';
import { lerSoma, lerValorDigitado } from '@/lib/numero';
import { competenciasFechadas, opcoesDeConta } from '../mocks/opcoes';
import { rotuloDaOpcao } from './opcao';

export interface EstadoDoFormulario {
  valor: string;
  descricao: string;
  data: string;
  contraparte: string;
  competencia: string;
  conta: string;
  contaDestino: string;
  categorias: readonly string[];
  grupo: string;
  unidade: string;
  pagamento: string;
  cerimonia: string;
  anexo: string | null;
  reembolso: boolean;
  pessoa: string;
}

export const MENSAGEM_DE_VALOR_ZERADO = 'Informe um valor maior que zero.';
export const MENSAGEM_DE_PARCELA_NAO_POSITIVA = 'Cada parcela da soma precisa ser maior que zero.';

const temParcelaNaoPositiva = (valor: string): boolean =>
  valor
    .split('+')
    .map((parcela) => parcela.trim())
    .some((parcela) => parcela !== '' && lerValorDigitado(parcela) <= 0);

export function regrasDoLancamento(tipo: TipoLancamento, campos: EstadoDoFormulario, consolida: boolean) {
  const ehTransferencia = tipo === 'TRANSFERENCIA';
  const ehEntrada = tipo === 'ENTRADA';
  const ehSaida = tipo === 'SAIDA';

  const composto = campos.valor.includes('+');
  const mesmaConta = ehTransferencia && campos.conta === campos.contaDestino;
  const semCategoria = campos.categorias.length === 0 && !ehTransferencia;
  const competenciaFechada = competenciasFechadas.includes(campos.competencia);

  const conta = rotuloDaOpcao(opcoesDeConta, campos.conta);
  const contaDestino = rotuloDaOpcao(opcoesDeConta, campos.contaDestino);

  const total = lerSoma(campos.valor);
  const parcelaNaoPositiva = composto && temParcelaNaoPositiva(campos.valor);
  const valorInvalido = total <= 0 || parcelaNaoPositiva;
  const erroDoValor = parcelaNaoPositiva
    ? MENSAGEM_DE_PARCELA_NAO_POSITIVA
    : valorInvalido
      ? MENSAGEM_DE_VALOR_ZERADO
      : undefined;

  const compostoBloqueia = consolida && composto;
  const bloqueado = competenciaFechada || compostoBloqueia || mesmaConta || valorInvalido;
  const motivoBloqueio = competenciaFechada
    ? 'Julho está fechado. Um administrador pode reabrir, e o motivo fica registrado.'
    : mesmaConta
      ? 'Origem e destino precisam ser contas diferentes.'
      : compostoBloqueia
        ? 'O valor composto precisa virar um número só antes de gravar consolidado.'
        : erroDoValor;

  return {
    ehTransferencia,
    ehEntrada,
    ehSaida,
    composto,
    mesmaConta,
    semCategoria,
    competenciaFechada,
    conta,
    contaDestino,
    bloqueado,
    motivoBloqueio,
    total,
    valorInvalido,
    erroDoValor,

    temGrupo: !ehTransferencia,
    temCategoria: !ehTransferencia,
    temCerimonia: !ehTransferencia,
    temContraparte: !ehTransferencia,
    temReembolso: ehSaida,
  };
}

export type RegrasDoLancamento = ReturnType<typeof regrasDoLancamento>;
