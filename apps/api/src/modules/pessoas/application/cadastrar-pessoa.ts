import { Injectable } from '@nestjs/common';
import type { CadastrarPessoa as Comando, Pessoa as PessoaDoContrato, PessoaId, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../shared/kernel/result.js';
import { RepositorioDePessoa } from '../domain/pessoa/pessoa.repo.js';
import { apresentarPessoa } from './apresentar-pessoa.js';
import { gerarUuidV7 } from '../../../shared/kernel/ids.js';
import { Pessoa } from '../domain/pessoa/pessoa.js';

@Injectable()
export class CadastrarPessoa {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly pessoas: RepositorioDePessoa, private readonly relogio: Relogio) {}

  executar(autorId: UsuarioId, comando: Comando): Promise<Result<PessoaDoContrato, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async (): Promise<Result<PessoaDoContrato, ErroDeDominio>> => {
      const criada = Pessoa.cadastrar(gerarUuidV7() as PessoaId, comando, autorId, this.relogio.agora());
      if (criada.tipo === 'erro') return criada;
      await this.pessoas.adicionar(criada.valor);
      return ok(apresentarPessoa(criada.valor));
    });
  }
}
