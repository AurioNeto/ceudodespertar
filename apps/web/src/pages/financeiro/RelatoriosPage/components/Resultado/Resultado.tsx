import type { DemonstrativoDeResultado } from '@cdd/contracts';
import { EmptyState } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';

export function Resultado({ dados }: { readonly dados: DemonstrativoDeResultado }) {
  return <>
    <dl>
      <dt>Receitas</dt><dd>{formatarBRL(dados.receitas)}</dd>
      <dt>Despesas</dt><dd>{formatarBRL(dados.despesas)}</dd>
      <dt>Resultado</dt><dd>{formatarBRL(dados.resultado)}</dd>
    </dl>
    {dados.linhas.length ? <ul>{dados.linhas.map((linha, indice) => (
      <li key={`${linha.linhaRelatorio}:${indice}`}>{linha.linhaRelatorio} · {linha.natureza === 'RECEITA' ? 'Receita' : 'Despesa'} · {formatarBRL(linha.valor)}</li>
    ))}</ul> : <EmptyState title="Sem linhas de resultado neste recorte" />}
  </>;
}
