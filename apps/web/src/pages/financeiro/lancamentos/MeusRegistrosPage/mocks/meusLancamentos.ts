import { lancamentos } from '@/pages/financeiro/mocks/lancamentos';

const NOME_DO_REGISTRADOR_DE_EXEMPLO = 'Aurio Neto';

export const meusLancamentos = lancamentos.filter((l) => l.registradoPor === NOME_DO_REGISTRADOR_DE_EXEMPLO);
