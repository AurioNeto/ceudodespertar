import type { DetalheDeAuditoria, OperacaoAuditada, UsuarioId } from '@cdd/contracts';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { TIPOS_DE_EVENTO_DA_IDENTIDADE } from '../../domain/eventos-da-identidade.js';
import type { TipoDeEventoDaIdentidade } from '../../domain/eventos-da-identidade.js';
import type { EntradaDeAuditoria } from './entrada-de-auditoria.js';
import { ROTULOS_DE_AUDITORIA } from './rotulos-de-auditoria.js';

type Dados = Record<string, unknown>;
type DetalhesDoEvento = readonly DetalheDeAuditoria[];
type MapeadorDeDetalhes = (dados: Dados) => DetalhesDoEvento;

export const EVENTOS_DA_IDENTIDADE_NAO_AUDITADOS: readonly TipoDeEventoDaIdentidade[] = [];

export class ErroDeEventoSemMapeamento extends Error {
  constructor(tipo: string) {
    super(`evento "${tipo}" sem mapeamento para a trilha de auditoria`);
    this.name = 'ErroDeEventoSemMapeamento';
  }
}

function textoDe(dados: Dados, campo: string): string {
  const valor = dados[campo];
  if (typeof valor !== 'string') throw new TypeError(`campo "${campo}" do evento não é texto`);
  return valor;
}

function idsDe(dados: Dados, campo: string): string[] {
  const valor = dados[campo];
  if (!Array.isArray(valor) || !valor.every((item) => typeof item === 'string')) {
    throw new TypeError(`campo "${campo}" do evento não é lista de ids`);
  }
  return valor;
}

function autorDe(dados: Dados): UsuarioId | null {
  return typeof dados.autorId === 'string' ? (dados.autorId as UsuarioId) : null;
}

function semDetalhes(): DetalhesDoEvento {
  return [];
}

function detalhesDeMotivo(dados: Dados): DetalhesDoEvento {
  return [{ rotulo: ROTULOS_DE_AUDITORIA.motivo, valor: textoDe(dados, 'motivo') }];
}

function detalhesDeMudancaDeGrupos(dados: Dados): DetalhesDoEvento {
  return [
    {
      rotulo: ROTULOS_DE_AUDITORIA.grupos,
      valor: idsDe(dados, 'gruposDepois').join(','),
      anterior: idsDe(dados, 'gruposAntes').join(','),
    },
  ];
}

function detalheDoGrupoDeSistema(dados: Dados): DetalhesDoEvento {
  return typeof dados.codigoSistema === 'string'
    ? [{ rotulo: ROTULOS_DE_AUDITORIA.grupoDeSistema, valor: dados.codigoSistema }]
    : [];
}

function detalhesDeEdicaoDeGrupo(dados: Dados): DetalhesDoEvento {
  const acao = textoDe(dados, 'acao');
  return [{ rotulo: ROTULOS_DE_AUDITORIA.acao, valor: acao }, ...detalhesEspecificosDaAcao(acao, dados), ...detalheDoGrupoDeSistema(dados)];
}

function detalhesEspecificosDaAcao(acao: string, dados: Dados): DetalhesDoEvento {
  switch (acao) {
    case 'CONCEDIDA':
    case 'REVOGADA':
      return [{ rotulo: ROTULOS_DE_AUDITORIA.permissao, valor: textoDe(dados, 'permissao') }];
    case 'RENOMEADO':
      return [
        { rotulo: ROTULOS_DE_AUDITORIA.nome, valor: textoDe(dados, 'nomeNovo'), anterior: textoDe(dados, 'nomeAnterior') },
        {
          rotulo: ROTULOS_DE_AUDITORIA.descricao,
          valor: textoDe(dados, 'descricaoNova'),
          anterior: textoDe(dados, 'descricaoAnterior'),
        },
      ];
    case 'EXCLUIDO':
      return [];
    default:
      throw new ErroDeEventoSemMapeamento(`GRUPO_EDITADO/${acao}`);
  }
}

const DETALHES_POR_TIPO: Record<TipoDeEventoDaIdentidade, MapeadorDeDetalhes> = {
  USUARIO_CONVIDADO: semDetalhes,
  USUARIO_ATIVADO: semDetalhes,
  USUARIO_SUSPENSO: detalhesDeMotivo,
  USUARIO_REATIVADO: detalhesDeMotivo,
  GRUPO_ALTERADO: detalhesDeMudancaDeGrupos,
  GRUPO_EDITADO: detalhesDeEdicaoDeGrupo,
};

const SENSIBILIDADE_POR_TIPO: Record<TipoDeEventoDaIdentidade, boolean> = {
  USUARIO_CONVIDADO: false,
  USUARIO_ATIVADO: false,
  USUARIO_SUSPENSO: true,
  USUARIO_REATIVADO: true,
  GRUPO_ALTERADO: false,
  GRUPO_EDITADO: false,
};

function ehTipoDaIdentidade(tipo: string): tipo is TipoDeEventoDaIdentidade {
  return (TIPOS_DE_EVENTO_DA_IDENTIDADE as readonly string[]).includes(tipo);
}

export function mapearEventoParaAuditoria(evento: EventoDeDominio): EntradaDeAuditoria | null {
  if (!ehTipoDaIdentidade(evento.tipo)) throw new ErroDeEventoSemMapeamento(evento.tipo);
  if (EVENTOS_DA_IDENTIDADE_NAO_AUDITADOS.includes(evento.tipo)) return null;

  const dados = evento.dados as Dados;
  return {
    em: evento.ocorridoEm,
    autorId: autorDe(dados),
    operacao: evento.tipo satisfies OperacaoAuditada,
    agregadoTipo: evento.agregadoTipo,
    agregadoId: evento.agregadoId,
    pessoaAlvoId: null,
    detalhes: DETALHES_POR_TIPO[evento.tipo](dados),
    sensivel: SENSIBILIDADE_POR_TIPO[evento.tipo],
  };
}
