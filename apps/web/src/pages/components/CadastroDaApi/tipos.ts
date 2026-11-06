import type { Permissao } from '@cdd/contracts';

export interface RegistroDoCadastro {
  readonly id: string;
  readonly nome: string;
  readonly versao: number;
  readonly ativa?: boolean;
  readonly ativo?: boolean;
}

export interface OpcaoDeCadastro { readonly value: string; readonly label: string }

export interface CampoDoCadastro {
  readonly nome: string;
  readonly rotulo: string;
  readonly opcoes?: readonly OpcaoDeCadastro[];
  readonly formato?: 'moeda' | 'lista' | 'booleano';
  readonly inicial?: string;
  readonly soNaCriacao?: boolean;
  readonly soNaEdicao?: boolean;
  readonly opcional?: boolean;
  readonly exibir?: boolean;
  readonly oculto?: boolean;
  readonly visivel?: (valores: Record<string, string>) => boolean;
}

export interface ContratoDoCadastro {
  safeParse(entrada: unknown):
    | { success: true; data: unknown }
    | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } };
}

export interface DefinicaoDoCadastro {
  readonly caminho: string;
  readonly singular: string;
  readonly campos: readonly CampoDoCadastro[];
  readonly permissaoDeCriar: Permissao;
  readonly permissaoDeEditar: Permissao;
  readonly criar: ContratoDoCadastro;
  readonly editar: ContratoDoCadastro;
  readonly paginado?: boolean;
}
