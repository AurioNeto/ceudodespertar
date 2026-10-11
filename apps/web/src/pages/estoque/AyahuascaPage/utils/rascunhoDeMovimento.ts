import type { LoteDeDaime } from '../mocks/ayahuasca';
import type { ModoDoFormulario, RascunhoDeMovimento } from '../tipos';

export const rascunhoDeMovimento = (
  modo: ModoDoFormulario,
  disponiveis: readonly LoteDeDaime[],
): RascunhoDeMovimento =>
  modo === 'feitio'
    ? { modo: 'feitio', codigo: '', origem: '', forca: 'Força 2', loteId: '', litros: '', destino: '' }
    : {
        modo,
        codigo: '',
        origem: '',
        forca: '',
        loteId: String(disponiveis[0]?.id ?? ''),
        litros: '',
        destino: '',
      };
