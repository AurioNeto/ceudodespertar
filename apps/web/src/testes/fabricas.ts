import type { CodigoDeErro } from '@cdd/contracts';
import { ErroDaApi } from '@/dados/erros';

export const erroDaApi = (status: number, codigo: CodigoDeErro) => new ErroDaApi({ status, codigo });
