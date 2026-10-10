import type { GrupoId, InstituicaoId, Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import type {
  ContextoDaTransacao,
  ModoDeTransacao,
} from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../src/shared/infrastructure/relogio.js';
import { AlteracaoQuePodeTirarAdministrador } from '../../../src/modules/identidade/application/administracao/alteracao-que-pode-tirar-administrador.js';
import { LeitorDaAdministracao } from '../../../src/modules/identidade/application/administracao/leitor-da-administracao.js';
import type { FotografiaDaAdministracao } from '../../../src/modules/identidade/application/administracao/leitor-da-administracao.js';
import { TravaDaAdministracao } from '../../../src/modules/identidade/application/administracao/trava-da-administracao.js';
import { PoliticaDoUltimoAdministrador } from '../../../src/modules/identidade/domain/servicos/politica-do-ultimo-administrador.js';
import { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';

export const INSTITUICAO = 'a0000000-0000-7000-8000-000000000000' as InstituicaoId;
export const AUTOR = 'a1000000-0000-7000-8000-000000000001' as UsuarioId;
export const ALVO = 'a1000000-0000-7000-8000-000000000002' as UsuarioId;
export const GRUPO_ADMINISTRADOR = 'b1000000-0000-7000-8000-000000000001' as GrupoId;
export const GRUPO_LEITURA = 'b1000000-0000-7000-8000-000000000002' as GrupoId;
export const GRUPO_DE_OUTRA_INSTITUICAO = 'b1000000-0000-7000-8000-0000000000ff' as GrupoId;
export const GRUPO_INATIVO = 'b1000000-0000-7000-8000-0000000000fe' as GrupoId;
export const AGORA = new Date('2026-03-05T10:00:00.000Z');
export const ACESSO = { usuarioId: AUTOR, instituicaoId: INSTITUICAO };

const PERMISSOES_DE_ADMINISTRADOR: readonly Permissao[] = ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'];

export class RelogioFixo extends Relogio {
  agora(): Date {
    return AGORA;
  }
}

export class UnidadeDeTrabalhoFalsa extends UnidadeDeTrabalho {
  readonly modos: ModoDeTransacao[] = [];
  private readonly ganchos: Array<() => void> = [];

  transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.modos.push(modo);
    const parcial: Partial<ContextoDaTransacao> = { aoConfirmar: (gancho) => void this.ganchos.push(gancho) };
    return fn(parcial as ContextoDaTransacao);
  }

  confirmar(): void {
    for (const gancho of this.ganchos.splice(0)) gancho();
  }
}

export class TravaFalsa extends TravaDaAdministracao {
  adquirir(): Promise<void> {
    return Promise.resolve();
  }
}

export class LeitorFalso extends LeitorDaAdministracao {
  constructor(private readonly fotografia: FotografiaDaAdministracao) {
    super();
  }

  instituicao(): Promise<FotografiaDaAdministracao> {
    return Promise.resolve(this.fotografia);
  }
}

export class RepositorioDeUsuarioEmMemoria extends RepositorioDeUsuario {
  readonly salvos: Usuario[] = [];

  constructor(private readonly usuarios: readonly Usuario[]) {
    super();
  }

  porId(id: UsuarioId): Promise<Usuario | undefined> {
    return Promise.resolve(this.usuarios.find((usuario) => usuario.id === id));
  }

  adicionar(): Promise<void> {
    return Promise.resolve();
  }

  salvar(usuario: Usuario): Promise<number> {
    this.salvos.push(usuario);
    return Promise.resolve(usuario.versao + 1);
  }
}

export function usuarioEm(
  id: UsuarioId,
  situacao: SituacaoUsuario,
  grupos: readonly GrupoId[],
  versao = 3,
): Usuario {
  return Usuario.reconstituir(
    {
      id,
      pessoaId: null,
      subjectId: 'sub',
      nome: 'Maria Silva',
      email: 'maria@casa.org',
      situacao,
      grupos,
      ativadoEm: null,
      suspensoEm: situacao === 'SUSPENSO' ? AGORA : null,
      ultimoAcessoEm: null,
      convite: null,
    },
    versao,
  );
}

const GRUPOS_ATIVOS: FotografiaDaAdministracao['gruposAtivos'] = [
  { id: GRUPO_ADMINISTRADOR, permissoes: PERMISSOES_DE_ADMINISTRADOR },
  { id: GRUPO_LEITURA, permissoes: ['financeiro.lancamento.ler'] },
];

export function instituicaoComDoisAdministradores(): FotografiaDaAdministracao {
  return {
    usuarios: [
      { id: AUTOR, situacao: 'ATIVO', grupos: [GRUPO_ADMINISTRADOR] },
      { id: ALVO, situacao: 'ATIVO', grupos: [GRUPO_ADMINISTRADOR] },
    ],
    gruposAtivos: GRUPOS_ATIVOS,
  };
}

export function instituicaoOndeOAlvoEOUnicoAdministrador(): FotografiaDaAdministracao {
  return {
    usuarios: [
      { id: AUTOR, situacao: 'ATIVO', grupos: [GRUPO_LEITURA] },
      { id: ALVO, situacao: 'ATIVO', grupos: [GRUPO_ADMINISTRADOR] },
    ],
    gruposAtivos: GRUPOS_ATIVOS,
  };
}

export function montarAlteracao(fotografia: FotografiaDaAdministracao): AlteracaoQuePodeTirarAdministrador {
  return new AlteracaoQuePodeTirarAdministrador(
    new UnidadeDeTrabalhoFalsa(),
    new TravaFalsa(),
    new LeitorFalso(fotografia),
    new PoliticaDoUltimoAdministrador(),
  );
}
