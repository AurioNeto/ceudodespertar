import { Injectable } from '@nestjs/common';
import type { PessoaId, Pessoa } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../shared/kernel/result.js';
import { RepositorioDePessoa } from '../domain/pessoa/pessoa.repo.js';
import { apresentarPessoa } from './apresentar-pessoa.js';

@Injectable()
export class ObterPessoa {
  constructor(private readonly pessoas: RepositorioDePessoa) {}

  async executar(id: PessoaId): Promise<Result<Pessoa, ErroDeDominio>> {
    const pessoa = await this.pessoas.porId(id);
    return pessoa === undefined ? err(erroDeDominio('RECURSO_NAO_ENCONTRADO')) : ok(apresentarPessoa(pessoa));
  }
}
