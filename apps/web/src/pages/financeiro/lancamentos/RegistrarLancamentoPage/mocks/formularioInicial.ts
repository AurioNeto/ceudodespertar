import type { EstadoDoFormulario } from '../utils/regrasDoLancamento';
import { SEM_CERIMONIA } from './opcoes';

export const INICIAL: EstadoDoFormulario = {
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
