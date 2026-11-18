import { useQuery } from '@tanstack/react-query';
import { ParametrosDoLancamento, type MovimentoNaConsulta, type DadosDoLancamento, type PaginaFinanceira, type RegistroDeLancamento } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { criarComando, criarConsulta, ErroDaApi, type ClienteHttp } from '@/dados';

const caminho = '/financeiro/lancamentos';
const detalhe = (id: string) => `${caminho}/${encodeURIComponent(id)}`;
const prefixoDoRecibo = `/api/v1${caminho}/`;
const versaoInicialDoLancamento = 1;

export type ReciboDoLancamento = Pick<RegistroDeLancamento, 'id' | 'motivo' | 'valor' | 'versao'>;

export function useListaFinanceira<T>(lista: 'meus-registros' | 'fila-conferencia', pagina: number) {
  return useQuery(criarConsulta(useClienteHttp())<PaginaFinanceira<T>>(
    `/financeiro/${lista}?pagina=${pagina}`, ['lancamentos', lista, pagina],
  ));
}

export function useLivroFinanceiro(pagina: number, competencia: string, unidadeId: string) {
  const parametros = new URLSearchParams({ pagina: String(pagina) });
  if (competencia) parametros.set('competencia', competencia);
  if (unidadeId) parametros.set('unidadeId', unidadeId);
  return useQuery(criarConsulta(useClienteHttp())<PaginaFinanceira<MovimentoNaConsulta>>(
    `/financeiro/lancamentos?${parametros}`, ['lancamentos', 'livro', pagina, competencia, unidadeId],
  ));
}

export function useDetalheDoLancamento(id: string | null) {
  const consultar = criarConsulta(useClienteHttp());
  return useQuery({ ...consultar<RegistroDeLancamento>(detalhe(id ?? ''), ['lancamentos', 'detalhe', id]), enabled: id !== null });
}

export type AcaoDoDetalhe = { tipo: 'estornar' } | { tipo: 'abrir' } | { tipo: 'responder'; pendenciaId: string };

interface ComandoDoDetalhe {
  readonly id: string;
  readonly versao: number;
  readonly acao: AcaoDoDetalhe;
  readonly texto: string;
}

export function comandosDoLancamento(cliente: ClienteHttp) {
  const comando = criarComando(cliente);
  const registrar = comando<DadosDoLancamento, ReciboDoLancamento | undefined>({ metodo: 'POST', caminho, corpo: dados => dados });
  type Alteracao = { id: string; versao: number; dados: unknown };
  return {
    anexar: comando<{ id: string; versao: number; arquivo: File }, RegistroDeLancamento>({
      metodo: 'PUT', caminho: entrada => `${detalhe(entrada.id)}/comprovante`, versao: entrada => entrada.versao,
      corpo: ({ arquivo }) => {
        const dados = new FormData();
        dados.set('arquivo', arquivo);
        return dados;
      },
    }),
    async registrar(dados: DadosDoLancamento, chaveDeIdempotencia: string): Promise<ReciboDoLancamento | undefined> {
      let localizacao: string | undefined;
      const recibo = await registrar(dados, {
        chaveDeIdempotencia,
        aoReceberLocalizacao: valor => { localizacao = valor; },
      });
      if (recibo || !localizacao?.startsWith(prefixoDoRecibo)) return recibo;

      const parametros = ParametrosDoLancamento.safeParse({ id: localizacao.slice(prefixoDoRecibo.length) });
      if (!parametros.success) return undefined;
      return { ...parametros.data, motivo: dados.motivo, valor: dados.valor, versao: versaoInicialDoLancamento };
    },
    acionar: comando<ComandoDoDetalhe, RegistroDeLancamento | undefined>({
      metodo: 'POST',
      caminho: ({ id, acao }) => `${detalhe(id)}/${acao.tipo === 'estornar' ? 'estornar' : acao.tipo === 'abrir'
        ? 'pendencias' : `pendencias/${encodeURIComponent(acao.pendenciaId)}/resposta`}`,
      versao: entrada => entrada.versao,
      corpo: ({ acao, texto }) => acao.tipo === 'estornar' ? { motivo: texto } : { texto },
    }),
    editar: comando<Alteracao, RegistroDeLancamento>({ metodo: 'PUT', caminho: entrada => detalhe(entrada.id),
      versao: entrada => entrada.versao, corpo: entrada => entrada.dados }),
    confirmar: comando<{ id: string; versao: number }, RegistroDeLancamento | undefined>({ metodo: 'POST',
      caminho: entrada => `${detalhe(entrada.id)}/confirmar`, versao: entrada => entrada.versao, corpo: () => ({}) }),
  };
}

export function mensagemDeFalha(erro: unknown): string {
  if (erro instanceof ErroDaApi) {
    switch (erro.codigo) {
      case 'CAIXA_ANTES_DA_COMPETENCIA': return 'A data de caixa não pode ser anterior à data de competência.';
      case 'PERIODO_FECHADO': return 'O período está fechado. Confira a unidade e a data de competência.';
      case 'VERSAO_DESATUALIZADA': return 'O lançamento mudou. Reabra o registro atualizado.';
      case 'LANCAMENTO_INCOMPLETO': return 'Complete os dados e resolva as pendências antes de confirmar.';
      case 'ETIQUETAS_NAO_FECHAM': return 'Os valores das categorias precisam fechar com o total.';
      case 'CATEGORIA_FORA_DO_REGIME': return 'Uma categoria não é permitida no regime da unidade.';
      case 'CORPO_GRANDE_DEMAIS': return 'O comprovante excede o limite de tamanho.';
      case 'LANCAMENTO_JA_ESTORNADO': return 'Este lançamento já foi estornado.';
      case 'PENDENCIA_JA_ABERTA': return 'Já existe uma pendência em aberto.';
      case 'PENDENCIA_SO_DO_DESTINATARIO': return 'Somente o destinatário pode responder à pendência.';
      case 'SEM_PERMISSAO': return 'Seu acesso não permite esta operação.';
    }
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
