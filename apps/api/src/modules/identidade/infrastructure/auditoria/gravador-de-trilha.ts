import { Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { DB } from '../../../../shared/infrastructure/banco/banco-cdd.gerado.js';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ContextoDaRequisicao } from '../../../../shared/infrastructure/contexto-da-requisicao.js';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import type { EntradaDeAuditoria } from '../../application/auditoria/entrada-de-auditoria.js';
import { TrilhaDeAuditoria } from '../../application/auditoria/trilha-de-auditoria.js';
import { mapearEventoParaAuditoria } from '../../application/auditoria/mapeamento-de-eventos.js';
import { instituicaoDoContexto } from '../persistencia/instituicao-do-contexto.js';

type GruposPorAutor = ReadonlyMap<string, readonly string[]>;

function autoresDe(entradas: readonly EntradaDeAuditoria[]): string[] {
  return [...new Set(entradas.flatMap(({ autorId }) => (autorId === null ? [] : [autorId])))];
}

async function gruposDosAutores(kysely: Kysely<DB>, autores: readonly string[]): Promise<GruposPorAutor> {
  const porAutor = new Map<string, string[]>();
  if (autores.length === 0) return porAutor;
  const atribuicoes = await kysely
    .selectFrom('identidade.usuario_grupo')
    .select(['usuario_id', 'grupo_id'])
    .where('usuario_id', 'in', autores)
    .execute();
  for (const { usuario_id: usuarioId, grupo_id: grupoId } of atribuicoes) {
    porAutor.set(usuarioId, [...(porAutor.get(usuarioId) ?? []), grupoId]);
  }
  return porAutor;
}

@Injectable()
export class GravadorDeTrilha extends TrilhaDeAuditoria {
  async gravarEventos(contexto: ContextoDaTransacao, eventos: readonly EventoDeDominio[]): Promise<void> {
    const entradas = eventos.flatMap((evento) => mapearEventoParaAuditoria(evento) ?? []);
    await this.gravar(contexto, entradas);
  }

  override async gravar(contexto: ContextoDaTransacao, entradas: readonly EntradaDeAuditoria[]): Promise<void> {
    if (entradas.length === 0) return;
    const instituicaoId = instituicaoDoContexto();
    const correlacaoId = ContextoDaRequisicao.atual()?.correlacaoId ?? null;
    const grupos = await gruposDosAutores(contexto.kysely, autoresDe(entradas));

    await contexto.kysely
      .insertInto('identidade.registro_de_auditoria')
      .values(
        entradas.map((entrada) => ({
          id: gerarUuidV7(),
          instituicao_id: instituicaoId,
          em: entrada.em,
          autor_tipo: entrada.autorId === null ? 'SISTEMA' : 'USUARIO',
          autor_usuario_id: entrada.autorId,
          autor_grupos: [...(grupos.get(entrada.autorId ?? '') ?? [])].toSorted(),
          operacao: entrada.operacao,
          agregado_tipo: entrada.agregadoTipo,
          agregado_id: entrada.agregadoId,
          pessoa_alvo_id: entrada.pessoaAlvoId,
          detalhes: JSON.stringify(entrada.detalhes),
          sensivel: entrada.sensivel,
          correlacao_id: correlacaoId,
        })),
      )
      .execute();
  }
}
