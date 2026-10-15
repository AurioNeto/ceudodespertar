import { Module } from '@nestjs/common';
import { BancoModule } from '../../shared/infrastructure/banco/banco.module.js';
import { SemeaduraModule } from '../../shared/infrastructure/semeadura/semeadura.module.js';
import { RepositorioDeCategoria } from './domain/categoria/categoria.repo.js';
import { RepositorioDeGrupoDeCusto } from './domain/grupo-de-custo/grupo-de-custo.repo.js';
import { RepositorioDeUnidade } from './domain/unidade/unidade.repo.js';
import { RegistradorDosSemeadoresDoFinanceiro } from './infrastructure/registrador-dos-semeadores-do-financeiro.js';
import { RepositorioDeCategoriaKysely } from './infrastructure/persistencia/repositorio-de-categoria.kysely.js';
import { RepositorioDeGrupoDeCustoKysely } from './infrastructure/persistencia/repositorio-de-grupo-de-custo.kysely.js';
import { RepositorioDeUnidadeKysely } from './infrastructure/persistencia/repositorio-de-unidade.kysely.js';
import { SemeadorDeCadastrosDaCasa } from './infrastructure/persistencia/semeador-de-cadastros-da-casa.js';

@Module({
  imports: [BancoModule, SemeaduraModule],
  providers: [
    { provide: RepositorioDeUnidade, useClass: RepositorioDeUnidadeKysely },
    { provide: RepositorioDeGrupoDeCusto, useClass: RepositorioDeGrupoDeCustoKysely },
    { provide: RepositorioDeCategoria, useClass: RepositorioDeCategoriaKysely },
    SemeadorDeCadastrosDaCasa,
    RegistradorDosSemeadoresDoFinanceiro,
  ],
})
export class FinanceiroModule {}
