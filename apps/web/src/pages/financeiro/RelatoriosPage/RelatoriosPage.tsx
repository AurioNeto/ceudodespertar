import { useState } from 'react';
import {
  FiltroDaDre, FiltroDeListaPorCompetencia, FiltroDoFluxoDeCaixa, type DemonstrativoDeResultado, type FluxoDeCaixa,
  type PaginaFinanceira, type ResultadoDeCerimonia, type ResumoDeResultadoDeCerimonia, type Unidade,
} from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, CorpoDaTela, EmptyState, PainelDeAcao, ScreenHeader, Select, SeletorDeTipo, TextField, useDensidade, varianteDoPainel } from '@/ds';
import { useItensDoCadastro } from '@/pages/components/CadastroDaApi';
import { competenciaDaCasa, intervaloDaCompetencia, useConsultaFinanceira } from '@/pages/hooks/useConsultaFinanceira';
import { formatarBRL, formatarData } from '@/pages/utils/formato';
import { Resultado } from './components/Resultado';

const abas = [
  { valor: 'dre', label: 'DRE', permissao: 'financeiro.dre.ler' },
  { valor: 'caixa', label: 'Fluxo de caixa', permissao: 'financeiro.fluxo_caixa.ler' },
  { valor: 'cerimonias', label: 'Resultado por cerimônia', permissao: 'financeiro.resultado_evento.ler' },
] as const;
type Aba = typeof abas[number]['valor'];

export function RelatoriosPage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const disponiveis = abas.filter(aba => pode(aba.permissao));
  const [escolhida, setEscolhida] = useState<Aba | undefined>();
  const aba = disponiveis.find(item => item.valor === escolhida)?.valor ?? disponiveis[0]?.valor;
  return <>
    <ScreenHeader title="Relatórios" density={densidade} />
    <CorpoDaTela densidade={densidade} larguraMaxima={1120}>
      {aba ? <>
        <SeletorDeTipo opcoes={disponiveis} valor={aba} onEscolher={setEscolhida} densidade={densidade} />
        <ConsultaDeRelatorio key={aba} aba={aba} />
      </> : <EmptyState title="Nenhum relatório disponível para seu perfil" />}
    </CorpoDaTela>
  </>;
}

