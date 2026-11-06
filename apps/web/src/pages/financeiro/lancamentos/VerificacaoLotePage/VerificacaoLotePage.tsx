import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FaltaParaConferir, MovimentoNaFila, Unidade } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, CorpoDaTela, EmptyState, PainelDeAcao, ScreenHeader, useDensidade, varianteDoPainel } from '@/ds';
import { useItensDoCadastro } from '@/pages/components/CadastroDaApi';
import { formatarBRL, formatarCompetencia } from '@/pages/utils/formato';
import { comandosDoLancamento, mensagemDeFalha, useDetalheDoLancamento, useListaFinanceira } from '../api';
import { FormularioFinanceiro } from '../components/FormularioFinanceiro';

const faltas: Record<FaltaParaConferir, string> = {
  UNIDADE: 'Unidade', CONTA: 'Conta', COMPETENCIA: 'Competência', CATEGORIA: 'Categoria',
  PENDENCIA: 'Pendência em aberto', ETIQUETAS_NAO_FECHAM: 'Valores por categoria não fecham',
};

export function VerificacaoLotePage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const cliente = useQueryClient();
  const comandos = comandosDoLancamento(useClienteHttp());
  const [pagina, setPagina] = useState(1);
  const [emRevisao, setEmRevisao] = useState<MovimentoNaFila | null>(null);
  const tentativa = useRef<{ alvo: string; chave: string } | null>(null);
  const unidades = useItensDoCadastro<Unidade>('/financeiro/unidades', pode('financeiro.plano_contas.ler'));
  const nomesDeUnidades = new Map(unidades.data?.itens.map(unidade => [unidade.id, unidade.nome]));
  const consulta = useListaFinanceira<MovimentoNaFila>('fila-conferencia', pagina);
  const detalhe = useDetalheDoLancamento(emRevisao?.id ?? null);
  const atualizar = () => cliente.invalidateQueries({ queryKey: ['lancamentos'] });
  const editar = useMutation({
    mutationFn: (entrada: Parameters<typeof comandos.editar>[0]) => comandos.editar(entrada),
    onSuccess: async () => { setEmRevisao(null); await atualizar(); },
  });
  const confirmar = useMutation({
    mutationFn: (item: MovimentoNaFila) => {
      const alvo = `${item.id}:${item.versao}`;
      if (tentativa.current?.alvo !== alvo) tentativa.current = { alvo, chave: crypto.randomUUID() };
      return comandos.confirmar(item, { chaveDeIdempotencia: tentativa.current.chave });
    },
    onSuccess: async () => {
      tentativa.current = null;
      await Promise.all([atualizar(), cliente.invalidateQueries({ queryKey: ['saldos'] })]);
    },
    onError: () => void atualizar(),
  });

  return (
    <>
      <ScreenHeader title="Verificação de lote" subtitle="Revise e confirme os lançamentos que aguardam conferência" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={1020}>
        {consulta.isPending ? <p role="status">Carregando fila…</p> : null}
        {consulta.isError ? <Aviso tom="pendente">Não foi possível carregar a fila.
          <Button variant="quiet" onClick={() => void consulta.refetch()}>Tentar novamente</Button>
        </Aviso> : null}
        {confirmar.isError ? <Aviso tom="pendente"><span role="alert">{mensagemDeFalha(confirmar.error)}</span></Aviso> : null}
        {confirmar.isSuccess ? <Aviso tom="informacao"><span role="status">Lançamento confirmado.</span></Aviso> : null}
        {consulta.data?.itens.length === 0 ? <EmptyState title="Nenhum movimento nesta página" /> : null}
        {consulta.data?.itens.map(item => (
          <article key={item.id} style={{ borderBottom: 'var(--border-hairline)', paddingBlock: 8 }}>
            <strong>{item.motivo}</strong>
            <p>{formatarBRL(item.valor)} · {item.conta?.nome ?? 'Sem conta'} · {item.competencia ? formatarCompetencia(item.competencia) : 'Sem competência'}</p>
            {item.unidadeId && nomesDeUnidades.has(item.unidadeId) ? <p>Unidade: {nomesDeUnidades.get(item.unidadeId)}</p> : null}
            {item.faltas.length ? <p>Falta conferir: {item.faltas.map(falta => faltas[falta]).join(', ')}</p> : null}
            {item.pendencia ? <p>{item.pendencia.texto}</p> : null}
            {item.tipo === 'TRANSFERENCIA' ? <p>Transferência</p> : (
              <div style={{ display: 'flex', gap: 8 }}>
                {pode('financeiro.lancamento.ler') ? <Button variant="quiet" disabled={confirmar.isPending}
                  onClick={() => { editar.reset(); setEmRevisao(item); }}>Revisar</Button> : null}
                <Button disabled={confirmar.isPending || item.faltas.length > 0} onClick={() => confirmar.mutate(item)}>Confirmar</Button>
              </div>
            )}
          </article>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          {pagina > 1 ? <Button variant="quiet" onClick={() => setPagina(pagina - 1)}>Página anterior</Button> : null}
          {consulta.data?.proximaPagina ? <Button variant="quiet" onClick={() => setPagina(consulta.data.proximaPagina ?? pagina)}>Próxima página</Button> : null}
        </div>
      </CorpoDaTela>
      {emRevisao ? (
        <PainelDeAcao aberto titulo={`Revisar ${emRevisao.motivo}`} variante={varianteDoPainel(densidade)}
          aoFechar={() => { if (!editar.isPending) setEmRevisao(null); }}>
          {detalhe.isPending ? <p role="status">Carregando lançamento…</p> : null}
          {detalhe.isError ? <Aviso tom="pendente">Não foi possível carregar o lançamento.
            <Button variant="quiet" onClick={() => void detalhe.refetch()}>Tentar novamente</Button>
          </Aviso> : null}
          {editar.isError ? <Aviso tom="pendente"><span role="alert">{mensagemDeFalha(editar.error)}</span></Aviso> : null}
          {detalhe.data?.status === 'CONFIRMADO' ? <Aviso tom="informacao">Este lançamento já foi confirmado.</Aviso> : null}
          {detalhe.data?.status === 'A_CONFERIR' ? <FormularioFinanceiro key={`${detalhe.data.id}:${detalhe.data.versao}`} inicial={detalhe.data} ocupado={editar.isPending}
            enviar={dados => { if (detalhe.data) editar.mutate({ id: detalhe.data.id, versao: detalhe.data.versao, dados }); }} /> : null}
        </PainelDeAcao>
      ) : null}
    </>
  );
}
