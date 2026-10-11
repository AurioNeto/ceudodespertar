import type { RascunhoDeTrabalho } from './rascunhoDeTrabalho';

export const trabalhoDoRascunho = (f: RascunhoDeTrabalho, mes: number, ano: number) => {
  const [dia, mesForm, anoForm] = f.data.split('/').map((n) => parseInt(n, 10));
  const contribuicoes = f.contribuicoes
    .split(',')
    .map((v) => parseFloat(v.replace(',', '.').trim()))
    .filter((v) => !Number.isNaN(v));

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
    litros: parseFloat(f.litros.replace(',', '.')) || 0,
    contribuicoes,
    observacoes: f.observacoes,
    preparo: f.preparo
      .filter((t) => t.titulo.trim())
      .map((t) => ({ titulo: t.titulo.trim(), responsavel: t.responsavel.trim() || 'a definir' })),
  };
};
