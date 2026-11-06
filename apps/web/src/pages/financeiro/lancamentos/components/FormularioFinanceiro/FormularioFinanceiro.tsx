import { useState } from 'react';
import { DadosDoLancamento, type Categoria, type Conta, type GrupoDeCusto, type RegistroDeLancamento, type Unidade } from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { AmountInput, Aviso, Button, Select, TextField, useDensidade } from '@/ds';
import { lerSoma, lerValorDigitado } from '@/lib/numero';
import { useItensDoCadastro } from '@/pages/components/CadastroDaApi';

interface Props {
  readonly inicial?: RegistroDeLancamento;
  readonly ocupado: boolean;
  readonly enviar: (dados: DadosDoLancamento) => void;
}

const semValor = { value: '', label: 'A definir na conferência' };
const tipos = [{ value: 'DESPESA', label: 'Saída' }, { value: 'RECEITA', label: 'Entrada' }];
const parcelaValida = (parcela: string) => lerValorDigitado(parcela) > 0 && !/,\d{3,}$/.test(parcela.trim());
const emReais = (valor: number) => (valor / 100).toFixed(2).replace('.', ',');

export function FormularioFinanceiro({ inicial, ocupado, enviar }: Props) {
  const { pode } = useSessao();
  const densidade = useDensidade();
  const podeLerPlano = pode('financeiro.plano_contas.ler');
  const podeLerContas = pode('financeiro.conta.ler');
  const unidades = useItensDoCadastro<Unidade>('/financeiro/unidades', podeLerPlano);
  const grupos = useItensDoCadastro<GrupoDeCusto>('/financeiro/grupos-de-custo', podeLerPlano);
  const categorias = useItensDoCadastro<Categoria>('/financeiro/categorias', podeLerPlano);
  const contas = useItensDoCadastro<Conta>('/financeiro/contas', podeLerContas);
  const [natureza, setNatureza] = useState<string>(inicial?.natureza ?? 'DESPESA');
  const [valor, setValor] = useState(inicial ? emReais(inicial.valor) : '');
  const [unidade, setUnidade] = useState<string | undefined>(inicial ? inicial.unidadeId ?? '' : undefined);
  const [conta, setConta] = useState<string>(inicial?.contaId ?? '');
  const [grupo, setGrupo] = useState<string>(inicial?.grupoDeCustoId ?? '');
  const [etiquetas, setEtiquetas] = useState<Record<string, string>>(() =>
    Object.fromEntries(inicial?.etiquetas.map(item => [item.categoriaId, emReais(item.valor)]) ?? []));
  const [erro, setErro] = useState<string | null>(null);
  const unidadesAtivas = unidades.data?.itens.filter(item => item.ativa) ?? [];
  const unidadeEscolhida = unidade ?? (unidadesAtivas.length === 1 ? unidadesAtivas[0]?.id ?? '' : '');
  const consultasComErro = [unidades, grupos, categorias, contas].filter(consulta => consulta.isError);

  function salvar(campos: FormData) {
    const dados = DadosDoLancamento.safeParse({
      ...inicial,
      natureza,
      valor: Math.round(lerSoma(valor) * 100),
      motivo: campos.get('motivo'),
      contraparteTexto: inicial?.pessoaId ? inicial.contraparteTexto : campos.get('contraparte') || null,
      formaPagamento: campos.get('pagamento') || null,
      dataCompetencia: campos.get('competencia') || null,
      dataCaixa: campos.get('caixa') || null,
      unidadeId: unidadeEscolhida || null,
      contaId: conta || null,
      grupoDeCustoId: grupo || null,
      etiquetas: Object.entries(etiquetas).filter(([, valorDaEtiqueta]) => valorDaEtiqueta.trim()).map(([categoriaId, valorDaEtiqueta]) =>
        ({ categoriaId, valor: parcelaValida(valorDaEtiqueta) ? Math.round(lerValorDigitado(valorDaEtiqueta) * 100) : Number.NaN })),
    });
    if (!dados.success || !valor.split('+').every(parcelaValida)) {
      const campo = dados.success ? 'valor' : dados.error.issues[0]?.path[0];
      const rotulos: Record<string, string> = {
        valor: 'Valor', motivo: 'Motivo', etiquetas: 'Valores por categoria', dataCompetencia: 'Data de competência',
        dataCaixa: 'Data de caixa', contraparteTexto: 'Contraparte', formaPagamento: 'Forma de pagamento',
      };
      setErro(`Confira o campo “${rotulos[String(campo)] ?? 'Dados do lançamento'}”.`);
      return;
    }
    setErro(null);
    enviar(dados.data);
  }

  return (
    <form style={{ display: 'grid', gap: 12 }} onSubmit={evento => {
      evento.preventDefault();
      if (!ocupado) salvar(new FormData(evento.currentTarget));
    }}>
      <fieldset disabled={ocupado} style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: 12 }}>
        <Select label="Tipo de lançamento" value={natureza} options={tipos} onChange={setNatureza} density={densidade} />
        <AmountInput label="Valor" value={valor} onChange={setValor} sumLabel="Total da soma" sumNote="Confira o total antes de gravar." />
        <TextField label="Motivo" name="motivo" defaultValue={inicial?.motivo} density={densidade} />
        <TextField label="Data de competência" name="competencia" type="date" defaultValue={inicial?.dataCompetencia ?? ''} density={densidade} />
        <TextField label="Data de caixa" name="caixa" type="date" defaultValue={inicial?.dataCaixa ?? ''} density={densidade} />
        {inicial?.pessoaId ? null : <TextField label="Contraparte" name="contraparte" defaultValue={inicial?.contraparteTexto ?? ''} density={densidade} />}
        <TextField label="Forma de pagamento" name="pagamento" defaultValue={inicial?.formaPagamento ?? ''} density={densidade} />
        {podeLerPlano && unidades.data ? <Select label="Unidade" value={unidadeEscolhida} onChange={setUnidade} density={densidade}
          options={[semValor, ...unidades.data.itens.filter(item => item.ativa || item.id === unidadeEscolhida).map(item => ({ value: item.id, label: item.nome }))]} /> : null}
        {podeLerContas && contas.data ? <Select label="Conta" value={conta} onChange={setConta} density={densidade}
          options={[semValor, ...contas.data.itens.filter(item => item.ativa || item.id === conta).map(item => ({ value: item.id, label: item.nome }))]} /> : null}
        {podeLerPlano && grupos.data ? <Select label="Grupo de custo" value={grupo} onChange={setGrupo} density={densidade}
          options={[semValor, ...grupos.data.itens.filter(item => item.ativo || item.id === grupo).map(item => ({ value: item.id, label: item.nome }))]} /> : null}
        {podeLerPlano && categorias.data?.itens.length ? <details>
          <summary>Valores por categoria</summary>
          {categorias.data.itens.filter(item => item.ativa || item.id in etiquetas).map(item => (
            <TextField key={item.id} label={`${item.nome} (${item.natureza === 'RECEITA' ? 'receita' : 'despesa'})`}
              inputMode="decimal" value={etiquetas[item.id] ?? ''} density={densidade}
              onChange={evento => {
                const texto = evento.currentTarget.value;
                setEtiquetas(atuais => ({ ...atuais, [item.id]: texto }));
              }} />
          ))}
        </details> : null}
        {consultasComErro.length ? <Aviso tom="pendente">Algumas opções estão indisponíveis.
          <Button variant="quiet" onClick={() => { for (const consulta of consultasComErro) void consulta.refetch(); }}>Recarregar opções</Button>
        </Aviso> : null}
        {erro ? <Aviso tom="pendente"><span role="alert">{erro}</span></Aviso> : null}
        <Button type="submit" density={densidade}>{ocupado ? 'Salvando…' : inicial ? 'Salvar ajustes' : 'Registrar lançamento'}</Button>
      </fieldset>
    </form>
  );
}
