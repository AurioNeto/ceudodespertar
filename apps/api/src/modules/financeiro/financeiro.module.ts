import { Module } from '@nestjs/common';
import { BancoModule } from '../../shared/infrastructure/banco/banco.module.js';
import { SemeaduraModule } from '../../shared/infrastructure/semeadura/semeadura.module.js';
import { PessoasModule } from '../pessoas/public-api.js';
import { ConsultarCadastros } from './application/cadastros/consultar-cadastros.js';
import { CriarCategoria } from './application/cadastros/criar-categoria.js';
import { CriarConta } from './application/cadastros/criar-conta.js';
import { CriarFundo } from './application/cadastros/criar-fundo.js';
import { CriarGrupoDeCusto } from './application/cadastros/criar-grupo-de-custo.js';
import { CriarUnidade } from './application/cadastros/criar-unidade.js';
import { EditarCategoria } from './application/cadastros/editar-categoria.js';
import { EditarConta } from './application/cadastros/editar-conta.js';
import { EditarFundo } from './application/cadastros/editar-fundo.js';
import { EditarGrupoDeCusto } from './application/cadastros/editar-grupo-de-custo.js';
import { EditarUnidade } from './application/cadastros/editar-unidade.js';
import { RepositorioDeCategoria } from './domain/categoria/categoria.repo.js';
import { RepositorioDeConta } from './domain/conta/conta.repo.js';
import { RepositorioDeFundo } from './domain/fundo/fundo.repo.js';
import { RepositorioDeGrupoDeCusto } from './domain/grupo-de-custo/grupo-de-custo.repo.js';
import { RepositorioDeUnidade } from './domain/unidade/unidade.repo.js';
import { CategoriasController } from './interface/http/categorias.controller.js';
import { ContasController } from './interface/http/contas.controller.js';
import { FundosController } from './interface/http/fundos.controller.js';
import { GruposDeCustoController } from './interface/http/grupos-de-custo.controller.js';
import { UnidadesController } from './interface/http/unidades.controller.js';
import { RegistradorDosSemeadoresDoFinanceiro } from './infrastructure/registrador-dos-semeadores-do-financeiro.js';
import { RepositorioDeCategoriaKysely } from './infrastructure/persistencia/repositorio-de-categoria.kysely.js';
import { RepositorioDeContaKysely } from './infrastructure/persistencia/repositorio-de-conta.kysely.js';
import { RepositorioDeFundoKysely } from './infrastructure/persistencia/repositorio-de-fundo.kysely.js';
import { RepositorioDeGrupoDeCustoKysely } from './infrastructure/persistencia/repositorio-de-grupo-de-custo.kysely.js';
import { RepositorioDeUnidadeKysely } from './infrastructure/persistencia/repositorio-de-unidade.kysely.js';
import { SemeadorDeCadastrosDaCasa } from './infrastructure/persistencia/semeador-de-cadastros-da-casa.js';

@Module({
  imports: [BancoModule, SemeaduraModule, PessoasModule],
  controllers: [UnidadesController, GruposDeCustoController, CategoriasController, ContasController, FundosController],
  providers: [
    ConsultarCadastros,
    CriarUnidade,
    EditarUnidade,
    CriarGrupoDeCusto,
    EditarGrupoDeCusto,
    CriarCategoria,
    EditarCategoria,
    CriarConta,
    EditarConta,
    CriarFundo,
    EditarFundo,
    { provide: RepositorioDeUnidade, useClass: RepositorioDeUnidadeKysely },
    { provide: RepositorioDeGrupoDeCusto, useClass: RepositorioDeGrupoDeCustoKysely },
    { provide: RepositorioDeCategoria, useClass: RepositorioDeCategoriaKysely },
    { provide: RepositorioDeConta, useClass: RepositorioDeContaKysely },
    { provide: RepositorioDeFundo, useClass: RepositorioDeFundoKysely },
    SemeadorDeCadastrosDaCasa,
    RegistradorDosSemeadoresDoFinanceiro,
  ],
})
export class FinanceiroModule {}
