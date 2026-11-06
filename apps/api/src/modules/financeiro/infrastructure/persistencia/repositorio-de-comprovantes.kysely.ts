import { Injectable } from '@nestjs/common';
import type { AnexoId, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { RepositorioDeComprovantes, type ComprovanteGravado } from '../../application/comprovantes/repositorio-de-comprovantes.js';

@Injectable()
export class RepositorioDeComprovantesKysely extends RepositorioDeComprovantes {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }

  adicionar(a: ComprovanteGravado, autor: UsuarioId): Promise<void> {
    return this.unidade.transacao('escrita', async ({ kysely }) => {
      await kysely.insertInto('shared.anexo').values({
        id: a.id, instituicao_id: instituicaoDoContexto(), chave: a.chave,
        nome_original: a.nome, mime: a.mime, tamanho_bytes: a.tamanhoBytes, sha256: a.sha256, enviado_por: autor,
      }).execute();
    });
  }

  porId(id: AnexoId): Promise<ComprovanteGravado | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const a = await kysely.selectFrom('shared.anexo').selectAll()
        .where('id', '=', id).where('chave', '=', `${instituicaoDoContexto()}/financeiro/${id}`).executeTakeFirst();
      if (!a) return undefined;
      return { id, chave: a.chave, nome: a.nome_original, mime: a.mime, tamanhoBytes: a.tamanho_bytes, sha256: a.sha256 };
    });
  }
}
