import { useQuery } from '@tanstack/react-query';
import type { RegistrarTransferencia, Transferencia } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { criarComando, criarConsulta, ErroDaApi, type ClienteHttp } from '@/dados';

const raiz = '/financeiro/transferencias';
const caminho = (id: string) => `${raiz}/${encodeURIComponent(id)}`;
type Alvo = { id: string; versao: number };

export function useTransferencia(id: string | undefined, habilitada: boolean) {
  const consultar = criarConsulta(useClienteHttp());
  return useQuery({ ...consultar<Transferencia>(caminho(id ?? ''), ['lancamentos', 'transferencia', id]),
    enabled: Boolean(id) && habilitada });
}

export function comandosDeTransferencia(cliente: ClienteHttp) {
  const comando = criarComando(cliente);
  return {
    registrar: comando<RegistrarTransferencia, Transferencia | undefined>({ metodo: 'POST', caminho: raiz, corpo: dados => dados }),
    editar: comando<Alvo & { dados: RegistrarTransferencia }, Transferencia>({
      metodo: 'PUT', caminho: alvo => caminho(alvo.id), versao: alvo => alvo.versao, corpo: alvo => alvo.dados,
    }),
    confirmar: comando<Alvo, Transferencia | undefined>({
      metodo: 'POST', caminho: alvo => `${caminho(alvo.id)}/confirmar`, versao: alvo => alvo.versao, corpo: () => ({}),
    }),
    descartar: comando<Alvo, unknown>({ metodo: 'DELETE', caminho: alvo => caminho(alvo.id), versao: alvo => alvo.versao }),
    estornar: comando<Alvo & { motivo: string }, Transferencia | undefined>({
      metodo: 'POST', caminho: alvo => `${caminho(alvo.id)}/estornar`, versao: alvo => alvo.versao, corpo: alvo => ({ motivo: alvo.motivo }),
    }),
  };
}

export function mensagemDaTransferencia(erro: unknown) {
  if (erro instanceof ErroDaApi) {
    switch (erro.codigo) {
      case 'CONFERENTE_E_O_AUTOR': return 'Outra pessoa precisa conferir esta transferência.';
      case 'VERSAO_DESATUALIZADA': return 'A transferência mudou. Feche e abra o detalhe atualizado.';
      case 'PERIODO_FECHADO': return 'O período de uma das unidades está fechado.';
      case 'REPASSE_NA_MESMA_UNIDADE': return 'Selecione duas unidades diferentes para o repasse.';
      case 'CADASTRO_INATIVO': return 'Uma das contas, unidades ou fundos está inativa.';
      case 'TRANSFERENCIA_JA_ESTORNADA': return 'Esta transferência já tem um estorno registrado.';
      case 'ORIGEM_NAO_EDITAVEL': return 'Os dados de um estorno de transferência são fixos.';
      case 'SEM_PERMISSAO': return 'Seu acesso não permite esta operação.';
    }
  }
  return 'Não foi possível concluir a operação. Confira os dados e tente novamente.';
}
