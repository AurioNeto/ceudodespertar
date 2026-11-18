import { useState } from 'react';
import { RegistrarTransferencia, type Conta, type Fundo, type Transferencia, type Unidade } from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, Select, TextField, useDensidade } from '@/ds';
import { lerValorDigitado } from '@/lib/numero';
import { useItensDoCadastro } from '@/pages/components/CadastroDaApi';

export const FINALIDADES_DA_B1 = [
  { value: 'MOVIMENTACAO_SIMPLES', label: 'Movimentação entre contas' },
  { value: 'APORTE_A_FUNDO', label: 'Aporte a fundo' },
  { value: 'REPASSE_ENTRE_UNIDADES', label: 'Repasse entre unidades' },
];

const selecionar = { value: '', label: 'Selecione' };
const opcoes = (itens: readonly { id: string; nome: string }[]) =>
  [selecionar, ...itens.map(item => ({ value: item.id, label: item.nome }))];

export function FormularioDeTransferencia({ inicial, ocupado, enviar }: {
  readonly inicial?: Transferencia;
  readonly ocupado: boolean;
  readonly enviar: (dados: RegistrarTransferencia) => void;
}) {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const [finalidade, setFinalidade] = useState<string>(inicial?.finalidade ?? 'MOVIMENTACAO_SIMPLES');
  const [origem, setOrigem] = useState<string>(inicial?.contaOrigemId ?? '');
  const [destino, setDestino] = useState<string>(inicial?.contaDestinoId ?? '');
  const [unidade, setUnidade] = useState<string>(inicial?.unidadeId ?? '');
  const [unidadeDestino, setUnidadeDestino] = useState<string>(inicial?.unidadeDestinoId ?? '');
  const [fundo, setFundo] = useState<string>(inicial?.fundoId ?? '');
  const [erro, setErro] = useState('');
  const aporte = finalidade === 'APORTE_A_FUNDO';
  const repasse = finalidade === 'REPASSE_ENTRE_UNIDADES';
  const podeLerContas = pode('financeiro.conta.ler');
  const podeLerUnidades = pode('financeiro.plano_contas.ler');
  const contas = useItensDoCadastro<Conta>('/financeiro/contas', podeLerContas);
  const unidades = useItensDoCadastro<Unidade>('/financeiro/unidades', podeLerUnidades);
  const fundos = useItensDoCadastro<Fundo>('/financeiro/fundos', aporte && podeLerContas);
  const contasAtivas = contas.data?.itens.filter(item => item.ativa) ?? [];
  const unidadesAtivas = unidades.data?.itens.filter(item => item.ativa) ?? [];
  const fundosAtivos = fundos.data?.itens.filter(item => item.ativo && contasAtivas.some(conta => conta.id === item.contaVinculadaId)) ?? [];
  const contaDoFundo = fundosAtivos.find(item => item.id === fundo)?.contaVinculadaId;
  const falhas = [contas, unidades, ...(aporte ? [fundos] : [])].filter(consulta => consulta.isError);

  if (!podeLerContas || !podeLerUnidades) {
    return <Aviso tom="pendente">Para preencher a transferência, seu perfil precisa ler contas e unidades.</Aviso>;
  }

  function salvar(campos: FormData) {
    const valor = String(campos.get('valor') ?? '').trim();
    const validado = RegistrarTransferencia.safeParse({
      finalidade, valor: /,\d{3,}$/.test(valor) ? Number.NaN : Math.round(lerValorDigitado(valor) * 100),
      data: campos.get('data'), motivo: campos.get('motivo'),
      contaOrigemId: origem || null, contaDestinoId: aporte ? contaDoFundo ?? null : destino || null,
      unidadeId: unidade, unidadeDestinoId: repasse ? unidadeDestino || null : null, fundoId: aporte ? fundo || null : null,
    });
    if (repasse && unidade && unidade === unidadeDestino) {
      setErro('Selecione unidades diferentes para o repasse.');
      return;
    }
    if (!validado.success) {
      setErro('Confira o valor, a data, o motivo e os vínculos da transferência. As contas precisam ser diferentes.');
      return;
    }
    setErro('');
    enviar(validado.data);
  }

  return (
    <form onSubmit={evento => { evento.preventDefault(); if (!ocupado) salvar(new FormData(evento.currentTarget)); }}>
      <fieldset disabled={ocupado || !contas.data || !unidades.data || (aporte && !fundos.data)}
        style={{ display: 'grid', gap: 12, margin: 0, padding: 0, border: 0 }}>
        <Select label="Finalidade" value={finalidade} options={FINALIDADES_DA_B1} onChange={setFinalidade} density={densidade} />
        <Select label="Unidade de origem" value={unidade} options={opcoes(unidadesAtivas)} onChange={setUnidade} density={densidade} />
        {repasse ? <Select label="Unidade de destino" value={unidadeDestino} options={opcoes(unidadesAtivas)} onChange={setUnidadeDestino} density={densidade} /> : null}
        <Select label="Conta de origem" value={origem} options={opcoes(contasAtivas)} onChange={setOrigem} density={densidade} />
        {aporte ? <>
          <Select label="Fundo" value={fundo} options={opcoes(fundosAtivos)} onChange={setFundo} density={densidade} />
          {contaDoFundo ? <p>Conta de destino: {contasAtivas.find(conta => conta.id === contaDoFundo)?.nome}</p> : null}
        </> : <Select label="Conta de destino" value={destino} options={opcoes(contasAtivas)} onChange={setDestino} density={densidade} />}
        <TextField label="Valor em reais" name="valor" inputMode="decimal" density={densidade}
          defaultValue={inicial ? (inicial.valor / 100).toFixed(2).replace('.', ',') : ''} required />
        <TextField label="Data" name="data" type="date" density={densidade} defaultValue={inicial?.data} required />
        <TextField label="Motivo" name="motivo" maxLength={500} density={densidade} defaultValue={inicial?.motivo} required />
        {erro ? <Aviso tom="pendente"><span role="alert">{erro}</span></Aviso> : null}
        <Button type="submit">{ocupado ? 'Salvando…' : inicial ? 'Salvar ajustes' : 'Registrar transferência'}</Button>
      </fieldset>
      {falhas.length ? <Aviso tom="pendente">Não foi possível carregar as opções.
        <Button variant="quiet" onClick={() => { for (const falha of falhas) void falha.refetch(); }}>Tentar novamente</Button>
      </Aviso> : null}
    </form>
  );
}
