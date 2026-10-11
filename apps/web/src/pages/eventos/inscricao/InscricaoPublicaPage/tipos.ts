export type Passo = 'IDENTIFICACAO' | 'CADASTRO' | 'ANAMNESE' | 'DECLARACAO' | 'PARTICIPACAO' | 'PRONTO';

export interface Novo {
  nome: string;
  nascimento: string;
  telefone: string;
  cidade: string;
  email: string;
}
