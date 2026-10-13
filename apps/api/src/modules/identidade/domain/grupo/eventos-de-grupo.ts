import type { CodigoGrupo, GrupoId, Permissao, UsuarioId } from '@cdd/contracts';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import type { TipoDeEventoDaIdentidade } from '../eventos-da-identidade.js';

const AGREGADO_GRUPO = 'Grupo';
const TIPO_GRUPO_EDITADO: TipoDeEventoDaIdentidade = 'GRUPO_EDITADO';

export type AcaoSobrePermissao = 'CONCEDIDA' | 'REVOGADA';

export type DadosDeAlteracaoDePermissao = {
  readonly permissao: Permissao;
  readonly acao: AcaoSobrePermissao;
  readonly autorId: UsuarioId;
  readonly codigoSistema: CodigoGrupo | null;
};

export type DadosDeCriacao = {
  readonly acao: 'CRIADO';
  readonly nome: string;
  readonly descricao: string;
  readonly permissoes: readonly Permissao[];
  readonly autorId: UsuarioId;
  readonly codigoSistema: CodigoGrupo | null;
};

export type DadosDeExclusao = {
  readonly acao: 'EXCLUIDO';
  readonly autorId: UsuarioId;
  readonly codigoSistema: CodigoGrupo | null;
};

export type DadosDeRenomeacao = {
  readonly acao: 'RENOMEADO';
  readonly nomeAnterior: string;
  readonly nomeNovo: string;
  readonly descricaoAnterior: string;
  readonly descricaoNova: string;
  readonly autorId: UsuarioId;
  readonly codigoSistema: CodigoGrupo | null;
};

export type PermissaoConcedida = EventoDeDominio<DadosDeAlteracaoDePermissao>;
export type PermissaoRevogada = EventoDeDominio<DadosDeAlteracaoDePermissao>;
export type GrupoCriado = EventoDeDominio<DadosDeCriacao>;
export type GrupoExcluido = EventoDeDominio<DadosDeExclusao>;
export type GrupoRenomeado = EventoDeDominio<DadosDeRenomeacao>;

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
  return criarEvento(TIPO_GRUPO_EDITADO, grupoId, ocorridoEm, { ...dados, acao: 'CONCEDIDA' });
}

export function permissaoRevogada(
  grupoId: GrupoId,
  ocorridoEm: Date,
  dados: Omit<DadosDeAlteracaoDePermissao, 'acao'>,
): PermissaoRevogada {
  return criarEvento(TIPO_GRUPO_EDITADO, grupoId, ocorridoEm, { ...dados, acao: 'REVOGADA' });
}

export function grupoCriado(grupoId: GrupoId, ocorridoEm: Date, dados: Omit<DadosDeCriacao, 'acao'>): GrupoCriado {
  return criarEvento(TIPO_GRUPO_EDITADO, grupoId, ocorridoEm, { ...dados, acao: 'CRIADO' });
}

export function grupoExcluido(
  grupoId: GrupoId,
  ocorridoEm: Date,
  dados: Omit<DadosDeExclusao, 'acao'>,
): GrupoExcluido {
  return criarEvento(TIPO_GRUPO_EDITADO, grupoId, ocorridoEm, { ...dados, acao: 'EXCLUIDO' });
}

export function grupoRenomeado(
  grupoId: GrupoId,
  ocorridoEm: Date,
  dados: Omit<DadosDeRenomeacao, 'acao'>,
): GrupoRenomeado {
  return criarEvento(TIPO_GRUPO_EDITADO, grupoId, ocorridoEm, { ...dados, acao: 'RENOMEADO' });
}
