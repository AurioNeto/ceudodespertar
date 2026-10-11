import type { OpcaoDeRefeicao, Refeicao } from '@cdd/contracts';
import { lerValorDigitado } from '@/lib/numero';

export interface EscolhasDaInscricao {
  valor: string;
  isento: boolean;
  valorDiaria: number;
  dias: number;
  refeicoes: readonly Refeicao[];
  refeicoesDoEvento: readonly OpcaoDeRefeicao[];
}

export interface ValorDaInscricao {
  contribuicao: number;
  custoHospedagem: number;
  custoRefeicoes: number;
  total: number;
  semValor: boolean;
}

export const contribuicaoDigitada = (valor: string): number => Math.round(lerValorDigitado(valor) * 100) || 0;

export function valorDaInscricao({
  valor,
  isento,
  valorDiaria,
  dias,
  refeicoes,
  refeicoesDoEvento,
}: EscolhasDaInscricao): ValorDaInscricao {
  const contribuicao = isento ? 0 : contribuicaoDigitada(valor);
  const custoHospedagem = valorDiaria * dias;
  const custoRefeicoes = refeicoes.reduce(
    (s, r) => s + (refeicoesDoEvento.find((x) => x.refeicao === r)?.valor ?? 0),
    0,
  );
  return {
    contribuicao,
    custoHospedagem,
    custoRefeicoes,
    total: contribuicao + custoHospedagem + custoRefeicoes,
    semValor: !isento && valor.trim() === '',
  };
}
