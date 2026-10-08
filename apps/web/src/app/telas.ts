import type { RotaId } from './navegacao';

export type FonteDaTela = 'mock' | 'api';

export interface RegistroDaTela {
  readonly fonte: FonteDaTela;
}

export type RegistroDeTelas = Record<RotaId, RegistroDaTela>;

const MOCK: RegistroDaTela = { fonte: 'mock' };

export const TELAS: RegistroDeTelas = {
  painel: MOCK,
  registrar: MOCK,
  meus: MOCK,
  lote: MOCK,
  lancamentos: MOCK,
  contas: MOCK,
  faturas: MOCK,
  emprestimos: MOCK,
  adiantamentos: MOCK,
  relatorios: MOCK,
  fechamento: MOCK,
  prestacao: MOCK,
  devolucoes: MOCK,
  conciliacao: MOCK,
  parametros: MOCK,
  agenda: MOCK,
  inscricao: MOCK,
  leitos: MOCK,
  contratacoes: MOCK,
  ayahuasca: MOCK,
  feitio: MOCK,
  pessoas: MOCK,
  anamnese: MOCK,
  auditoria: MOCK,
  perfil: { fonte: 'api' },
};
