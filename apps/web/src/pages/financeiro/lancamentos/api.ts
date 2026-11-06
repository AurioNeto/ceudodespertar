import { useQuery } from '@tanstack/react-query';
import type { PaginaFinanceira, RegistroDeLancamento } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { criarComando, criarConsulta, ErroDaApi, type ClienteHttp } from '@/dados';

const caminho = '/financeiro/lancamentos';
const detalhe = (id: string) => `${caminho}/${encodeURIComponent(id)}`;

export function useListaFinanceira<T>(lista: 'meus-registros' | 'fila-conferencia', pagina: number) {
  return useQuery(criarConsulta(useClienteHttp())<PaginaFinanceira<T>>(
    `/financeiro/${lista}?pagina=${pagina}`, ['lancamentos', lista, pagina],
  ));
}

export function useDetalheDoLancamento(id: string | null) {
  const consultar = criarConsulta(useClienteHttp());
  return useQuery({ ...consultar<RegistroDeLancamento>(detalhe(id ?? ''), ['lancamentos', 'detalhe', id]), enabled: id !== null });
}

export function comandosDoLancamento(cliente: ClienteHttp) {
  const comando = criarComando(cliente);
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
    registrar: comando<unknown, RegistroDeLancamento | undefined>({ metodo: 'POST', caminho, corpo: dados => dados }),
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
      case 'SEM_PERMISSAO': return 'Seu acesso não permite esta operação.';
    }
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
