import type { LoteDeDaime } from '../mocks/ayahuasca';
import type { RascunhoDeMovimento } from '../tipos';
import { codigoDoLote, mesmoCodigo } from './codigoDoLote';
import { MENSAGEM_DE_LITROS_COM_MAIS_DE_DUAS_CASAS, lerLitros, litros, temMaisDeDuasCasas } from './litros';

/** O saldo do lote é o guarda-corpo: nenhuma saída passa do que existe. */
export const erroDoFormulario = (f: RascunhoDeMovimento | null, lotes: readonly LoteDeDaime[]): string | null => {
  if (!f) return null;
  const quantidade = lerLitros(f.litros);
  if (f.modo === 'feitio') {
    if (!f.codigo.trim()) return 'Dê um código ao lote (ex.: Lote 01/2027).';
    if (lotes.some((l) => mesmoCodigo(l.codigo, f.codigo))) return `${codigoDoLote(f.codigo)} já existe. Dê outro código ao lote.`;
    if (quantidade <= 0) return 'Informe quantos litros entraram.';
    if (temMaisDeDuasCasas(f.litros)) return MENSAGEM_DE_LITROS_COM_MAIS_DE_DUAS_CASAS;
    return null;
  }
  const lote = lotes.find((l) => String(l.id) === f.loteId);
  if (!lote) return 'Escolha um lote com daime disponível.';
  if (quantidade <= 0) return 'Informe quantos litros vão sair.';
  if (temMaisDeDuasCasas(f.litros)) return MENSAGEM_DE_LITROS_COM_MAIS_DE_DUAS_CASAS;
  if (quantidade > lote.restante) return `${lote.codigo} tem só ${litros(lote.restante)} disponíveis.`;
  if (lote.situacao === 'quarentena') return `${lote.codigo} está em quarentena e não pode sair.`;
  return null;
};