function ConsultaDeRelatorio({ aba }: { readonly aba: Aba }) {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const unidades = useItensDoCadastro<Unidade>('/financeiro/unidades', pode('financeiro.plano_contas.ler'));
  const [competencia, setCompetencia] = useState(competenciaDaCasa);
  const [intervalo, setIntervalo] = useState(() => intervaloDaCompetencia(competencia));
  const [unidade, setUnidade] = useState('');
  const [filtro, setFiltro] = useState<Record<string, string>>(() => aba === 'caixa' ? intervalo : { competencia });
  const [erro, setErro] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [evento, setEvento] = useState<ResumoDeResultadoDeCerimonia['evento'] | null>(null);
  const dre = useConsultaFinanceira<DemonstrativoDeResultado>('relatorios/dre', filtro, aba === 'dre');
  const caixa = useConsultaFinanceira<FluxoDeCaixa>('relatorios/fluxo-de-caixa', filtro, aba === 'caixa');
  const cerimonias = useConsultaFinanceira<PaginaFinanceira<ResumoDeResultadoDeCerimonia>>('relatorios/cerimonias',
    { ...filtro, pagina: String(pagina) }, aba === 'cerimonias');
  const detalhe = useConsultaFinanceira<ResultadoDeCerimonia>(`relatorios/cerimonias/${encodeURIComponent(evento?.id ?? '')}`, filtro, evento !== null);
  const consulta = aba === 'dre' ? dre : aba === 'caixa' ? caixa : cerimonias;

  function aplicar() {
    const unidadeId = unidade || undefined;
    const campos = aba === 'caixa' ? { ...intervalo, unidadeId } : { competencia: competencia || undefined, unidadeId };
    const contrato = aba === 'caixa' ? FiltroDoFluxoDeCaixa : aba === 'dre' ? FiltroDaDre : FiltroDeListaPorCompetencia;
    const validado = contrato.safeParse(campos);
    setErro(!validado.success);
    if (!validado.success) return;
    const parametros = Object.fromEntries(Object.entries(campos).filter((entrada): entrada is [string, string] => typeof entrada[1] === 'string'));
    setFiltro(parametros);
    setPagina(1);
  }

  return <>
    <form onSubmit={evento => { evento.preventDefault(); aplicar(); }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12 }}>
      {unidades.data ? <Select label="Unidade" value={unidade} density={densidade}
        options={[{ value: '', label: 'Todas as unidades' }, ...unidades.data.itens.map(item => ({ value: item.id, label: item.nome }))]}
        onChange={setUnidade} /> : null}
      {aba === 'caixa' ? <>
        <TextField label="De" type="date" value={intervalo.de} onChange={evento => setIntervalo({ ...intervalo, de: evento.currentTarget.value })} density={densidade} />
        <TextField label="Até" type="date" value={intervalo.ate} onChange={evento => setIntervalo({ ...intervalo, ate: evento.currentTarget.value })} density={densidade} />
      </> : <TextField label="Competência" type="month" value={competencia}
        onChange={evento => setCompetencia(evento.currentTarget.value)} density={densidade} />}
      <Button type="submit">Aplicar filtros</Button>
    </form>
    {erro ? <Aviso tom="pendente"><span role="alert">Confira os filtros. A data final deve ser igual ou posterior à inicial.</span></Aviso> : null}
    {unidades.isError ? <Button variant="quiet" onClick={() => void unidades.refetch()}>Recarregar unidades</Button> : null}
    {consulta.isPending ? <p role="status">Carregando relatório…</p> : null}
    {consulta.isError ? <Aviso tom="pendente">Não foi possível carregar o relatório.
      <Button variant="quiet" onClick={() => void consulta.refetch()}>Tentar novamente</Button>
    </Aviso> : null}
    {aba === 'dre' && dre.data ? <Resultado dados={dre.data} /> : null}
    {aba === 'caixa' && caixa.data ? <>
      <dl>
        <dt>Entradas</dt><dd>{formatarBRL(caixa.data.entradas)}</dd>
        <dt>Saídas</dt><dd>{formatarBRL(caixa.data.saidas)}</dd>
        <dt>Transferências líquidas</dt><dd>{formatarBRL(caixa.data.transferenciasLiquidas)}</dd>
        <dt>Líquido</dt><dd>{formatarBRL(caixa.data.liquido)}</dd>
      </dl>
      {caixa.data.dias.length ? <ul>{caixa.data.dias.map(dia => <li key={dia.data}>
        {formatarData(dia.data)} · Entradas {formatarBRL(dia.entradas)} · Saídas {formatarBRL(dia.saidas)} ·
        Transferências {formatarBRL(dia.transferenciasLiquidas)} · Líquido {formatarBRL(dia.liquido)}
      </li>)}</ul> : <EmptyState title="Sem movimentação neste intervalo" />}
    </> : null}
    {aba === 'cerimonias' && cerimonias.data ? <>
      {cerimonias.data.itens.length ? <ul>{cerimonias.data.itens.map(item => <li key={item.evento.id}>
        <Button variant="quiet" onClick={() => setEvento(item.evento)}>{item.evento.nome}</Button> · {formatarData(item.evento.dataInicio)} · {formatarBRL(item.resultado)}
      </li>)}</ul> : <EmptyState title="Nenhuma cerimônia nesta página" />}
      <div>
        {pagina > 1 ? <Button variant="quiet" onClick={() => setPagina(pagina - 1)}>Página anterior</Button> : null}
        {cerimonias.data.proximaPagina ? <Button variant="quiet" onClick={() => setPagina(cerimonias.data.proximaPagina ?? pagina)}>Próxima página</Button> : null}
      </div>
    </> : null}
    {evento ? <PainelDeAcao aberto titulo={evento.nome} variante={varianteDoPainel(densidade)} aoFechar={() => setEvento(null)}>
      {detalhe.isPending ? <p role="status">Carregando resultado…</p> : null}
      {detalhe.isError ? <Aviso tom="pendente">Não foi possível carregar o resultado.
        <Button variant="quiet" onClick={() => void detalhe.refetch()}>Tentar novamente</Button>
      </Aviso> : null}
      {detalhe.data ? <Resultado dados={detalhe.data} /> : null}
    </PainelDeAcao> : null}
  </>;
}
