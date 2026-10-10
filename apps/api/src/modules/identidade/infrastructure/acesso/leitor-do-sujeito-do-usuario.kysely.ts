import { Injectable } from '@nestjs/common';
import type { InstituicaoId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { emContextoDaInstituicao } from '../../../../shared/infrastructure/contexto-da-instituicao.js';
import { LeitorDoSujeitoDoUsuario } from '../../application/usuarios/leitor-do-sujeito-do-usuario.js';
import type { SujeitoDoUsuario } from '../../application/usuarios/leitor-do-sujeito-do-usuario.js';

@Injectable()
export class LeitorDoSujeitoDoUsuarioKysely extends LeitorDoSujeitoDoUsuario {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<SujeitoDoUsuario | undefined> {
    return emContextoDaInstituicao(instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
        const linha = await kysely
          .selectFrom('identidade.usuario')
          .select(['subject_id', 'situacao'])
          .where('id', '=', usuarioId)
          .executeTakeFirst();
        if (linha === undefined) return undefined;
        return { subjectId: linha.subject_id, situacao: linha.situacao as SituacaoUsuario };
      }),
    );
  }
}
