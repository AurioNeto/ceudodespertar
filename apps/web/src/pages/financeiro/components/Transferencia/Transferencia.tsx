import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EstornarTransferencia, type MovimentoNaConsulta, type RegistrarTransferencia } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, PainelDeAcao, TextField, useDensidade, varianteDoPainel } from '@/ds';
import { formatarBRL, formatarData } from '@/pages/utils/formato';
import { comandosDeTransferencia, mensagemDaTransferencia, useTransferencia } from './api';
import { FINALIDADES_DA_B1, FormularioDeTransferencia } from './components/FormularioDeTransferencia';

type Acao = 'editar' | 'confirmar' | 'descartar' | 'estornar';
type Alvo = { id: string; versao: number };
type Operacao = { tipo: 'registrar'; dados: RegistrarTransferencia }
  | ({ tipo: 'editar'; dados: RegistrarTransferencia } & Alvo)
  | ({ tipo: 'estornar'; motivo: string } & Alvo)
  | ({ tipo: 'confirmar' | 'descartar' } & Alvo);

const rotulos = { editar: 'Editar transferência', confirmar: 'Confirmar transferência',
  descartar: 'Descartar transferência', estornar: 'Estornar transferência' };
const sucessos = { registrar: 'Transferência registrada e a conferir.', editar: 'Transferência atualizada.',
  confirmar: 'Transferência confirmada.', descartar: 'Transferência descartada.',
  estornar: 'Estorno registrado e a conferir.' };

export function BotaoDeTransferencia() {
  const { pode } = useSessao();
  const [aberto, setAberto] = useState(false);
  if (!pode('financeiro.transferencia.registrar')) return null;
  return <>
    <div><Button variant="quiet" onClick={() => setAberto(true)}>Registrar transferência</Button></div>
    {aberto ? <PainelDeTransferencia fechar={() => setAberto(false)} /> : null}
  </>;
}

