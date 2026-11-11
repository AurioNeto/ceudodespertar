import { useState } from 'react';
import type { RegistroProprioNaConsulta, StatusLancamento } from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, CorpoDaTela, EmptyState, ScreenHeader, StatusBadge, useDensidade } from '@/ds';
import { formatarDataHora } from '@/lib/formato';
import { formatarBRL } from '@/pages/utils/formato';
import { useListaFinanceira } from '../api';
import { AnexarComprovante } from '../components/AnexarComprovante';

const estados: Record<StatusLancamento, string> = {
  A_CONFERIR: 'A conferir', CONFIRMADO: 'Confirmado', ESTORNADO: 'Estornado',
};

export function MeusRegistrosPage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const [pagina, setPagina] = useState(1);
  const consulta = useListaFinanceira<RegistroProprioNaConsulta>('meus-registros', pagina);

  return (
    <>
      <ScreenHeader title="Meus registros" subtitle="Acompanhe os lançamentos que você registrou" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={1000}>
        {consulta.isPending ? <p role="status">Carregando registros…</p> : null}
        {consulta.isError ? <Aviso tom="pendente">Não foi possível carregar os registros.
          <Button variant="quiet" onClick={() => void consulta.refetch()}>Tentar novamente</Button>
        </Aviso> : null}
        {consulta.data?.itens.length === 0 ? <EmptyState title="Nenhum registro nesta página" /> : null}
        {consulta.data?.itens.map(item => (
          <article key={item.id} style={{ borderBottom: 'var(--border-hairline)', paddingBlock: 8 }}>
            <strong>{item.motivo}</strong>
            <p>{item.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} · {formatarBRL(item.valor)} · {formatarDataHora(item.registradoEm)}</p>
            <StatusBadge tone={item.status === 'CONFIRMADO' ? 'confirmed' : 'neutral'}>{estados[item.status]}</StatusBadge>
            {item.pendencia ? <p>Pendência: {item.pendencia.texto}</p> : null}
            {item.comprovanteId ? <p>Comprovante anexado</p> : null}
            {!item.comprovanteId && item.status === 'A_CONFERIR' && pode('financeiro.lancamento.registrar') ? (
              <details><summary>Adicionar comprovante</summary>
                <AnexarComprovante id={item.id} versao={item.versao} />
              </details>
            ) : null}
          </article>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          {pagina > 1 ? <Button variant="quiet" onClick={() => setPagina(pagina - 1)}>Página anterior</Button> : null}
          {consulta.data?.proximaPagina ? <Button variant="quiet" onClick={() => setPagina(consulta.data.proximaPagina ?? pagina)}>Próxima página</Button> : null}
        </div>
      </CorpoDaTela>
    </>
  );
}
