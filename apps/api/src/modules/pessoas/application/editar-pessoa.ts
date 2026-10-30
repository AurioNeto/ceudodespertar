import { Injectable } from '@nestjs/common';
import type { EditarPessoa as Comando, Pessoa as PessoaDoContrato, PessoaId, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../shared/infrastructure/relogio.js';
import type { ErroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../shared/kernel/result.js';
import { RepositorioDePessoa } from '../domain/pessoa/pessoa.repo.js';
import { apresentarPessoa } from './apresentar-pessoa.js';
import { erroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import { err } from '../../../shared/kernel/result.js';

@Injectable()
export class EditarPessoa {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly pessoas: RepositorioDePessoa, private readonly relogio: Relogio) {}

  executar(autorId: UsuarioId, comando: Comando, pessoaId: PessoaId, versaoEsperada: number): Promise<Result<PessoaDoContrato, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async (): Promise<Result<PessoaDoContrato, ErroDeDominio>> => {
      const pessoa = await this.pessoas.porId(pessoaId);
      if (pessoa === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
      if (pessoa.versao !== versaoEsperada) return err(erroDeDominio('VERSAO_DESATUALIZADA'));
      const editada = pessoa.editar(comando, autorId, this.relogio.agora());
      if (editada.tipo === 'erro') return editada;
      return ok(apresentarPessoa(pessoa, await this.pessoas.salvar(pessoa)));
    });
  }
}
