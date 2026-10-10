import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { GRUPOS_DE_SISTEMA } from '../../src/modules/identidade/domain/grupo/grupos-de-sistema.js';

const VARIAVEL_DA_INSTITUICAO = 'app.instituicao_id';
const CODIGO_DO_GRUPO_DO_GESTOR = 'ADMINISTRADOR';

export interface GestorSemeado {
  readonly instituicaoId: string;
  readonly gestorId: string;
}

export interface DadosDoGestor {
  readonly subjectId: string;
  readonly email: string;
  readonly nome: string;
}

export async function semearInstituicaoComGestor(urlDoBancoDoDono: string, gestor: DadosDoGestor): Promise<GestorSemeado> {
  const instituicaoId = randomUUID();
  const gestorId = randomUUID();
  const cliente = new Client({ connectionString: urlDoBancoDoDono });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query('select set_config($1, $2, true)', [VARIAVEL_DA_INSTITUICAO, instituicaoId]);
    await cliente.query('insert into shared.instituicao (id, nome) values ($1, $2)', [instituicaoId, 'Casa do aceite']);
    const grupoDoGestor = await semearGruposDeSistema(cliente, instituicaoId);
    await cliente.query(
      `insert into identidade.usuario (id, instituicao_id, subject_id, nome, email, situacao, ativado_em)
       values ($1, $2, $3, $4, $5, 'ATIVO', now())`,
      [gestorId, instituicaoId, gestor.subjectId, gestor.nome, gestor.email],
    );
    await cliente.query(
      'insert into identidade.usuario_grupo (instituicao_id, usuario_id, grupo_id, atribuido_por) values ($1, $2, $3, $4)',
      [instituicaoId, gestorId, grupoDoGestor, gestorId],
    );
    await cliente.query('commit');
  } catch (erro) {
    await cliente.query('rollback');
    throw erro;
  } finally {
    await cliente.end();
  }
  return { instituicaoId, gestorId };
}

async function semearGruposDeSistema(cliente: Client, instituicaoId: string): Promise<string> {
  let grupoDoGestor = '';
  for (const grupo of GRUPOS_DE_SISTEMA) {
    const grupoId = randomUUID();
    if (grupo.codigoSistema === CODIGO_DO_GRUPO_DO_GESTOR) grupoDoGestor = grupoId;
    // eslint-disable-next-line no-await-in-loop -- poucos grupos, na ordem
    await cliente.query(
      'insert into identidade.grupo (id, instituicao_id, codigo_sistema, nome, descricao, protegido) values ($1, $2, $3, $4, $5, true)',
      [grupoId, instituicaoId, grupo.codigoSistema, grupo.nome, grupo.descricao],
    );
    // eslint-disable-next-line no-await-in-loop -- poucos grupos, na ordem
    await cliente.query(
      'insert into identidade.grupo_permissao (instituicao_id, grupo_id, permissao) select $1, $2, unnest($3::text[])',
      [instituicaoId, grupoId, grupo.permissoes],
    );
  }
  return grupoDoGestor;
}

export interface LinhaDoUsuario {
  readonly situacao: string;
  readonly subject_id: string | null;
  readonly ativado_em: Date | null;
  readonly versao: number;
}

export async function lerUsuarioNoBanco(urlDoBancoDoDono: string, instituicaoId: string, usuarioId: string): Promise<LinhaDoUsuario> {
  const cliente = new Client({ connectionString: urlDoBancoDoDono });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query('select set_config($1, $2, true)', [VARIAVEL_DA_INSTITUICAO, instituicaoId]);
    const { rows } = await cliente.query<LinhaDoUsuario>(
      'select situacao, subject_id, ativado_em, versao from identidade.usuario where id = $1',
      [usuarioId],
    );
    await cliente.query('rollback');
    const linha = rows[0];
    if (linha === undefined) throw new Error(`usuário ${usuarioId} não existe na instituição ${instituicaoId}`);
    return linha;
  } finally {
    await cliente.end();
  }
}

export interface LinhaDaTrilha {
  readonly operacao: string;
  readonly autor_tipo: string;
  readonly autor_usuario_id: string | null;
  readonly autor_grupos: string[];
  readonly agregado_tipo: string;
  readonly detalhes: { rotulo: string; valor: string }[];
  readonly sensivel: boolean;
}

export async function lerTrilhaDoAgregado(urlDoBancoDoDono: string, instituicaoId: string, agregadoId: string): Promise<LinhaDaTrilha[]> {
  const cliente = new Client({ connectionString: urlDoBancoDoDono });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query('select set_config($1, $2, true)', [VARIAVEL_DA_INSTITUICAO, instituicaoId]);
    const { rows } = await cliente.query<LinhaDaTrilha>(
      `select operacao, autor_tipo, autor_usuario_id, autor_grupos, agregado_tipo, detalhes, sensivel
         from identidade.registro_de_auditoria where agregado_id = $1 order by em, id`,
      [agregadoId],
    );
    await cliente.query('rollback');
    return rows;
  } finally {
    await cliente.end();
  }
}

export async function lerGrupoDoGestor(urlDoBancoDoDono: string, instituicaoId: string, gestorId: string): Promise<string[]> {
  const cliente = new Client({ connectionString: urlDoBancoDoDono });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query('select set_config($1, $2, true)', [VARIAVEL_DA_INSTITUICAO, instituicaoId]);
    const { rows } = await cliente.query<{ grupo_id: string }>(
      'select grupo_id from identidade.usuario_grupo where usuario_id = $1',
      [gestorId],
    );
    await cliente.query('rollback');
    return rows.map(({ grupo_id: grupoId }) => grupoId);
  } finally {
    await cliente.end();
  }
}

export async function recuarCriacaoDoConviteVigente(
  urlDoBancoDoDono: string,
  instituicaoId: string,
  usuarioId: string,
  segundos: number,
): Promise<void> {
  const cliente = new Client({ connectionString: urlDoBancoDoDono });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query('select set_config($1, $2, true)', [VARIAVEL_DA_INSTITUICAO, instituicaoId]);
    await cliente.query(
      `update identidade.convite set criado_em = criado_em - make_interval(secs => $3)
        where usuario_id = $1 and instituicao_id = $2 and usado_em is null and revogado_em is null`,
      [usuarioId, instituicaoId, segundos],
    );
    await cliente.query('commit');
  } finally {
    await cliente.end();
  }
}
