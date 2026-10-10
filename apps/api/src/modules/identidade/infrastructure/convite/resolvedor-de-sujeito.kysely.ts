import { Injectable } from '@nestjs/common';
import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { sql } from 'kysely';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ResolvedorDeSujeito } from '../../application/convite/resolvedor-de-sujeito.js';
import type { DonoDoSujeito } from '../../application/convite/resolvedor-de-sujeito.js';

@Injectable()
export class ResolvedorDeSujeitoKysely extends ResolvedorDeSujeito {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  resolver(sujeito: string): Promise<DonoDoSujeito | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<{ instituicao_id: string; usuario_id: string }>`
        select instituicao_id, usuario_id from identidade.resolver_sujeito(${sujeito})
      `.execute(kysely);
      const [linha] = rows;
      if (linha === undefined) return undefined;
      return { instituicaoId: linha.instituicao_id as InstituicaoId, usuarioId: linha.usuario_id as UsuarioId };
    });
  }
}
