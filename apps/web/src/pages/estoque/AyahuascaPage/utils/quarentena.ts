import type { LoteDeDaime } from '../mocks/ayahuasca';

export const alternarQuarentenaDoLote = (lote: LoteDeDaime): LoteDeDaime => {
  const { situacaoAntesDaQuarentena, ...semMemoria } = lote;
  return lote.situacao === 'quarentena'
    ? { ...semMemoria, situacao: situacaoAntesDaQuarentena ?? (lote.restante > 0 ? 'em uso' : 'esgotado') }
    : { ...lote, situacao: 'quarentena', situacaoAntesDaQuarentena: lote.situacao };
};
