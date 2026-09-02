import { useMemo, useState } from 'react';
import type { TipoLancamento } from '@cdd/contracts';
import {
  SEM_CERIMONIA,
  competenciasFechadas,
  metaDaOpcao,
  opcoesDeConta,
  rotuloDaOpcao,
} from '../../mocks/opcoes';

export type CampoComPicker =
  | 'conta'
  | 'contaDestino'
  | 'grupo'
  | 'categoria'
  | 'pagamento'
  | 'cerimonia'
  | 'competencia'
  | 'pessoa'
  | 'unidade';

export interface EstadoDoFormulario {
  valor: string;
  descricao: string;
  data: string;
  contraparte: string;
  competencia: string;
  conta: string;
  contaDestino: string;
  categorias: readonly string[];
  grupo: string;
  unidade: string;
  pagamento: string;
  cerimonia: string;
  anexo: string | null;
  reembolso: boolean;
  pessoa: string;
}

export interface Recibo {
  total: number;
  tipo: TipoLancamento;
  linhas: readonly { label: string; value: string }[];
  horario: string;
}

const INICIAL: EstadoDoFormulario = {
  valor: '',
  descricao: '',
  data: '28/08/2026',
  contraparte: '',
  competencia: '08/2026',
  conta: 'cora',
  contaDestino: 'nubank',
  categorias: [],
  grupo: 'Chácara (Infraestrutura)',
  unidade: 'CDD',
  pagamento: 'Pix',
  cerimonia: SEM_CERIMONIA,
  anexo: null,
  reembolso: false,
  pessoa: 'Lucia Prado',
};

/** O que a IA propõe a partir do comprovante — o humano aceita item a item. */
export const SUGESTOES_DO_CUPOM = {
  valor: '187,40',
  descricao: 'mercado cerimônia mãe divina',
  contraparte: 'Assaí Atacadista',
  categoria: 'Alimentação de cerimônia',
} as const;

export type ChaveSugerida = keyof typeof SUGESTOES_DO_CUPOM;

const somar = (valor: string): number =>
  valor
    .split('+')
    .map((parcela) => parseFloat(parcela.replace(/\./g, '').replace(',', '.')) || 0)
    .reduce((a, b) => a + b, 0);

