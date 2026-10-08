import type { GrupoId, Permissao } from '@cdd/contracts';
import { Grupo } from '../../../src/modules/identidade/domain/grupo/grupo.js';
import { RepositorioDeGrupo } from '../../../src/modules/identidade/domain/grupo/grupo.repo.js';

export const VERSAO_DO_GRUPO = 4;

export class RepositorioDeGrupoEmMemoria extends RepositorioDeGrupo {
  readonly salvos: Grupo[] = [];

  constructor(private readonly grupos: readonly Grupo[]) {
    super();
  }

  porId(id: GrupoId): Promise<Grupo | undefined> {
    return Promise.resolve(this.grupos.find((grupo) => grupo.id === id));
  }

  adicionar(): Promise<void> {
    return Promise.resolve();
  }

  salvar(grupo: Grupo): Promise<number> {
    this.salvos.push(grupo);
    return Promise.resolve(grupo.versao + 1);
  }
}

export function grupoEm(id: GrupoId, permissoes: readonly Permissao[], ativo = true): Grupo {
  return Grupo.reconstituir({
    id,
    codigoSistema: null,
    nome: 'Grupo de teste',
    descricao: 'Descrição de teste',
    protegido: false,
    permissoes,
    ativo,
    versao: VERSAO_DO_GRUPO,
  });
}
