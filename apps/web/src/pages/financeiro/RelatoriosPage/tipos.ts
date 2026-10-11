export interface Drill {
  rotulo: string;
  campo: 'grupo' | 'categoria' | 'conta' | 'cerimonia';
  valor: string;
  tipo: 'saida' | null;
}
