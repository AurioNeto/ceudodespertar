import type { DemonstrativoDeResultado, TipoCategoria, UnidadeId } from '@cdd/contracts';
import { EmptyState } from '@/ds';
import { formatarBRL, formatarCompetencia } from '@/pages/utils/formato';

const tiposDeCategoria: Record<TipoCategoria, string> = {
  OPERACIONAL: 'Operacional',
  INVESTIMENTO: 'Investimento',
  MANUTENCAO: 'Manutenção',
  PATRIMONIAL: 'Patrimonial',
};

export function Resultado({ dados, nomesDasUnidades }: {
  readonly dados: DemonstrativoDeResultado;
  readonly nomesDasUnidades: ReadonlyMap<UnidadeId, string>;
}) {
  return <>
    <dl>
      <dt>Receitas</dt><dd>{formatarBRL(dados.receitas)}</dd>
      <dt>Despesas</dt><dd>{formatarBRL(dados.despesas)}</dd>
      <dt>Resultado</dt><dd>{formatarBRL(dados.resultado)}</dd>
    </dl>
    {dados.linhas.length ? <ul>{dados.linhas.map(linha => {
      const unidade = linha.unidadeId ? nomesDasUnidades.get(linha.unidadeId) ?? linha.unidadeId : 'Sem unidade';
      const competencia = linha.competencia ? formatarCompetencia(linha.competencia) : 'Sem competência';
      const chave = JSON.stringify([linha.unidadeId, linha.competencia, linha.linhaRelatorio, linha.natureza, linha.tipo]);
      return <li key={chave}>
        {linha.linhaRelatorio} · {unidade} · {competencia} · {tiposDeCategoria[linha.tipo]} ·{' '}
        {linha.natureza === 'RECEITA' ? 'Receita' : 'Despesa'} · {formatarBRL(linha.valor)}
      </li>;
    })}</ul> : <EmptyState title="Sem linhas de resultado neste recorte" />}
  </>;
}
