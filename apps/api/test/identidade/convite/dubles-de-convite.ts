import type { CodigoGrupo, GrupoId, GrupoResumido, UsuarioId } from '@cdd/contracts';
import { EntregaDeConvite } from '../../../src/modules/identidade/application/convite/entrega-de-convite.js';
import { EnviadorDeConvite } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import type { ConviteParaEnviar } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { GeradorDeTokenDeConvite } from '../../../src/modules/identidade/application/convite/gerador-de-token-de-convite.js';
import type { TokenDeConvite } from '../../../src/modules/identidade/application/convite/gerador-de-token-de-convite.js';
import { LeitorDeGruposDaInstituicao } from '../../../src/modules/identidade/application/usuarios/leitor-de-grupos-da-instituicao.js';
import type { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';
import { UnidadeDeTrabalho } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import type {
  ContextoDaTransacao,
  ModoDeTransacao,
} from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';

export const TOKEN_EM_CLARO = 'token-em-claro-do-convite';
export const HASH_DO_TOKEN = 'a'.repeat(64);
export const GRUPO_PADRAO: GrupoResumido = { id: 'b1000000-0000-7000-8000-000000000002' as GrupoId, nome: 'Leitura' };
export const GRUPO_DE_TESTE: GrupoResumido = { id: 'b1000000-0000-7000-8000-000000000003' as GrupoId, nome: 'Tesouraria' };

export class GeradorFixo extends GeradorDeTokenDeConvite {
  private sequencia = 0;

  gerar(): TokenDeConvite {
    this.sequencia += 1;
    return { token: `${TOKEN_EM_CLARO}-${this.sequencia}`, hash: String(this.sequencia).padStart(64, 'a') };
  }
}

export class EnviadorEspiao extends EnviadorDeConvite {
  readonly enviados: ConviteParaEnviar[] = [];
  falharCom: Error | undefined;

  enviar(convite: ConviteParaEnviar): Promise<void> {
    this.enviados.push(convite);
    return this.falharCom === undefined ? Promise.resolve() : Promise.reject(this.falharCom);
  }
}

export class UnidadeDeTrabalhoComGanchos extends UnidadeDeTrabalho {
  private readonly ganchos: Array<() => void> = [];
  readonly modos: ModoDeTransacao[] = [];

  async transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.modos.push(modo);
    const parcial: Partial<ContextoDaTransacao> = { aoConfirmar: (gancho) => void this.ganchos.push(gancho) };
    return fn(parcial as ContextoDaTransacao);
  }

  confirmar(): void {
    for (const gancho of this.ganchos.splice(0)) gancho();
  }
}

export class LeitorDeGruposFalso extends LeitorDeGruposDaInstituicao {
  constructor(private readonly grupos: readonly GrupoResumido[], private readonly grupoDeSistema?: GrupoResumido) {
    super();
  }

  ativosPorIds(ids: readonly GrupoId[]): Promise<GrupoResumido[]> {
    return Promise.resolve(this.grupos.filter(({ id }) => ids.includes(id)));
  }

  doSistema(_codigo: CodigoGrupo): Promise<GrupoResumido | undefined> {
    return Promise.resolve(this.grupoDeSistema);
  }
}

export class RepositorioQueGuardaAdicionados extends RepositorioDeUsuario {
  readonly adicionados: Usuario[] = [];
  readonly salvos: Usuario[] = [];

  constructor(private readonly existentes: readonly Usuario[] = []) {
    super();
  }

  porId(id: UsuarioId): Promise<Usuario | undefined> {
    return Promise.resolve(this.existentes.find((usuario) => usuario.id === id));
  }

  adicionar(usuario: Usuario): Promise<void> {
    this.adicionados.push(usuario);
    return Promise.resolve();
  }

  salvar(usuario: Usuario): Promise<number> {
    this.salvos.push(usuario);
    return Promise.resolve(usuario.versao + 1);
  }
}

export function montarEntrega(): { unidade: UnidadeDeTrabalhoComGanchos; enviador: EnviadorEspiao; entrega: EntregaDeConvite } {
  const enviador = new EnviadorEspiao();
  return { unidade: new UnidadeDeTrabalhoComGanchos(), enviador, entrega: new EntregaDeConvite(enviador) };
}
