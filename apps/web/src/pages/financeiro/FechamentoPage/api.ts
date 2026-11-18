import type { IntegridadeDoPeriodo, ParametrosDoPeriodo, PeriodoContabil } from '@cdd/contracts';
import { useQuery } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { criarComando, criarConsulta, ErroDaApi, type ClienteHttp } from '@/dados';

const caminho = ({ unidadeId, competencia }: ParametrosDoPeriodo) => `/financeiro/periodos/${unidadeId}/${competencia}`;
export const chaveDoPeriodo = (chave: ParametrosDoPeriodo) => ['periodos', chave.unidadeId, chave.competencia] as const;

export function usePeriodo(chave: ParametrosDoPeriodo) {
  const definicao = criarConsulta(useClienteHttp())<PeriodoContabil>(caminho(chave), chaveDoPeriodo(chave));
  return useQuery({
    ...definicao,
    queryFn: async contexto => {
      try {
        return await definicao.queryFn(contexto);
      } catch (erro) {
        if (erro instanceof ErroDaApi && erro.codigo === 'RECURSO_NAO_ENCONTRADO' &&
          erro.detalhes?.['periodoAindaNaoCriado'] === true) return null;
        throw erro;
      }
    },
  });
}

export function useIntegridade(chave: ParametrosDoPeriodo, versao: number | undefined) {
  return useQuery({
    ...criarConsulta(useClienteHttp())<IntegridadeDoPeriodo>(`${caminho(chave)}/integridade`, [...chaveDoPeriodo(chave), 'integridade', versao]),
    enabled: false,
  });
}

type Alteracao = { versao: number; motivo?: string };

export function comandosDoPeriodo(cliente: ClienteHttp, chave: ParametrosDoPeriodo) {
  const comando = criarComando(cliente);
  const versao = (dados: Alteracao) => dados.versao;
  return {
    fechar: comando<Alteracao, PeriodoContabil | undefined>({
      metodo: 'POST', caminho: `${caminho(chave)}/fechar`, versao, corpo: () => ({}),
    }),
    reabrir: comando<Alteracao, PeriodoContabil | undefined>({
      metodo: 'POST', caminho: `${caminho(chave)}/reabrir`, versao, corpo: dados => ({ motivo: dados.motivo }),
    }),
  };
}

export function mensagemDoPeriodo(erro: unknown) {
  if (erro instanceof ErroDaApi) {
    switch (erro.codigo) {
      case 'PERIODO_COM_PENDENCIAS': {
        const quantidade = erro.detalhes?.['quantidade'];
        return typeof quantidade === 'number' && quantidade > 0
          ? `Resolva os movimentos a conferir antes de fechar. Pendências: ${quantidade}.`
          : 'Resolva os movimentos a conferir antes de fechar.';
      }
      case 'PERIODO_ANTERIOR_ABERTO': return 'Feche a competência anterior desta unidade primeiro.';
      case 'VERSAO_DESATUALIZADA': return 'O período mudou. Abra a ação novamente após a atualização.';
      case 'PERIODO_JA_FECHADO': return 'Este período já foi fechado.';
      case 'PERIODO_NAO_FECHADO': return 'Este período já está aberto.';
      case 'RECURSO_NAO_ENCONTRADO': return 'Não foi possível localizar a unidade ou o período.';
      case 'SEM_PERMISSAO': return 'Seu acesso não permite esta operação.';
    }
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
