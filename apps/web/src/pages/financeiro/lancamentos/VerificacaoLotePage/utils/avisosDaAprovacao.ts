import { pluralizar } from '@/pages/utils/formato';

const avisoDoQueFicouNaFila = (retidos: number) =>
  retidos === 0
    ? ''
    : ` ${pluralizar(retidos, 'lançamento ficou', 'lançamentos ficaram')} na fila: o período está fechado.`;

export function avisoDosSelecionadosAprovados(aprovados: number, retidos: number): string {
  const aprovacao =
    aprovados === 0
      ? 'Nenhum lançamento aprovado.'
      : `${pluralizar(aprovados, 'lançamento aprovado', 'lançamentos aprovados')} e consolidado${aprovados > 1 ? 's' : ''}.`;
  return aprovacao + avisoDoQueFicouNaFila(retidos);
}

export function avisoDaAltaConfiancaAprovada(aprovados: number, retidos: number): string {
  const aprovacao = `${pluralizar(aprovados, 'lançamento', 'lançamentos')} de alta confiança aprovado${aprovados === 1 ? '' : 's'}.`;
  return aprovacao + avisoDoQueFicouNaFila(retidos);
}
