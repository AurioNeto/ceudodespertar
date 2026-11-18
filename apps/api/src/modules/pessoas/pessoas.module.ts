import { Module } from '@nestjs/common';
import { BancoModule } from '../../shared/infrastructure/banco/banco.module.js';
import { EventosModule } from '../../shared/infrastructure/eventos/eventos.module.js';
import { Relogio, RelogioDoSistema } from '../../shared/infrastructure/relogio.js';
import { CadastrarPessoa } from './application/cadastrar-pessoa.js';
import { EditarPessoa } from './application/editar-pessoa.js';
import { LeitorDePessoas } from './application/leitor-de-pessoas.js';
import { ListarPessoas } from './application/listar-pessoas.js';
import { ObterPessoa } from './application/obter-pessoa.js';
import { ResumoDaPessoa } from './application/resumo-da-pessoa.js';
import { RepositorioDePessoa } from './domain/pessoa/pessoa.repo.js';
import { LeitorDePessoasKysely } from './infrastructure/consultas/leitor-de-pessoas.kysely.js';
import { ResumoDaPessoaKysely } from './infrastructure/consultas/resumo-da-pessoa.kysely.js';
import { RepositorioDePessoaKysely } from './infrastructure/persistencia/repositorio-de-pessoa.kysely.js';
import { EventosDePessoaSemConsumidor } from './infrastructure/eventos-de-pessoa-sem-consumidor.js';
import { PessoasController } from './interface/http/pessoas.controller.js';

@Module({
  imports: [BancoModule, EventosModule],
  controllers: [PessoasController],
  providers: [
    CadastrarPessoa, EditarPessoa, ListarPessoas, ObterPessoa, EventosDePessoaSemConsumidor,
    { provide: Relogio, useClass: RelogioDoSistema },
    { provide: RepositorioDePessoa, useClass: RepositorioDePessoaKysely },
    { provide: LeitorDePessoas, useClass: LeitorDePessoasKysely },
    { provide: ResumoDaPessoa, useClass: ResumoDaPessoaKysely },
  ],
  exports: [ResumoDaPessoa],
})
export class PessoasModule {}
