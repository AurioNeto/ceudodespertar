import { Injectable } from '@nestjs/common';
import type { InstituicaoId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { sql } from 'kysely';
import {
  criarContextoDeAcesso,
  recusarAcesso,
  ResolvedorDeContextoDeAcesso,
} from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { CodigoDeRecusa, ContextoDeAcesso, RecusaDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { IdentidadeAutenticada } from '../../../../shared/infrastructure/autenticacao/identidade-autenticada.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { CacheDeContextoDeAcesso } from './cache-de-contexto-de-acesso.js';
import type { DonoDoAcesso, ResultadoDoAcesso } from './cache-de-contexto-de-acesso.js';
import { emContextoDaInstituicao } from './contexto-da-instituicao.js';
import { gruposAtivosDoUsuario, permissoesEfetivasDosGrupos } from './consultas-de-acesso.js';

const CODIGO_DE_RECUSA_POR_SITUACAO: Record<Exclude<SituacaoUsuario, 'ATIVO'>, CodigoDeRecusa> = {
  CONVITE_PENDENTE: 'USUARIO_CONVITE_PENDENTE',
  SUSPENSO: 'USUARIO_SUSPENSO',
  REVOGADO: 'USUARIO_REVOGADO',
};

@Injectable()
export class ResolvedorDeContextoDeAcessoDaIdentidade extends ResolvedorDeContextoDeAcesso {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly cache: CacheDeContextoDeAcesso,
  ) {
    super();
  }

  async resolver(identidade: IdentidadeAutenticada): Promise<ContextoDeAcesso | RecusaDeAcesso> {
    const emCache = this.cache.obter(identidade.sub);
    if (emCache !== undefined) return emCache;

    const geracaoDaLeitura = this.cache.geracaoAtual();
    const dono = await this.resolverSujeito(identidade.sub);
    if (dono === undefined) return recusarAcesso('USUARIO_DESCONHECIDO');

    const resultado = await this.lerAcessoDoUsuario(dono);
    this.cache.guardar(identidade.sub, dono, resultado, geracaoDaLeitura);
    return resultado;
  }

  private resolverSujeito(sujeito: string): Promise<DonoDoAcesso | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<{ instituicao_id: string; usuario_id: string }>`
        select instituicao_id, usuario_id from identidade.resolver_sujeito(${sujeito})
      `.execute(kysely);
      const [linha] = rows;
      if (linha === undefined) return undefined;
      return { instituicaoId: linha.instituicao_id as InstituicaoId, usuarioId: linha.usuario_id as UsuarioId };
    });
  }

  private lerAcessoDoUsuario(dono: DonoDoAcesso): Promise<ResultadoDoAcesso> {
    return emContextoDaInstituicao(dono.instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
        const usuario = await kysely
          .selectFrom('identidade.usuario')
          .select('situacao')
          .where('id', '=', dono.usuarioId)
          .executeTakeFirst();
        if (usuario === undefined) return recusarAcesso('USUARIO_DESCONHECIDO');

        const situacao = usuario.situacao as SituacaoUsuario;
        if (situacao !== 'ATIVO') return recusarAcesso(CODIGO_DE_RECUSA_POR_SITUACAO[situacao]);

        const grupos = await gruposAtivosDoUsuario(kysely, dono.usuarioId);
        return criarContextoDeAcesso({ ...dono, permissoes: new Set(permissoesEfetivasDosGrupos(grupos)) });
      }),
    );
  }
}
