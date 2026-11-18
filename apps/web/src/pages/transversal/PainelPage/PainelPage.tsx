import type { ReactNode } from 'react';
import type { DemonstrativoDeResultado, FluxoDeCaixa, MovimentoNaFila, PaginaFinanceira, ResumoDeResultadoDeCerimonia, SaldoDeConta } from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, CorpoDaTela, EmptyState, ScreenHeader, useDensidade } from '@/ds';
import { competenciaDaCasa, intervaloDaCompetencia, useConsultaFinanceira } from '@/pages/hooks/useConsultaFinanceira';
import { formatarBRL, formatarCompetencia, formatarData } from '@/pages/utils/formato';

export function PainelPage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const competencia = competenciaDaCasa();
  const veSaldos = pode('financeiro.conta.ler');
  const veDre = pode('financeiro.dre.ler');
  const veCaixa = pode('financeiro.fluxo_caixa.ler');
  const veCerimonias = pode('financeiro.resultado_evento.ler');
  const veFila = pode('financeiro.lancamento.confirmar');
  const saldos = useConsultaFinanceira<readonly SaldoDeConta[]>('contas/saldos', {}, veSaldos, ['saldos', 'contas']);
  const dre = useConsultaFinanceira<DemonstrativoDeResultado>('relatorios/dre', { competencia }, veDre);
  const caixa = useConsultaFinanceira<FluxoDeCaixa>('relatorios/fluxo-de-caixa', intervaloDaCompetencia(competencia), veCaixa);
  const cerimonias = useConsultaFinanceira<PaginaFinanceira<ResumoDeResultadoDeCerimonia>>('relatorios/cerimonias',
    { competencia, limite: '3' }, veCerimonias);
  const fila = useConsultaFinanceira<PaginaFinanceira<MovimentoNaFila>>('fila-conferencia', { limite: '5' },
    veFila, ['lancamentos', 'fila-conferencia']);

  return <>
    <ScreenHeader title="Painel" subtitle={`Competência ${formatarCompetencia(competencia)}`} density={densidade} />
    <CorpoDaTela densidade={densidade} larguraMaxima={1100}>
      {!veSaldos && !veDre && !veCaixa && !veCerimonias && !veFila ?
        <EmptyState title="Nenhum resumo financeiro disponível para seu perfil" /> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
        {veSaldos ? <BlocoFinanceiro titulo="Saldos das contas" consulta={saldos}>
          {saldos.data?.length ? <ul>{saldos.data.map(conta => (
            <li key={conta.id}>{conta.nome} · {formatarBRL(conta.saldo)}</li>
          ))}</ul> : <EmptyState title="Nenhuma conta encontrada" />}
        </BlocoFinanceiro> : null}
        {veDre ? <BlocoFinanceiro titulo="Resultado da competência" consulta={dre}>
          {dre.data ? <dl>
            <dt>Receitas</dt><dd>{formatarBRL(dre.data.receitas)}</dd>
            <dt>Despesas</dt><dd>{formatarBRL(dre.data.despesas)}</dd>
            <dt>Resultado</dt><dd>{formatarBRL(dre.data.resultado)}</dd>
          </dl> : null}
        </BlocoFinanceiro> : null}
        {veCaixa ? <BlocoFinanceiro titulo="Fluxo de caixa do mês" consulta={caixa}>
          {caixa.data ? <dl>
            <dt>Entradas</dt><dd>{formatarBRL(caixa.data.entradas)}</dd>
            <dt>Saídas</dt><dd>{formatarBRL(caixa.data.saidas)}</dd>
            <dt>Transferências líquidas</dt><dd>{formatarBRL(caixa.data.transferenciasLiquidas)}</dd>
            <dt>Líquido</dt><dd>{formatarBRL(caixa.data.liquido)}</dd>
          </dl> : null}
        </BlocoFinanceiro> : null}
        {veCerimonias ? <BlocoFinanceiro titulo="Resultados por cerimônia" consulta={cerimonias}>
          {cerimonias.data?.itens.length ? <ul>{cerimonias.data.itens.map(item => (
            <li key={item.evento.id}>{item.evento.nome} · {formatarData(item.evento.dataInicio)} · {formatarBRL(item.resultado)}</li>
          ))}</ul> : <EmptyState title="Nenhum resultado financeiro de cerimônias nesta competência" />}
        </BlocoFinanceiro> : null}
        {veFila ? <BlocoFinanceiro titulo="A conferir" consulta={fila}>
          {fila.data?.itens.length ? <ul>{fila.data.itens.map(item => (
            <li key={item.id}>{item.motivo} · {formatarBRL(item.valor)}</li>
          ))}</ul> : <EmptyState title="Nenhum movimento a conferir" />}
          {fila.data?.proximaPagina ? <p>Veja os demais movimentos na Verificação de lote.</p> : null}
        </BlocoFinanceiro> : null}
      </div>
    </CorpoDaTela>
  </>;
}

function BlocoFinanceiro({ titulo, consulta, children }: {
  readonly titulo: string;
  readonly consulta: { isPending: boolean; isError: boolean; refetch(): Promise<unknown> };
  readonly children: ReactNode;
}) {
  return <section style={{ padding: 16, border: 'var(--border-hairline)', borderRadius: 'var(--leaf-md)' }}>
    <h2>{titulo}</h2>
    {consulta.isPending ? <p role="status">Carregando…</p> : consulta.isError ? (
      <Aviso tom="pendente">Não foi possível consultar estes dados.
        <Button variant="quiet" onClick={() => void consulta.refetch()}>Tentar novamente</Button>
      </Aviso>
    ) : children}
  </section>;
}
