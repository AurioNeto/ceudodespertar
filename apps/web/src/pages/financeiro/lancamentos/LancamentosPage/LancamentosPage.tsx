import { PainelDeTransferencia } from '@/pages/financeiro/components/Transferencia';
import { useState } from 'react';
import type { MovimentoNaConsulta, StatusLancamento, Unidade } from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, CorpoDaTela, EmptyState, ScreenHeader, Select, StatusBadge, TextField, useDensidade } from '@/ds';
import { formatarDataHora } from '@/lib/formato';
import { useItensDoCadastro } from '@/pages/components/CadastroDaApi';
import { formatarBRL, formatarCompetencia } from '@/pages/utils/formato';
import { useLivroFinanceiro } from '../api';
import { DetalheFinanceiro } from '../components/DetalheFinanceiro';

const estados: Record<StatusLancamento, string> = { A_CONFERIR: 'A conferir', CONFIRMADO: 'Confirmado', ESTORNADO: 'Estornado' };
const tipos = { SAIDA: 'Saída', ENTRADA: 'Entrada', TRANSFERENCIA: 'Transferência' };

export function LancamentosPage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const [pagina, setPagina] = useState(1);
  const [competencia, setCompetencia] = useState('');
  const [unidade, setUnidade] = useState('');
  const [selecionado, setSelecionado] = useState<MovimentoNaConsulta | null>(null);
  const unidades = useItensDoCadastro<Unidade>('/financeiro/unidades', pode('financeiro.plano_contas.ler'));
  const consulta = useLivroFinanceiro(pagina, competencia, unidade);
  const fechar = () => setSelecionado(null);

  return (
    <>
      <ScreenHeader title="Lançamentos" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={1080}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <TextField label="Competência" type="month" min="0001-01" max="9999-12" value={competencia} density={densidade}
            onChange={evento => { setCompetencia(evento.currentTarget.value); setPagina(1); }} />
          {unidades.data ? <Select label="Unidade" value={unidade} density={densidade}
            options={[{ value: '', label: 'Todas as unidades' }, ...unidades.data.itens.map(item => ({ value: item.id, label: item.nome }))]}
            onChange={valor => { setUnidade(valor); setPagina(1); }} /> : null}
          {unidades.isError ? <Button variant="quiet" onClick={() => void unidades.refetch()}>Recarregar unidades</Button> : null}
          {competencia || unidade ? <Button variant="quiet" onClick={() => { setCompetencia(''); setUnidade(''); setPagina(1); }}>Limpar filtros</Button> : null}
        </div>
        {consulta.isPending ? <p role="status">Carregando lançamentos…</p> : null}
        {consulta.isError ? <Aviso tom="pendente">Não foi possível carregar os lançamentos.
          <Button variant="quiet" onClick={() => void consulta.refetch()}>Tentar novamente</Button>
        </Aviso> : null}
        {consulta.data?.itens.length === 0 ? <EmptyState title="Nenhum lançamento nesta página" /> : null}
        {consulta.data?.itens.map(item => (
          <article key={item.id} style={{ borderBottom: 'var(--border-hairline)', paddingBlock: 8 }}>
            <strong>{item.motivo}</strong>
            <p>{tipos[item.tipo]} · {formatarBRL(item.valor)} · {formatarDataHora(item.registradoEm)}</p>
            <p>{item.conta?.nome ?? 'Sem conta'}{item.contaDestino ? ` → ${item.contaDestino.nome}` : ''}
              {item.competencia ? ` · ${formatarCompetencia(item.competencia)}` : ''}</p>
            <StatusBadge tone={item.status === 'CONFIRMADO' ? 'confirmed' : 'neutral'}>{estados[item.status]}</StatusBadge>
            {item.pendencia ? <p>Pendência: {item.pendencia.texto}</p> : null}
            <Button variant="quiet" aria-label={`Abrir ${item.motivo}`} onClick={() => setSelecionado(item)}>Ver detalhes</Button>
          </article>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          {pagina > 1 ? <Button variant="quiet" onClick={() => setPagina(pagina - 1)}>Página anterior</Button> : null}
          {consulta.data?.proximaPagina ? <Button variant="quiet" onClick={() => setPagina(consulta.data.proximaPagina ?? pagina)}>Próxima página</Button> : null}
        </div>
      </CorpoDaTela>
      {selecionado?.tipo === 'TRANSFERENCIA' ? (
        <PainelDeTransferencia movimento={selecionado} fechar={fechar} />
      ) : selecionado ? <DetalheFinanceiro id={selecionado.id} titulo={selecionado.motivo} fechar={fechar} /> : null}
    </>
  );
}
