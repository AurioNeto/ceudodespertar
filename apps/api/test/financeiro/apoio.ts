import type { MikroORM } from '@mikro-orm/postgresql';
import { RepositorioDeCategoriaKysely } from '../../src/modules/financeiro/infrastructure/persistencia/repositorio-de-categoria.kysely.js';
import { RepositorioDeGrupoDeCustoKysely } from '../../src/modules/financeiro/infrastructure/persistencia/repositorio-de-grupo-de-custo.kysely.js';
import { RepositorioDeUnidadeKysely } from '../../src/modules/financeiro/infrastructure/persistencia/repositorio-de-unidade.kysely.js';
import { SemeadorDeCadastrosDaCasa } from '../../src/modules/financeiro/infrastructure/persistencia/semeador-de-cadastros-da-casa.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { SemeadoresDaInstituicao } from '../../src/shared/infrastructure/semeadura/semeadores-da-instituicao.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';

export interface AmbienteDoFinanceiro {
  readonly orm: MikroORM;
  readonly unidades: RepositorioDeUnidadeKysely;
  readonly grupos: RepositorioDeGrupoDeCustoKysely;
  readonly categorias: RepositorioDeCategoriaKysely;
  readonly semeador: SemeadorDeCadastrosDaCasa;
  readonly semeadores: SemeadoresDaInstituicao;
}

export async function abrirAmbienteDoFinanceiro(banco: BancoDeTeste): Promise<AmbienteDoFinanceiro> {
  const orm = await abrirOrmDeTeste(banco, 4);
  const unidadeDeTrabalho = new UnidadeDeTrabalhoMikroOrm(orm);
  const semeador = new SemeadorDeCadastrosDaCasa(unidadeDeTrabalho);
  const semeadores = new SemeadoresDaInstituicao();
  semeadores.registrar(semeador);
  return {
    orm,
    unidades: new RepositorioDeUnidadeKysely(unidadeDeTrabalho),
    grupos: new RepositorioDeGrupoDeCustoKysely(unidadeDeTrabalho),
    categorias: new RepositorioDeCategoriaKysely(unidadeDeTrabalho),
    semeador,
    semeadores,
  };
}
