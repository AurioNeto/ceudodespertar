import { Injectable } from '@nestjs/common';
import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { sql } from 'kysely';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ResolvedorDeConvite } from '../../application/convite/resolvedor-de-convite.js';
import type { DonoDoConvite } from '../../application/convite/resolvedor-de-convite.js';

const HASH_SHA256_EM_HEX = /^[0-9a-f]{64}$/;

@Injectable()
export class ResolvedorDeConviteKysely extends ResolvedorDeConvite {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  async resolver(hashDoToken: string): Promise<DonoDoConvite | undefined> {
    if (!HASH_SHA256_EM_HEX.test(hashDoToken)) return undefined;
    const hash = Buffer.from(hashDoToken, 'hex');
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<{ instituicao_id: string; usuario_id: string }>`
        select instituicao_id, usuario_id from identidade.resolver_convite(${hash})
      `.execute(kysely);
      const [linha] = rows;
      if (linha === undefined) return undefined;
      return { instituicaoId: linha.instituicao_id as InstituicaoId, usuarioId: linha.usuario_id as UsuarioId };
    });
  }
}
