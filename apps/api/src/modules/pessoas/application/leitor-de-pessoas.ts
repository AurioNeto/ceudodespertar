import type { Pessoa } from '@cdd/contracts';
import type { PosicaoDaListagem } from './cursor-de-pessoas.js';

export interface ConsultaDePessoas {
  readonly busca?: string;
  readonly depois: PosicaoDaListagem | null;
  readonly limite: number;
}

export interface PessoaComPosicao {
  readonly pessoa: Pessoa;
  readonly posicao: PosicaoDaListagem;
}

export abstract class LeitorDePessoas {
  abstract ler(consulta: ConsultaDePessoas): Promise<PessoaComPosicao[]>;
}
