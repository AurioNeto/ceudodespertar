import { ProvedorDeIdentidadeIndisponivel } from '../../../src/modules/identidade/application/convite/conferidor-de-sujeito.js';
import { LocalizadorDeSujeito } from '../../../src/modules/identidade/application/seed-demo/localizador-de-sujeito.js';
import { PersistenciaDaDemonstracao } from '../../../src/modules/identidade/application/seed-demo/persistencia-da-demonstracao.js';
import type { UsuarioExistenteDaDemonstracao } from '../../../src/modules/identidade/application/seed-demo/persistencia-da-demonstracao.js';
import { SemeaduraDeDemonstracao } from '../../../src/modules/identidade/application/seed-demo/semeadura-de-demonstracao.js';
import type { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';
import { PersistenciaDoBootstrapKysely } from '../../../src/modules/identidade/infrastructure/bootstrap/persistencia-do-bootstrap.kysely.js';
import { GeradorDeTokenDeConviteNode } from '../../../src/modules/identidade/infrastructure/convite/gerador-de-token-de-convite.node.js';
import { PersistenciaDaDemonstracaoKysely } from '../../../src/modules/identidade/infrastructure/seed-demo/persistencia-da-demonstracao.kysely.js';
import { LeitorDeGruposDaInstituicaoKysely } from '../../../src/modules/identidade/infrastructure/usuarios/leitor-de-grupos-da-instituicao.kysely.js';
import { RelogioDoSistema } from '../../../src/shared/infrastructure/relogio.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { AmbienteDaIdentidade } from '../apoio.js';

export const SUB_DO_DEV = '3b1f6c1e-52c8-4f5a-9a47-0d5cf0f4a001';
export const OUTRO_SUB_DO_DEV = '9c2e7d2f-63d9-4a6b-8b58-1e6da1a5b002';

export class LocalizadorQueResponde extends LocalizadorDeSujeito {
  readonly consultados: string[] = [];
  sub: string | undefined = SUB_DO_DEV;
  indisponivel = false;

  subDoUsuario(username: string): Promise<string | undefined> {
    this.consultados.push(username);
    if (this.indisponivel) return Promise.reject(new ProvedorDeIdentidadeIndisponivel('fora do ar'));
    return Promise.resolve(this.sub);
  }
}

export interface PecasDaSemeadura {
  readonly localizador?: LocalizadorDeSujeito;
  readonly usuarios?: RepositorioDeUsuario;
  readonly demonstracao?: PersistenciaDaDemonstracao;
}

const ESPERA_DO_PORTAO_EM_MS = 400;

export class PortaoDeChegada {
  private chegadas = 0;
  private liberarQuemEspera: (() => void) | undefined;

  passar(): Promise<void> {
    this.chegadas += 1;
    if (this.chegadas >= 2) {
      this.liberarQuemEspera?.();
      return Promise.resolve();
    }
    return new Promise((resolver) => {
      this.liberarQuemEspera = resolver;
      setTimeout(resolver, ESPERA_DO_PORTAO_EM_MS);
    });
  }
}

export class PersistenciaDaDemonstracaoComPortao extends PersistenciaDaDemonstracao {
  constructor(
    private readonly real: PersistenciaDaDemonstracao,
    private readonly portao: PortaoDeChegada,
  ) {
    super();
  }

  instituicaoExiste(id: string): Promise<boolean> {
    return this.real.instituicaoExiste(id);
  }

  async existeInstituicaoAlemDe(id: string): Promise<boolean> {
    const existe = await this.real.existeInstituicaoAlemDe(id);
    await this.portao.passar();
    return existe;
  }

  usuarioPorEmail(email: string): Promise<UsuarioExistenteDaDemonstracao | undefined> {
    return this.real.usuarioPorEmail(email);
  }
}

export function montarSemeadura(ambiente: AmbienteDaIdentidade, pecas: PecasDaSemeadura = {}): SemeaduraDeDemonstracao {
  return new SemeaduraDeDemonstracao(
    ambiente.unidadeDeTrabalho,
    new PersistenciaDoBootstrapKysely(ambiente.unidadeDeTrabalho),
    pecas.demonstracao ?? new PersistenciaDaDemonstracaoKysely(ambiente.unidadeDeTrabalho),
    ambiente.semeador,
    new LeitorDeGruposDaInstituicaoKysely(ambiente.unidadeDeTrabalho),
    pecas.usuarios ?? ambiente.usuarios,
    new GeradorDeTokenDeConviteNode(),
    pecas.localizador ?? new LocalizadorQueResponde(),
    new RelogioDoSistema(),
  );
}

export interface FotoDoBanco {
  readonly usuarios: unknown[];
  readonly convites: unknown[];
  readonly grupos: unknown[];
  readonly atribuicoes: unknown[];
  readonly instituicoes: unknown[];
  readonly outbox: unknown[];
  readonly auditoria: unknown[];
}

async function linhas(banco: BancoDeTeste, consulta: string): Promise<unknown[]> {
  const { rows } = await banco.owner.query(consulta);
  return rows as unknown[];
}

export async function fotoDoBanco(banco: BancoDeTeste): Promise<FotoDoBanco> {
  return {
    usuarios: await linhas(banco, 'select * from identidade.usuario order by email'),
    convites: await linhas(banco, 'select * from identidade.convite order by id'),
    grupos: await linhas(banco, 'select * from identidade.grupo order by id'),
    atribuicoes: await linhas(banco, 'select * from identidade.usuario_grupo order by usuario_id, grupo_id'),
    instituicoes: await linhas(banco, 'select * from shared.instituicao order by id'),
    outbox: await linhas(banco, 'select evento_id, tipo, agregado_id from shared.outbox order by evento_id'),
    auditoria: await linhas(banco, 'select * from identidade.registro_de_auditoria order by id'),
  };
}
