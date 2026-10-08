import type { GrupoId } from '@cdd/contracts';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { consultarNaInstituicao } from '../apoio.js';
import type { RegistroDaTrilha } from '../gestao-de-usuarios/apoio-http.js';

export const ROTA_GRUPOS = '/api/v1/identidade/grupos';

export interface EstadoDoGrupo {
  readonly versao: number;
  readonly nome: string;
  readonly descricao: string;
  readonly permissoes: readonly string[];
}

export const rotaDoGrupo = (id: string): string => `${ROTA_GRUPOS}/${id}`;
export const rotaDaPermissaoDoGrupo = (id: string, permissao: string): string =>
  `${ROTA_GRUPOS}/${id}/permissoes/${permissao}`;

export async function estadoDoGrupo(
  banco: BancoDeTeste,
  instituicaoId: string,
  grupoId: GrupoId,
): Promise<EstadoDoGrupo> {
  const [grupo] = await consultarNaInstituicao<{ versao: number; nome: string; descricao: string }>(
    banco,
    instituicaoId,
    'select versao, nome, descricao from identidade.grupo where id = $1',
    [grupoId],
  );
  const permissoes = await consultarNaInstituicao<{ permissao: string }>(
    banco,
    instituicaoId,
    'select permissao from identidade.grupo_permissao where grupo_id = $1 order by permissao',
    [grupoId],
  );
  return { ...grupo!, permissoes: permissoes.map(({ permissao }) => permissao) };
}

export function trilhaDoGrupo(banco: BancoDeTeste, instituicaoId: string, grupoId: GrupoId): Promise<RegistroDaTrilha[]> {
  return consultarNaInstituicao<RegistroDaTrilha>(
    banco,
    instituicaoId,
    `select operacao, autor_usuario_id, correlacao_id, sensivel, detalhes::text as detalhes
       from identidade.registro_de_auditoria where agregado_id = $1 and operacao = 'GRUPO_EDITADO'`,
    [grupoId],
  );
}
