import { Injectable } from '@nestjs/common';
import type { Eu, InstituicaoId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, ErroDeDominioException } from '../../../../shared/kernel/erro-de-dominio.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDoEu } from '../../application/leitor-do-eu.js';
import { CacheDeContextoDeAcesso } from './cache-de-contexto-de-acesso.js';
import { CODIGO_DE_RECUSA_POR_SITUACAO, gruposAtivosDoUsuario, permissoesEfetivasDosGrupos } from './consultas-de-acesso.js';
import { emContextoDaInstituicao } from './contexto-da-instituicao.js';

@Injectable()
export class LeitorDoEuKysely extends LeitorDoEu {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly cache: CacheDeContextoDeAcesso,
  ) {
    super();
  }

  ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<Eu> {
    return emContextoDaInstituicao(instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
        const usuario = await kysely
          .selectFrom('identidade.usuario')
          .select(['nome', 'email', 'situacao'])
          .where('id', '=', usuarioId)
          .executeTakeFirstOrThrow();
        this.exigirUsuarioAtivo(usuarioId, usuario.situacao as SituacaoUsuario);
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

  private exigirUsuarioAtivo(usuarioId: UsuarioId, situacao: SituacaoUsuario): void {
    if (situacao === 'ATIVO') return;
    this.cache.invalidarUsuario(usuarioId);
    throw new ErroDeDominioException(erroDeDominio(CODIGO_DE_RECUSA_POR_SITUACAO[situacao]));
  }
}
