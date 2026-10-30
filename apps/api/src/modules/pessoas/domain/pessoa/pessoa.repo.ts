import type { PessoaId } from '@cdd/contracts';
import type { Pessoa } from './pessoa.js';

export abstract class RepositorioDePessoa {
  abstract porId(id: PessoaId): Promise<Pessoa | undefined>;
  abstract adicionar(pessoa: Pessoa): Promise<void>;
  abstract salvar(pessoa: Pessoa): Promise<number>;
}
