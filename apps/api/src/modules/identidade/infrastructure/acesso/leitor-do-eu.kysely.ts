import { Injectable } from '@nestjs/common';
import type { Eu, InstituicaoId, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDoEu } from '../../application/leitor-do-eu.js';
import { gruposAtivosDoUsuario, permissoesEfetivasDosGrupos } from './consultas-de-acesso.js';
import { emContextoDaInstituicao } from './contexto-da-instituicao.js';

@Injectable()
export class LeitorDoEuKysely extends LeitorDoEu {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<Eu> {
    return emContextoDaInstituicao(instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
        const usuario = await kysely
          .selectFrom('identidade.usuario')
          .select(['nome', 'email'])
          .where('id', '=', usuarioId)
          .executeTakeFirstOrThrow();
        const instituicao = await kysely
          .selectFrom('shared.instituicao')
          .select('nome')
          .where('id', '=', instituicaoId)
          .executeTakeFirstOrThrow();
        const grupos = await gruposAtivosDoUsuario(kysely, usuarioId);
        return {
          usuario: { id: usuarioId, nome: usuario.nome, email: usuario.email },
          instituicao: { id: instituicaoId, nome: instituicao.nome },
          grupos: grupos.map(({ id, nome }) => ({ id, nome })),
          permissoes: permissoesEfetivasDosGrupos(grupos),
        };
      }),
    );
  }
}
