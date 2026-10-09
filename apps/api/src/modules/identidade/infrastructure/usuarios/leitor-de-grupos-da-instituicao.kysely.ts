import { Injectable } from '@nestjs/common';
import type { CodigoGrupo, GrupoId, GrupoResumido } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDeGruposDaInstituicao } from '../../application/usuarios/leitor-de-grupos-da-instituicao.js';

interface LinhaDeGrupo {
  readonly id: string;
  readonly nome: string;
}

function paraResumo({ id, nome }: LinhaDeGrupo): GrupoResumido {
  return { id: id as GrupoId, nome };
}

@Injectable()
export class LeitorDeGruposDaInstituicaoKysely extends LeitorDeGruposDaInstituicao {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  ativosPorIds(ids: readonly GrupoId[]): Promise<GrupoResumido[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely
        .selectFrom('identidade.grupo')
        .select(['id', 'nome'])
        .where('ativo', '=', true)
        .where('id', 'in', [...ids])
        .execute();
      return linhas.map(paraResumo);
    });
  }

  doSistema(codigo: CodigoGrupo): Promise<GrupoResumido | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely
        .selectFrom('identidade.grupo')
        .select(['id', 'nome'])
        .where('codigo_sistema', '=', codigo)
        .where('ativo', '=', true)
        .executeTakeFirst();
      return linha === undefined ? undefined : paraResumo(linha);
    });
  }
}
