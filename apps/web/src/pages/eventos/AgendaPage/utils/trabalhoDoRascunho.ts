import { lerValorDigitado } from '@/lib/numero';
import { contribuicoesDoTexto } from './contribuicoesDoTexto';
import type { RascunhoDeTrabalho } from './rascunhoDeTrabalho';

export const trabalhoDoRascunho = (f: RascunhoDeTrabalho, mes: number, ano: number) => {
  const [dia, mesForm, anoForm] = f.data.split('/').map((n) => parseInt(n, 10));

  return {
    nome: f.nome,
    tipo: f.tipo,
    dia: dia || 1,
    mes: mesForm || mes,
    ano: anoForm || ano,
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
  };
};
