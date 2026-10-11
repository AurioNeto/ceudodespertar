import type { TarefaDePreparo, TipoDeTrabalho, Trabalho } from '../tipos';

export interface RascunhoDeTrabalho {
  editId: number | null;
  nome: string;
  tipo: TipoDeTrabalho;
  data: string;
  horario: string;
  local: string;
  dirigente: string;
  previstos: string;
  litros: string;
  contribuicoes: string;
  observacoes: string;
  preparo: TarefaDePreparo[];
}

export const rascunhoVazio = (): RascunhoDeTrabalho => ({
  editId: null,
  nome: '',
  tipo: 'Concentração',
  data: '',
  horario: '20:00 às 04:00',
  local: 'Salão principal',
  dirigente: '',
  previstos: '',
  litros: '',
  contribuicoes: '',
  observacoes: '',
  preparo: [
    { titulo: 'Limpeza do salão', responsavel: '' },
    { titulo: 'Compra de mantimentos', responsavel: '' },
  ],
});

export const rascunhoDe = (ev: Trabalho): RascunhoDeTrabalho => ({
  editId: ev.id,
  nome: ev.nome,
  tipo: ev.tipo,
  data: `${String(ev.dia).padStart(2, '0')}/${String(ev.mes).padStart(2, '0')}/${ev.ano}`,
  horario: ev.horario,
  local: ev.local,
  dirigente: ev.dirigente,
  previstos: String(ev.previstos),
  litros: String(ev.litros),
  contribuicoes: ev.contribuicoes.join(', '),
  observacoes: ev.observacoes,
  preparo: ev.preparo.map((t) => ({ ...t })),
});
