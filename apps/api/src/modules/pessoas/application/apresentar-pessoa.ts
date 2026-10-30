import type { Pessoa as PessoaDoContrato } from '@cdd/contracts';
import type { Pessoa } from '../domain/pessoa/pessoa.js';

export function apresentarPessoa(pessoa: Pessoa, versao: number = pessoa.versao): PessoaDoContrato {
  return { id: pessoa.id, tipo: pessoa.tipo, nome: pessoa.nome, documento: pessoa.documento, ativa: pessoa.ativa, versao };
}
