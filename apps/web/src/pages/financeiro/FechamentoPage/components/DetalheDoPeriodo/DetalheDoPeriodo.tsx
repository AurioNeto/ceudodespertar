import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ReabrirPeriodo, type ParametrosDoPeriodo } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, PainelDeAcao, StatusBadge, TextField, useDensidade, varianteDoPainel } from '@/ds';
import { formatarDataHora } from '@/lib/formato';
import { formatarCompetencia } from '@/pages/utils/formato';
import { chaveDoPeriodo, comandosDoPeriodo, mensagemDoPeriodo, useIntegridade, usePeriodo } from '../../api';

type Acao = { tipo: 'fechar' | 'reabrir'; versao: number };

export function DetalheDoPeriodo({ chave, unidade }: {
  readonly chave: ParametrosDoPeriodo;
  readonly unidade: string;
}) {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const consulta = usePeriodo(chave);
  const periodo = consulta.data;
  const integridade = useIntegridade(chave, periodo?.versao);
  const cliente = useQueryClient();
  const comandos = comandosDoPeriodo(useClienteHttp(), chave);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState(false);
  const [aviso, setAviso] = useState('');
  const tentativa = useRef<{ corpo: string; chave: string } | null>(null);
  const mutacao = useMutation({
    mutationFn: (entrada: Acao & { motivo?: string }) => {
      const corpo = JSON.stringify(entrada);
      if (tentativa.current?.corpo !== corpo) tentativa.current = { corpo, chave: crypto.randomUUID() };
      return comandos[entrada.tipo](entrada, { chaveDeIdempotencia: tentativa.current.chave });
    },
    onSuccess: async (resultado, entrada) => {
      if (resultado) cliente.setQueryData(chaveDoPeriodo(chave), resultado);
      await cliente.invalidateQueries({ queryKey: chaveDoPeriodo(chave) });
      setAcao(null);
      setAviso(entrada.tipo === 'fechar' ? 'Período fechado.' : 'Período reaberto.');
    },
    onError: () => void consulta.refetch(),
  });
  const versao = periodo?.versao ?? 0;
  const fechada = periodo?.fechado === true;

  function preparar(tipo: Acao['tipo']) {
    mutacao.reset();
    setMotivo('');
    setErro(false);
    setAviso('');
    setAcao({ tipo, versao });
  }

  function enviar() {
    if (!acao || acao.versao !== versao || mutacao.isPending || !consulta.isSuccess) return;
    if (acao.tipo === 'fechar') {
      if (!fechada && pode('financeiro.periodo.fechar')) mutacao.mutate(acao);
      return;
    }
    if (!fechada || !pode('financeiro.periodo.reabrir')) return;
    const validado = ReabrirPeriodo.safeParse({ motivo });
    setErro(!validado.success);
    if (validado.success) mutacao.mutate({ ...acao, motivo: validado.data.motivo });
  }

  return (
    <>
      {consulta.isPending ? <p role="status">Consultando período…</p> : null}
      {consulta.isError ? <Aviso tom="pendente">Não foi possível consultar o período.
        <Button variant="quiet" onClick={() => void consulta.refetch()}>Tentar novamente</Button>
      </Aviso> : null}
      {aviso ? <Aviso tom="informacao"><span role="status">{aviso}</span></Aviso> : null}
      {consulta.isSuccess ? <section aria-label="Situação do período">
        <h2>{unidade} · {formatarCompetencia(chave.competencia)}</h2>
        <StatusBadge tone={fechada ? 'confirmed' : 'neutral'}>{fechada ? 'Fechado' : 'Aberto'}</StatusBadge>
        {periodo?.fechadoEm ? <p>Fechado em {formatarDataHora(periodo.fechadoEm)}</p> : null}
        {periodo?.hash ? <p style={{ overflowWrap: 'anywhere' }}>Hash do fechamento: <code>{periodo.hash}</code></p> : null}
        {!fechada && pode('financeiro.periodo.fechar') ? <Button onClick={() => preparar('fechar')}>Fechar período</Button> : null}
        {fechada && pode('financeiro.periodo.reabrir') ? <Button onClick={() => preparar('reabrir')}>Reabrir período</Button> : null}
        {fechada ? <Button variant="quiet" disabled={integridade.isFetching} onClick={() => void integridade.refetch()}>Verificar integridade</Button> : null}
        {integridade.isError ? <Aviso tom="pendente">Não foi possível verificar a integridade.</Aviso> : null}
        {fechada && integridade.data ? <Aviso tom={integridade.data.integro === true ? 'informacao' : 'pendente'}>
          <span role="status">{integridade.data.integro === true ? 'O hash confere com o fechamento.' :
            integridade.data.integro === false ? 'O hash atual diverge do fechamento.' : 'O período está sem hash gravado.'}</span>
        </Aviso> : null}
        {periodo?.reaberturas.length ? <>
          <h3>Histórico de reaberturas</h3>
          <ul>{periodo.reaberturas.map((item, indice) => (
            <li key={`${item.reabertoEm}:${indice}`} style={{ overflowWrap: 'anywhere' }}>
              <p>{formatarDataHora(item.reabertoEm)} · {item.motivo}</p>
              <p>Hash anterior: <code>{item.hashAnterior}</code></p>
            </li>
          ))}</ul>
        </> : null}
      </section> : null}
      {acao ? (
        <PainelDeAcao aberto titulo={acao.tipo === 'fechar' ? 'Fechar período' : 'Reabrir período'}
          variante={varianteDoPainel(densidade)} aoFechar={() => { if (!mutacao.isPending) setAcao(null); }}>
          <form onSubmit={evento => { evento.preventDefault(); enviar(); }} style={{ display: 'grid', gap: 12 }}>
            <p>{unidade} · {formatarCompetencia(chave.competencia)}</p>
            {acao.tipo === 'fechar' ? <p>O fechamento grava o hash e bloqueia alterações nesta competência.</p> : (
              <TextField label="Motivo da reabertura" value={motivo} multiline maxLength={500} density={densidade}
                onChange={evento => setMotivo(evento.currentTarget.value)} />
            )}
            {erro ? <p role="alert">Informe um motivo com 10 a 500 caracteres.</p> : null}
            {mutacao.isError ? <Aviso tom="pendente"><span role="alert">{mensagemDoPeriodo(mutacao.error)}</span></Aviso> : null}
            {acao.versao !== versao ? <p role="alert">O período mudou. Cancele e abra a ação novamente.</p> : null}
            <Button type="submit" disabled={mutacao.isPending || acao.versao !== versao || !consulta.isSuccess}>
              {acao.tipo === 'fechar' ? 'Confirmar fechamento' : 'Confirmar reabertura'}
            </Button>
            <Button variant="quiet" disabled={mutacao.isPending} onClick={() => setAcao(null)}>Cancelar</Button>
          </form>
        </PainelDeAcao>
      ) : null}
    </>
  );
}
