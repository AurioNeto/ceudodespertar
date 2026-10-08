import { randomUUID } from 'node:crypto';
import { MikroORM } from '@mikro-orm/postgresql';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { construirOpcoesDoOrm } from '../../src/shared/infrastructure/banco/configuracao-do-orm.js';
import {
  UnidadeDeTrabalhoMikroOrm,
  VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
} from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { RepositorioDoOutboxPostgres } from '../../src/shared/infrastructure/eventos/repositorio-do-outbox.postgres.js';
import { SinalizadorDeEventos } from '../../src/shared/infrastructure/eventos/sinalizador-de-eventos.js';
import { gerarUuidV7 } from '../../src/shared/kernel/ids.js';
import { RelogioDoSistema } from '../../src/shared/infrastructure/relogio.js';
import { AlteracaoQuePodeTirarAdministrador } from '../../src/modules/identidade/application/administracao/alteracao-que-pode-tirar-administrador.js';
import type { TravaDaAdministracao } from '../../src/modules/identidade/application/administracao/trava-da-administracao.js';
import { DefinirGruposDoUsuario } from '../../src/modules/identidade/application/usuarios/definir-grupos-do-usuario.js';
import { DesativarUsuario } from '../../src/modules/identidade/application/usuarios/desativar-usuario.js';
import { ReativarUsuario } from '../../src/modules/identidade/application/usuarios/reativar-usuario.js';
import { PoliticaDoUltimoAdministrador } from '../../src/modules/identidade/domain/servicos/politica-do-ultimo-administrador.js';
import { LeitorDaAdministracaoKysely } from '../../src/modules/identidade/infrastructure/administracao/leitor-da-administracao.kysely.js';
import { TravaDaAdministracaoAdvisory } from '../../src/modules/identidade/infrastructure/administracao/trava-da-administracao.advisory.js';
import { Grupo } from '../../src/modules/identidade/domain/grupo/grupo.js';
import { Usuario } from '../../src/modules/identidade/domain/usuario/usuario.js';
import { ENTIDADES_DA_IDENTIDADE } from '../../src/modules/identidade/infrastructure/persistencia/entidades-da-identidade.js';
import { GravadorDeTrilha } from '../../src/modules/identidade/infrastructure/auditoria/gravador-de-trilha.js';
import { RepositorioDeGrupoMikroOrm } from '../../src/modules/identidade/infrastructure/persistencia/repositorio-de-grupo.mikro-orm.js';
import { RepositorioDeUsuarioMikroOrm } from '../../src/modules/identidade/infrastructure/persistencia/repositorio-de-usuario.mikro-orm.js';
import { SemeadorDeGruposDeSistema } from '../../src/modules/identidade/infrastructure/persistencia/semeador-de-grupos-de-sistema.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

export const AUTOR = gerarUuidV7() as UsuarioId;
export const AGORA = new Date('2026-03-01T10:00:00.000Z');
export const EM_72_HORAS = new Date('2026-03-04T10:00:00.000Z');

export interface AmbienteDaIdentidade {
  readonly orm: MikroORM;
  readonly unidadeDeTrabalho: UnidadeDeTrabalhoMikroOrm;
  readonly usuarios: RepositorioDeUsuarioMikroOrm;
  readonly grupos: RepositorioDeGrupoMikroOrm;
  readonly semeador: SemeadorDeGruposDeSistema;
  readonly trilha: GravadorDeTrilha;
  readonly trava: TravaDaAdministracaoAdvisory;
  readonly leitor: LeitorDaAdministracaoKysely;
}

export interface CasosDeUsoDaGestao {
  readonly desativar: DesativarUsuario;
  readonly reativar: ReativarUsuario;
  readonly definirGrupos: DefinirGruposDoUsuario;
}

export function montarCasosDeUsoDaGestao(
  ambiente: AmbienteDaIdentidade,
  trava: TravaDaAdministracao = ambiente.trava,
): CasosDeUsoDaGestao {
  const relogio = new RelogioDoSistema();
  const alteracao = new AlteracaoQuePodeTirarAdministrador(
    ambiente.unidadeDeTrabalho,
    trava,
    ambiente.leitor,
    new PoliticaDoUltimoAdministrador(),
  );
  return {
    desativar: new DesativarUsuario(alteracao, ambiente.usuarios, relogio),
    reativar: new ReativarUsuario(ambiente.unidadeDeTrabalho, ambiente.usuarios, relogio),
    definirGrupos: new DefinirGruposDoUsuario(alteracao, ambiente.usuarios, relogio),
  };
}

export async function abrirAmbienteDaIdentidade(banco: BancoDeTeste, poolMaximo = 4): Promise<AmbienteDaIdentidade> {
  const orm = await MikroORM.init({
    ...construirOpcoesDoOrm({ BANCO_URL: urlDoAppPara(banco), BANCO_POOL_MAXIMO: String(poolMaximo) }),
    entities: ENTIDADES_DA_IDENTIDADE,
  });
  const unidadeDeTrabalho = new UnidadeDeTrabalhoMikroOrm(orm);
  const outbox = new RepositorioDoOutboxPostgres(new SinalizadorDeEventos());
  const trilha = new GravadorDeTrilha();
  return {
    orm,
    unidadeDeTrabalho,
    usuarios: new RepositorioDeUsuarioMikroOrm(unidadeDeTrabalho, outbox, trilha),
    grupos: new RepositorioDeGrupoMikroOrm(unidadeDeTrabalho, outbox, trilha),
    semeador: new SemeadorDeGruposDeSistema(unidadeDeTrabalho),
    trilha,
    trava: new TravaDaAdministracaoAdvisory(unidadeDeTrabalho),
    leitor: new LeitorDaAdministracaoKysely(unidadeDeTrabalho),
  };
}

export function hashDeConvite(): string {
  return randomUUID().replaceAll('-', '').padEnd(64, 'a');
}

export function novoUsuarioConvidado(grupos: readonly GrupoId[] = []): Usuario {
  return Usuario.convidar({
    id: gerarUuidV7() as UsuarioId,
    nome: 'Maria Silva',
    email: `${randomUUID()}@casa.org`,
    grupos,
    hashDoConvite: hashDeConvite(),
    conviteExpiraEm: EM_72_HORAS,
    convidadoPor: AUTOR,
    em: AGORA,
  });
}

export function novoGrupo(permissoes: readonly string[] = ['financeiro.lancamento.ler']): Grupo {
  const resultado = Grupo.criar({
    id: gerarUuidV7() as GrupoId,
    codigoSistema: null,
    nome: `Grupo ${randomUUID()}`,
    descricao: 'Grupo de teste',
    protegido: false,
    permissoes,
  });
  if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);
  return resultado.valor;
}

export async function consultarNaInstituicao<T extends object>(
  banco: BancoDeTeste,
  instituicaoId: string,
  sql: string,
  parametros: readonly unknown[] = [],
): Promise<T[]> {
  await banco.owner.query('begin');
  try {
    await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
    const resultado = await banco.owner.query(sql, [...parametros]);
    return resultado.rows as T[];
  } finally {
    await banco.owner.query('rollback');
  }
}

export async function eventosDoOutbox(banco: BancoDeTeste, agregadoId: string): Promise<string[]> {
  const resultado = await banco.owner.query(
    'select tipo from shared.outbox where agregado_id = $1 order by ocorrido_em, evento_id',
    [agregadoId],
  );
  return resultado.rows.map((linha: { tipo: string }) => linha.tipo);
}
