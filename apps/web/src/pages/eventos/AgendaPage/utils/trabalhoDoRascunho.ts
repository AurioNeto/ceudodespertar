import { lerValorDigitado } from '@/lib/numero';
import type { DataDigitada } from '@/pages/eventos/utils/lerDataDigitada';
import { contribuicoesDoTexto } from './contribuicoesDoTexto';
import type { RascunhoDeTrabalho } from './rascunhoDeTrabalho';

export const trabalhoDoRascunho = (f: RascunhoDeTrabalho, data: DataDigitada) => ({
  nome: f.nome,
  tipo: f.tipo,
  dia: data.dia,
  mes: data.mes,
  ano: data.ano,
  horario: f.horario,
  local: f.local,
  dirigente: f.dirigente || 'a definir',
  previstos: parseInt(f.previstos, 10) || 0,
  litros: lerValorDigitado(f.litros) || 0,
  contribuicoes: contribuicoesDoTexto(f.contribuicoes) ?? [],
  observacoes: f.observacoes,
  preparo: f.preparo
    .filter((t) => t.titulo.trim())
    .map((t) => ({ titulo: t.titulo.trim(), responsavel: t.responsavel.trim() || 'a definir' })),
});
