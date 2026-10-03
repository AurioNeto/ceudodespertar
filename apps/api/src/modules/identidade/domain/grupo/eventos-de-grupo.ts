import type { CodigoGrupo, GrupoId, Permissao, UsuarioId } from '@cdd/contracts';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';

const AGREGADO_GRUPO = 'Grupo';

export type AcaoSobrePermissao = 'CONCEDIDA' | 'REVOGADA';

export type DadosDeAlteracaoDePermissao = {
  readonly permissao: Permissao;
  readonly acao: AcaoSobrePermissao;
  readonly autorId: UsuarioId;
  readonly codigoSistema: CodigoGrupo | null;
};

export type DadosDeExclusao = {
  readonly acao: 'EXCLUIDO';
  readonly autorId: UsuarioId;
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
  dados: Omit<DadosDeAlteracaoDePermissao, 'acao'>,
): PermissaoConcedida {
  return criarEvento('GRUPO_ALTERADO', grupoId, ocorridoEm, { ...dados, acao: 'CONCEDIDA' });
}

export function permissaoRevogada(
  grupoId: GrupoId,
  ocorridoEm: Date,
  dados: Omit<DadosDeAlteracaoDePermissao, 'acao'>,
): PermissaoRevogada {
  return criarEvento('GRUPO_ALTERADO', grupoId, ocorridoEm, { ...dados, acao: 'REVOGADA' });
}

export function grupoExcluido(
  grupoId: GrupoId,
  ocorridoEm: Date,
  dados: Omit<DadosDeExclusao, 'acao'>,
): GrupoExcluido {
  return criarEvento('GRUPO_ALTERADO', grupoId, ocorridoEm, { ...dados, acao: 'EXCLUIDO' });
}
