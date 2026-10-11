import type { TipoLancamento } from '@cdd/contracts';
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

const somar = (valor: string): number =>
  valor
    .split('+')
    .map((parcela) => parseFloat(parcela.replace(/\./g, '').replace(',', '.')) || 0)
    .reduce((a, b) => a + b, 0);

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

  const compostoBloqueia = consolida && composto;
  const bloqueado = competenciaFechada || compostoBloqueia || mesmaConta;
  const motivoBloqueio = competenciaFechada
    ? 'Julho está fechado. Um administrador pode reabrir, e o motivo fica registrado.'
    : mesmaConta
      ? 'Origem e destino precisam ser contas diferentes.'
      : compostoBloqueia
        ? 'O valor composto precisa virar um número só antes de gravar consolidado.'
        : undefined;

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
    total: somar(campos.valor),

    temGrupo: !ehTransferencia,
    temCategoria: !ehTransferencia,
    temCerimonia: !ehTransferencia,
    temContraparte: !ehTransferencia,
    temReembolso: ehSaida,
  };
}

export type RegrasDoLancamento = ReturnType<typeof regrasDoLancamento>;