export function PainelDeTransferencia({ movimento, fechar }: {
  readonly movimento?: MovimentoNaConsulta;
  readonly fechar: () => void;
}) {
  const densidade = useDensidade();
  const { pode, usuario } = useSessao();
  const cliente = useQueryClient();
  const comandos = comandosDeTransferencia(useClienteHttp());
  const podeLer = pode('financeiro.conta.ler') || pode('financeiro.transferencia.registrar');
  const consulta = useTransferencia(movimento?.id, podeLer);
  const registro = consulta.data;
  const [acao, setAcao] = useState<{ tipo: Acao; versao: number } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const tentativa = useRef<{ corpo: string; chave: string } | null>(null);
  const mutacao = useMutation({
    mutationFn: (operacao: Operacao) => {
      const corpo = JSON.stringify(operacao);
      if (tentativa.current?.corpo !== corpo) tentativa.current = { corpo, chave: crypto.randomUUID() };
      const opcoes = { chaveDeIdempotencia: tentativa.current.chave };
      switch (operacao.tipo) {
        case 'registrar': return comandos.registrar(operacao.dados, opcoes);
        case 'editar': return comandos.editar(operacao);
        case 'confirmar': return comandos.confirmar(operacao, opcoes);
        case 'descartar': return comandos.descartar(operacao);
        case 'estornar': return comandos.estornar(operacao, opcoes);
      }
    },
    onSuccess: async (_resultado, operacao) => {
      setSucesso(sucessos[operacao.tipo]);
      setAcao(null);
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ['lancamentos'] }),
        cliente.invalidateQueries({ queryKey: ['saldos'] }),
      ]);
    },
    onError: () => void cliente.invalidateQueries({ queryKey: ['lancamentos'] }),
  });
  const versao = registro?.versao ?? movimento?.versao;
  const podeConferir = pode('financeiro.lancamento.confirmar');
  const autor = registro?.registradoPor === usuario?.id && registro !== undefined;
  const pendente = (registro?.status ?? movimento?.status) === 'A_CONFERIR';
  const podeAlterar = podeConferir || (autor && pode('financeiro.transferencia.registrar'));

  function preparar(tipo: Acao) {
    if (versao === undefined) return;
    setAcao({ tipo, versao });
    setMotivo('');
    setErro(false);
    mutacao.reset();
  }

  function enviar(dados?: RegistrarTransferencia) {
    if (mutacao.isPending) return;
    if (!movimento && dados) {
      mutacao.mutate({ tipo: 'registrar', dados });
      return;
    }
    if (!movimento || !acao || acao.versao !== versao) return;
    const alvo = { id: movimento.id, versao: acao.versao };
    if (acao.tipo === 'editar' && dados) mutacao.mutate({ ...alvo, tipo: 'editar', dados });
    if (acao.tipo === 'confirmar' || acao.tipo === 'descartar') mutacao.mutate({ ...alvo, tipo: acao.tipo });
    if (acao.tipo === 'estornar') {
      const validado = EstornarTransferencia.safeParse({ motivo });
      setErro(!validado.success);
      if (validado.success) mutacao.mutate({ ...alvo, tipo: 'estornar', motivo: validado.data.motivo });
    }
  }

  return (
    <PainelDeAcao aberto titulo={movimento?.motivo ?? 'Registrar transferência'} variante={varianteDoPainel(densidade)}
      aoFechar={() => { if (!mutacao.isPending) fechar(); }}>
      {sucesso ? <Aviso tom="informacao"><span role="status">{sucesso}</span></Aviso> : null}
      {mutacao.isError ? <Aviso tom="pendente"><span role="alert">{mensagemDaTransferencia(mutacao.error)}</span></Aviso> : null}
      {movimento ? <>
        <p>{formatarBRL(registro?.valor ?? movimento.valor)} · {formatarData(registro?.data ?? movimento.dataCaixa ?? movimento.registradoEm)}</p>
        <p>{movimento.conta?.nome ?? 'Sem conta de origem'} → {movimento.contaDestino?.nome ?? 'Sem conta de destino'}</p>
        {consulta.isFetching && !registro ? <p role="status">Carregando transferência…</p> : null}
        {consulta.isError && !sucesso ? <Aviso tom="pendente">Não foi possível carregar todos os dados da transferência.</Aviso> : null}
        {registro ? <p>{FINALIDADES_DA_B1.find(item => item.value === registro.finalidade)?.label}
          {registro.estornoDeId ? ' · Estorno' : ''}</p> : null}
        {!acao && !sucesso && (!podeLer || !consulta.isPending) ? <>
          {pendente && podeAlterar && registro && !registro.estornoDeId ? <Button variant="quiet" onClick={() => preparar('editar')}>{rotulos.editar}</Button> : null}
          {pendente && podeConferir && !autor ? <Button variant="quiet" onClick={() => preparar('confirmar')}>{rotulos.confirmar}</Button> : null}
          {pendente && podeConferir && autor ? <p>Outra pessoa precisa conferir esta transferência.</p> : null}
          {pendente && podeAlterar ? <Button variant="quiet" onClick={() => preparar('descartar')}>{rotulos.descartar}</Button> : null}
          {(registro?.status ?? movimento.status) === 'CONFIRMADO' && !movimento.estornoDeId && !registro?.estornoDeId && !registro?.estornadaPorId && pode('financeiro.lancamento.estornar') ?
            <Button variant="quiet" onClick={() => preparar('estornar')}>{rotulos.estornar}</Button> : null}
        </> : null}
      </> : null}
      {!movimento && !sucesso ? <FormularioDeTransferencia ocupado={mutacao.isPending} enviar={enviar} /> : null}
      {acao?.tipo === 'editar' && registro && acao.versao === versao ?
        <FormularioDeTransferencia inicial={registro} ocupado={mutacao.isPending} enviar={enviar} /> : null}
      {acao && acao.tipo !== 'editar' ? (
        <form onSubmit={evento => { evento.preventDefault(); enviar(); }}>
          {acao.tipo === 'estornar' ? <TextField label="Motivo do estorno" value={motivo} maxLength={500} required
            onChange={evento => setMotivo(evento.currentTarget.value)} density={densidade} /> : null}
          {acao.tipo === 'descartar' ? <p>O descarte remove a transferência pendente da fila.</p> : null}
          {acao.tipo === 'confirmar' ? <p>A confirmação registra o movimento nos saldos das contas.</p> : null}
          {erro ? <p role="alert">Informe o motivo do estorno.</p> : null}
          <Button type="submit" disabled={mutacao.isPending || acao.versao !== versao}>
            {acao.tipo === 'descartar' ? 'Confirmar descarte' : acao.tipo === 'estornar' ? 'Registrar estorno' : 'Confirmar movimento'}
          </Button>
        </form>
      ) : null}
      {acao ? <>
        {acao.versao !== versao ? <p role="alert">A transferência mudou. Cancele e abra a ação novamente.</p> : null}
        <Button variant="quiet" disabled={mutacao.isPending} onClick={() => { setAcao(null); mutacao.reset(); }}>Cancelar</Button>
      </> : null}
      {sucesso ? <Button variant="quiet" disabled={mutacao.isPending} onClick={fechar}>Fechar</Button> : null}
    </PainelDeAcao>
  );
}
