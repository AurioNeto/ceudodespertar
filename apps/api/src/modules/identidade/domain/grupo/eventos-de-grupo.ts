import type { CodigoGrupo, GrupoId, Permissao, UsuarioId } from '@cdd/contracts';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';

const AGREGADO_GRUPO = 'Grupo';

export type DadosDeAlteracaoDePermissao = {
  readonly permissao: Permissao;
  readonly por: UsuarioId;
  readonly codigoSistema: CodigoGrupo | null;
};

export type DadosDeExclusao = {
  readonly por: UsuarioId;
  readonly codigoSistema: CodigoGrupo | null;
};

export type PermissaoConcedida = EventoDeDominio<DadosDeAlteracaoDePermissao>;
export type PermissaoRevogada = EventoDeDominio<DadosDeAlteracaoDePermissao>;
export type GrupoExcluido = EventoDeDominio<DadosDeExclusao>;

function criarEvento<Dados>(tipo: string, grupoId: GrupoId, ocorridoEm: Date, dados: Dados): EventoDeDominio<Dados> {
  return {
    eventoId: gerarUuidV7(),
    tipo,
    ocorridoEm,
    agregadoTipo: AGREGADO_GRUPO,
    agregadoId: grupoId,
    dados,
  };
}

export function permissaoConcedida(
  grupoId: GrupoId,
  ocorridoEm: Date,
  dados: DadosDeAlteracaoDePermissao,
): PermissaoConcedida {
  return criarEvento('identidade.grupo.permissao_concedida', grupoId, ocorridoEm, dados);
}

export function permissaoRevogada(
  grupoId: GrupoId,
  ocorridoEm: Date,
  dados: DadosDeAlteracaoDePermissao,
): PermissaoRevogada {
  return criarEvento('identidade.grupo.permissao_revogada', grupoId, ocorridoEm, dados);
}

export function grupoExcluido(grupoId: GrupoId, ocorridoEm: Date, dados: DadosDeExclusao): GrupoExcluido {
  return criarEvento('identidade.grupo.excluido', grupoId, ocorridoEm, dados);
}
