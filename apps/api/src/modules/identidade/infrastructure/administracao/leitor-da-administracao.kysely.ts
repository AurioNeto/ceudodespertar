import { Injectable } from '@nestjs/common';
import type { GrupoId, Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDaAdministracao } from '../../application/administracao/leitor-da-administracao.js';
import type {
  FotografiaDaAdministracao,
  GrupoAtivoDaAdministracao,
  UsuarioDaAdministracao,
} from '../../application/administracao/leitor-da-administracao.js';
import { ehPermissaoDoCatalogo } from '../../domain/permissao/catalogo-de-permissoes.js';

@Injectable()
export class LeitorDaAdministracaoKysely extends LeitorDaAdministracao {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  instituicao(): Promise<FotografiaDaAdministracao> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linhasDeUsuarios = await kysely
        .selectFrom('identidade.usuario as usuario')
        .leftJoin('identidade.usuario_grupo as atribuicao', 'atribuicao.usuario_id', 'usuario.id')
        .select(['usuario.id as usuarioId', 'usuario.situacao as situacao', 'atribuicao.grupo_id as grupoId'])
        .orderBy('usuario.id')
        .orderBy('atribuicao.grupo_id')
        .execute();
      const linhasDeGrupos = await kysely
        .selectFrom('identidade.grupo as grupo')
        .leftJoin('identidade.grupo_permissao as concessao', 'concessao.grupo_id', 'grupo.id')
        .select(['grupo.id as grupoId', 'concessao.permissao as permissao'])
        .where('grupo.ativo', '=', true)
        .orderBy('grupo.id')
        .orderBy('concessao.permissao')
        .execute();

      const usuarios = new Map<string, { id: UsuarioId; situacao: SituacaoUsuario; grupos: GrupoId[] }>();
      for (const linha of linhasDeUsuarios) {
        const usuario = usuarios.get(linha.usuarioId) ?? {
          id: linha.usuarioId as UsuarioId,
          situacao: linha.situacao as SituacaoUsuario,
          grupos: [],
        };
        if (linha.grupoId !== null) usuario.grupos.push(linha.grupoId as GrupoId);
        usuarios.set(linha.usuarioId, usuario);
      }

      const grupos = new Map<string, { id: GrupoId; permissoes: Permissao[] }>();
      for (const linha of linhasDeGrupos) {
        const grupo = grupos.get(linha.grupoId) ?? { id: linha.grupoId as GrupoId, permissoes: [] };
        if (linha.permissao !== null && ehPermissaoDoCatalogo(linha.permissao)) grupo.permissoes.push(linha.permissao);
        grupos.set(linha.grupoId, grupo);
      }

      return {
        usuarios: [...usuarios.values()] satisfies UsuarioDaAdministracao[],
        gruposAtivos: [...grupos.values()] satisfies GrupoAtivoDaAdministracao[],
      };
    });
  }
}
