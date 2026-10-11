export interface Drill {
  rotulo: string;
  campo: 'grupo' | 'categoria' | 'conta' | 'cerimonia';
  valor: string;
  tipo: 'saida' | null;
}

export type Periodo = 'mes' | 'trimestre' | 'ano' | 'personalizado';
export type Comparacao = 'anterior' | 'ano_passado' | 'nenhum';

export interface Filtros {
  grupo: string;
  categoria: string;
  conta: string;
  tipo: string;
  cerimonia: string;
  situacao: string;
}

export interface Ponto {
  ano: number;
  mes: number;
}
