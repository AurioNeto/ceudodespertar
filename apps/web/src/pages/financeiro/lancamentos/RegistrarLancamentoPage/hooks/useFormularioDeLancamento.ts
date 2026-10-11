import { useMemo, useState } from 'react';
import type { TipoLancamento } from '@cdd/contracts';
import { INICIAL } from '../mocks/formularioInicial';
import { SEM_CERIMONIA } from '../mocks/opcoes';
import { SUGESTOES_DO_CUPOM, type ChaveSugerida } from '../mocks/sugestoesDoCupom';
import { regrasDoLancamento, type EstadoDoFormulario } from '../utils/regrasDoLancamento';
import { textosPorTipo } from '../utils/textosPorTipo';

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

export interface Recibo {
  total: number;
  tipo: TipoLancamento;
  linhas: readonly { label: string; value: string }[];
  horario: string;
}

export function useFormularioDeLancamento(consolida: boolean) {
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
    const regras = regrasDoLancamento(tipo, campos, consolida);
    return { ...regras, ...textosPorTipo(regras, campos, consolida) };
  }, [tipo, campos, consolida]);

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
