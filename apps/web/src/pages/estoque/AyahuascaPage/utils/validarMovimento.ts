import type { LoteDeDaime } from '../mocks/ayahuasca';
import type { RascunhoDeMovimento } from '../tipos';
import { litros } from './litros';
import { paraNumero } from './paraNumero';

/** O saldo do lote é o guarda-corpo: nenhuma saída passa do que existe. */
export const erroDoFormulario = (f: RascunhoDeMovimento | null, lotes: readonly LoteDeDaime[]): string | null => {
  if (!f) return null;
  const quantidade = paraNumero(f.litros);
  if (f.modo === 'feitio') {
    if (!f.codigo.trim()) return 'Dê um código ao lote (ex.: Lote 01/2027).';
    if (quantidade <= 0) return 'Informe quantos litros entraram.';
    return null;
  }
  const lote = lotes.find((l) => String(l.id) === f.loteId);
  if (!lote) return 'Escolha um lote com daime disponível.';
  if (quantidade <= 0) return 'Informe quantos litros vão sair.';
  if (quantidade > lote.restante) return `${lote.codigo} tem só ${litros(lote.restante)} disponíveis.`;
  if (lote.situacao === 'quarentena') return `${lote.codigo} está em quarentena e não pode sair.`;
  return null;
};
