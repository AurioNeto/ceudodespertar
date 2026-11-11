import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AbrirPendencia, EstornarLancamento } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, PainelDeAcao, TextField, useDensidade, varianteDoPainel } from '@/ds';
import { formatarDataHora } from '@/lib/formato';
import { formatarBRL } from '@/pages/utils/formato';
import { comandosDoLancamento, mensagemDeFalha, useDetalheDoLancamento, type AcaoDoDetalhe } from '../../api';

const acoes = {
  abrir: { titulo: 'Abrir pendência', campo: 'Pergunta', sucesso: 'Pendência aberta.' },
  responder: { titulo: 'Enviar resposta', campo: 'Resposta', sucesso: 'Resposta enviada.' },
  estornar: { titulo: 'Confirmar estorno', campo: 'Motivo do estorno', sucesso: 'Estorno registrado.' },
};

export function DetalheFinanceiro({ id, titulo, fechar }: {
  readonly id: string;
  readonly titulo: string;
  readonly fechar: () => void;
}) {
  const densidade = useDensidade();
  const { pode, usuario } = useSessao();
  const detalhe = useDetalheDoLancamento(id);
  const registro = detalhe.data;
  const cliente = useQueryClient();
  const { acionar } = comandosDoLancamento(useClienteHttp());
  const [acao, setAcao] = useState<{ comando: AcaoDoDetalhe; versao: number } | null>(null);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState(false);
  const [aviso, setAviso] = useState('');
  const tentativa = useRef<{ corpo: string; chave: string } | null>(null);
  const mutacao = useMutation({
    mutationFn: (entrada: Parameters<typeof acionar>[0]) => {
      const corpo = JSON.stringify(entrada);
      if (tentativa.current?.corpo !== corpo) tentativa.current = { corpo, chave: crypto.randomUUID() };
      return acionar(entrada, { chaveDeIdempotencia: tentativa.current.chave });
    },
    onSuccess: async (_resultado, entrada) => {
      await cliente.invalidateQueries({ queryKey: ['lancamentos'] });
      if (entrada.acao.tipo === 'estornar') await cliente.invalidateQueries({ queryKey: ['saldos'] });
      setAcao(null);
      setAviso(acoes[entrada.acao.tipo].sucesso);
    },
    onError: () => void detalhe.refetch(),
  });

  function preparar(comando: AcaoDoDetalhe, versao: number) {
    mutacao.reset();
    setAcao({ comando, versao });
    setTexto('');
    setErro(false);
    setAviso('');
  }

  function enviar() {
    if (!acao || !registro || acao.versao !== registro.versao || mutacao.isPending) return;
    const valido = acao.comando.tipo === 'estornar' ? EstornarLancamento.safeParse({ motivo: texto }) :
      AbrirPendencia.safeParse({ texto });
    setErro(!valido.success);
    if (valido.success) mutacao.mutate({ id, versao: acao.versao, acao: acao.comando, texto: texto.trim() });
  }

  return (
    <PainelDeAcao aberto titulo={titulo} variante={varianteDoPainel(densidade)}
      aoFechar={() => { if (!mutacao.isPending) fechar(); }}>
      {detalhe.isPending ? <p role="status">Carregando lançamento…</p> : null}
      {detalhe.isError ? <Aviso tom="pendente">Não foi possível carregar o lançamento.
        <Button variant="quiet" onClick={() => void detalhe.refetch()}>Tentar novamente</Button>
      </Aviso> : null}
      {aviso ? <Aviso tom="informacao"><span role="status">{aviso}</span></Aviso> : null}
      {mutacao.isError ? <Aviso tom="pendente"><span role="alert">{mensagemDeFalha(mutacao.error)}</span></Aviso> : null}
      {registro ? <>
        <p>{formatarBRL(registro.valor)} · {formatarDataHora(registro.registradoEm)}</p>
        {registro.contraparteTexto ? <p>Contraparte: {registro.contraparteTexto}</p> : null}
        {registro.formaPagamento ? <p>Pagamento: {registro.formaPagamento}</p> : null}
        {registro.estornadoPorId ? <p>Lançamento estornado.</p> : null}
        {registro.estornoDeId ? <p>Lançamento de estorno.</p> : null}
        {registro.comprovanteId ? <p>Comprovante anexado</p> : null}
        <h3>Pendências</h3>
        {registro.pendencias.length === 0 ? <p>Nenhuma pendência.</p> : null}
        {registro.pendencias.map(pendencia => (
          <article key={pendencia.id}>
            <p>{pendencia.texto} · {formatarDataHora(pendencia.abertaEm)}</p>
            {pendencia.resposta ? <p>Resposta: {pendencia.resposta}</p> : null}
            {!acao && !pendencia.resolvidaEm && registro.status === 'A_CONFERIR' && usuario?.id === pendencia.destinatario &&
              (pode('financeiro.lancamento.registrar') || pode('financeiro.lancamento.confirmar')) ? (
                <Button variant="quiet" onClick={() => preparar({ tipo: 'responder', pendenciaId: pendencia.id }, registro.versao)}>Responder pendência</Button>
              ) : null}
          </article>
        ))}
        {!acao && registro.status === 'A_CONFERIR' && pode('financeiro.lancamento.confirmar') &&
          usuario?.id !== registro.registradoPor && !registro.pendencias.some(item => item.resolvidaEm === null) ? (
            <Button variant="quiet" onClick={() => preparar({ tipo: 'abrir' }, registro.versao)}>Abrir pendência</Button>
          ) : null}
        {!acao && registro.status === 'CONFIRMADO' && !registro.estornadoPorId && !registro.estornoDeId && pode('financeiro.lancamento.estornar') ? (
          <Button variant="quiet" onClick={() => preparar({ tipo: 'estornar' }, registro.versao)}>Estornar lançamento</Button>
        ) : null}
        {acao ? <form onSubmit={evento => { evento.preventDefault(); enviar(); }} style={{ display: 'grid', gap: 8 }}>
          {acao.comando.tipo === 'estornar' ? <p>O estorno cria um lançamento de contrapartida e preserva o original.</p> : null}
          <TextField label={acoes[acao.comando.tipo].campo} value={texto} maxLength={500} multiline
            onChange={evento => setTexto(evento.currentTarget.value)} density={densidade} />
          {erro ? <p role="alert">Preencha o campo com até 500 caracteres.</p> : null}
          {acao.versao !== registro.versao ? <p role="alert">O lançamento mudou. Cancele e abra a ação novamente.</p> : null}
          <Button type="submit" disabled={mutacao.isPending || acao.versao !== registro.versao}>{acoes[acao.comando.tipo].titulo}</Button>
          <Button variant="quiet" disabled={mutacao.isPending} onClick={() => { setAcao(null); mutacao.reset(); }}>Cancelar</Button>
        </form> : null}
      </> : null}
    </PainelDeAcao>
  );
}