export function useFormularioDeLancamento() {
  const [tipo, setTipo] = useState<TipoLancamento>('SAIDA');
  const [campos, setCampos] = useState<EstadoDoFormulario>(INICIAL);
  const [picker, setPicker] = useState<CampoComPicker | null>(null);
  const [resolvidas, setResolvidas] = useState<readonly ChaveSugerida[]>([]);
  const [recibo, setRecibo] = useState<Recibo | null>(null);

  const alterar = <K extends keyof EstadoDoFormulario>(campo: K, valor: EstadoDoFormulario[K]) =>
    setCampos((c) => ({ ...c, [campo]: valor }));

  const trocarTipo = (novo: TipoLancamento) => {
    setTipo(novo);
    setPicker(null);
    setCampos((c) => {
      if (novo === 'TRANSFERENCIA') {
        return {
          ...c,
          reembolso: false,
          cerimonia: SEM_CERIMONIA,
          pagamento: 'Pix',
          contaDestino: c.conta === c.contaDestino ? (c.conta === 'cora' ? 'nubank' : 'cora') : c.contaDestino,
        };
      }
      if (novo === 'ENTRADA') return { ...c, reembolso: false, pagamento: 'Pix' };
      return c;
    });
  };

  const alternarCategoria = (categoria: string) =>
    setCampos((c) => ({
      ...c,
      categorias: c.categorias.includes(categoria)
        ? c.categorias.filter((x) => x !== categoria)
        : [...c.categorias, categoria],
    }));

  const aceitarSugestao = (chave: ChaveSugerida) => {
    setResolvidas((r) => [...r, chave]);
    if (chave === 'categoria') alternarCategoria(SUGESTOES_DO_CUPOM.categoria);
    else alterar(chave, SUGESTOES_DO_CUPOM[chave]);
  };

  const descartarSugestao = (chave: ChaveSugerida) => setResolvidas((r) => [...r, chave]);

  const aceitarTodas = () => {
    setResolvidas(['valor', 'descricao', 'contraparte', 'categoria']);
    setCampos((c) => ({
      ...c,
      valor: SUGESTOES_DO_CUPOM.valor,
      descricao: SUGESTOES_DO_CUPOM.descricao,
      contraparte: SUGESTOES_DO_CUPOM.contraparte,
      categorias: c.categorias.includes(SUGESTOES_DO_CUPOM.categoria)
        ? c.categorias
        : [...c.categorias, SUGESTOES_DO_CUPOM.categoria],
    }));
  };

  const limpar = () => {
    setCampos(INICIAL);
    setResolvidas([]);
    setPicker(null);
    setRecibo(null);
  };

  const derivado = useMemo(() => {
    const ehTransferencia = tipo === 'TRANSFERENCIA';
    const ehEntrada = tipo === 'ENTRADA';
    const ehSaida = tipo === 'SAIDA';

    const composto = campos.valor.includes('+');
    const mesmaConta = ehTransferencia && campos.conta === campos.contaDestino;
    const semCategoria = campos.categorias.length === 0 && !ehTransferencia;
    const competenciaFechada = competenciasFechadas.includes(campos.competencia);

    const conta = rotuloDaOpcao(opcoesDeConta, campos.conta);
    const contaDestino = rotuloDaOpcao(opcoesDeConta, campos.contaDestino);

    const bloqueado = competenciaFechada || composto || mesmaConta;
    const motivoBloqueio = competenciaFechada
      ? 'Julho está fechado. Um administrador pode reabrir, e o motivo fica registrado.'
      : mesmaConta
        ? 'Origem e destino precisam ser contas diferentes.'
        : composto
          ? 'O valor composto precisa virar um número só antes de gravar consolidado.'
          : undefined;

    return {
      ehTransferencia,
      ehEntrada,
      ehSaida,
      composto,
      mesmaConta,
      semCategoria,
      competenciaFechada,
      conta,
      contaDestino,
      bloqueado,
      motivoBloqueio,
      total: somar(campos.valor),

      temGrupo: !ehTransferencia,
      temCategoria: !ehTransferencia,
      temCerimonia: !ehTransferencia,
      temContraparte: !ehTransferencia,
      temReembolso: ehSaida,

      notaTipo: ehTransferencia
        ? 'Dinheiro que sai de uma conta da casa e entra em outra. Não é despesa nem receita: o total não muda, só o lugar onde o dinheiro está.'
        : ehEntrada
          ? 'Dinheiro que entrou: doação, venda da lojinha, contribuição de cerimônia.'
          : 'Dinheiro que saiu para fora da casa.',
      labelValor: ehTransferencia ? 'Quanto transferir' : ehEntrada ? 'Quanto entrou' : 'Quanto foi',
      labelDescricao: ehTransferencia ? 'Motivo da transferência' : ehEntrada ? 'De onde veio' : 'O que foi',
      placeholderDescricao: ehTransferencia
        ? 'repasse do caixa da lojinha para o Cora'
        : ehEntrada
          ? 'contribuições da cerimônia de agosto'
          : 'mercado cerimônia mãe divina',
      labelData: ehTransferencia ? 'Data da transferência' : ehEntrada ? 'Data da entrada' : 'Data do gasto',
      labelContraparte: ehEntrada ? 'De quem veio' : 'Fornecedor',
      placeholderContraparte: ehEntrada ? 'quem entregou o dinheiro' : 'quem recebeu o dinheiro',
      labelConta: ehTransferencia ? 'Conta de origem' : ehEntrada ? 'Conta de entrada' : 'Conta de saída',
      labelPagamento: ehTransferencia
        ? 'Forma da transferência'
        : ehEntrada
          ? 'Forma de recebimento'
          : 'Forma de pagamento',
      notaGrupo: ehEntrada ? 'De onde veio a entrada. Um por lançamento.' : 'Onde o gasto aconteceu. Um por lançamento.',
      notaConta: ehTransferencia ? 'De onde o dinheiro sai.' : metaDaOpcao(opcoesDeConta, campos.conta),
      notaContaDestino: mesmaConta
        ? 'Escolha uma conta diferente da origem.'
        : metaDaOpcao(opcoesDeConta, campos.contaDestino),
      notaCompetencia: competenciaFechada ? 'Veio da data do gasto — julho está fechado.' : 'Mês corrente.',
      notaBarra: bloqueado
        ? 'Enquanto isso não se resolve, dá para salvar como rascunho — nada se perde.'
        : ehTransferencia
          ? `Grava os dois lados de uma vez: saída em ${conta} e entrada em ${contaDestino}.`
          : semCategoria
            ? 'Nada bloqueia o registro. Sem categoria, grava e marca como não classificado.'
            : 'Consolidado é definitivo: depois de gravado, só estorno.',
    };
  }, [tipo, campos]);

  const sugestoesPendentes = useMemo(() => {
    if (!campos.anexo) return [];
    const todas: readonly { chave: ChaveSugerida; texto: string }[] = [
      { chave: 'valor', texto: `Valor ${SUGESTOES_DO_CUPOM.valor}` },
      { chave: 'descricao', texto: `Descrição: ${SUGESTOES_DO_CUPOM.descricao}` },
      { chave: 'contraparte', texto: `Fornecedor: ${SUGESTOES_DO_CUPOM.contraparte}` },
      { chave: 'categoria', texto: `Categoria: ${SUGESTOES_DO_CUPOM.categoria.toLowerCase()}` },
    ];
    return todas.filter((s) => !resolvidas.includes(s.chave));
  }, [campos.anexo, resolvidas]);

  const registrar = () => {
    const { ehTransferencia, ehEntrada, conta, contaDestino, total } = derivado;
    const linhas = ehTransferencia
      ? [
          { label: 'Tipo', value: 'Transferência entre contas' },
          { label: 'Motivo', value: campos.descricao || '—' },
          { label: 'Data', value: campos.data },
          { label: 'Saiu de', value: conta },
          { label: 'Entrou em', value: contaDestino },
          ...(campos.anexo ? [{ label: 'Comprovante', value: campos.anexo }] : []),
        ]
      : ehEntrada
        ? [
            { label: 'Tipo', value: 'Entrada' },
            { label: 'De onde veio', value: campos.descricao || '—' },
            { label: 'Data', value: campos.data },
            { label: 'Grupo', value: campos.grupo },
            { label: 'Conta de entrada', value: `${conta} · ${campos.pagamento}` },
            { label: 'Cerimônia', value: campos.cerimonia },
          ]
        : [
            { label: 'O que foi', value: campos.descricao || '—' },
            { label: 'Data', value: campos.data },
            { label: 'Grupo', value: campos.grupo },
            { label: 'Categoria', value: campos.categorias.join(', ') || 'não classificado' },
            { label: 'Conta', value: `${conta} · ${campos.pagamento}` },
            { label: 'Cerimônia', value: campos.cerimonia },
            ...(campos.anexo ? [{ label: 'Comprovante', value: campos.anexo }] : []),
          ];

    setRecibo({
      total,
      tipo,
      linhas,
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
    setCampos(INICIAL);
    setResolvidas([]);
    setPicker(null);
  };

  return {
    tipo,
    campos,
    picker,
    recibo,
    sugestoesPendentes,
    ...derivado,
    alterar,
    trocarTipo,
    alternarCategoria,
    aceitarSugestao,
    descartarSugestao,
    aceitarTodas,
    abrirPicker: setPicker,
    fecharPicker: () => setPicker(null),
    limpar,
    registrar,
    descartarRecibo: () => setRecibo(null),
  };
}
