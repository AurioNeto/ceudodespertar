import { createHash } from 'node:crypto';
import { BootstrapDaIdentidade } from '../../../src/modules/identidade/application/bootstrap/bootstrap-da-identidade.js';
import type { ComandoDeBootstrap } from '../../../src/modules/identidade/application/bootstrap/bootstrap-da-identidade.js';
import { PersistenciaDoBootstrap } from '../../../src/modules/identidade/application/bootstrap/persistencia-do-bootstrap.js';
import { SemeadorDeGrupos } from '../../../src/modules/identidade/application/bootstrap/semeador-de-grupos.js';
import {
  ConferidorDeSujeito,
  ProvedorDeIdentidadeIndisponivel,
} from '../../../src/modules/identidade/application/convite/conferidor-de-sujeito.js';
import type { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';
import { PersistenciaDoBootstrapKysely } from '../../../src/modules/identidade/infrastructure/bootstrap/persistencia-do-bootstrap.kysely.js';
import { GeradorDeTokenDeConviteNode } from '../../../src/modules/identidade/infrastructure/convite/gerador-de-token-de-convite.node.js';
import { LeitorDeGruposDaInstituicaoKysely } from '../../../src/modules/identidade/infrastructure/usuarios/leitor-de-grupos-da-instituicao.kysely.js';
import { Relogio } from '../../../src/shared/infrastructure/relogio.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { AmbienteDaIdentidade } from '../apoio.js';

export const SUJEITO_DA_ADMINISTRADORA = 'sub-administradora';
export const EMAIL_DA_ADMINISTRADORA = 'administradora@casa.org';

export const COMANDO_POR_CONVITE: ComandoDeBootstrap = {
  instituicaoNome: 'Casa do Despertar',
  adminNome: 'Administradora Inicial',
  adminEmail: EMAIL_DA_ADMINISTRADORA,
};

export const COMANDO_POR_VINCULO: ComandoDeBootstrap = { ...COMANDO_POR_CONVITE, sujeito: SUJEITO_DA_ADMINISTRADORA };

export const sha256Hex = (texto: string): string => createHash('sha256').update(texto).digest('hex');

export class ConferidorQueResponde extends ConferidorDeSujeito {
  readonly consultados: string[] = [];
  readonly emails = new Map<string, string>([[SUJEITO_DA_ADMINISTRADORA, EMAIL_DA_ADMINISTRADORA]]);
  indisponivel = false;
  aoConsultar: () => Promise<void> = () => Promise.resolve();

  async emailDo(sujeito: string): Promise<string | undefined> {
    this.consultados.push(sujeito);
    await this.aoConsultar();
    if (this.indisponivel) throw new ProvedorDeIdentidadeIndisponivel('fora do ar');
    return this.emails.get(sujeito);
  }
}

export class RelogioEmSequencia extends Relogio {
  private posicao = 0;

  constructor(private readonly instantes: readonly Date[]) {
    super();
  }

  agora(): Date {
    const instante = this.instantes[Math.min(this.posicao, this.instantes.length - 1)] as Date;
    this.posicao += 1;
    return instante;
  }
}

export class SemeadorQueNaoSemeia extends SemeadorDeGrupos {
  semear(): Promise<void> {
    return Promise.resolve();
  }
}

export interface PecasDoBootstrap {
  readonly conferidor?: ConferidorDeSujeito;
  readonly semeador?: SemeadorDeGrupos;
  readonly persistencia?: PersistenciaDoBootstrap;
  readonly relogio?: Relogio;
  readonly usuarios?: RepositorioDeUsuario;
}

export function montarBootstrap(ambiente: AmbienteDaIdentidade, pecas: PecasDoBootstrap = {}): BootstrapDaIdentidade {
  return new BootstrapDaIdentidade(
    ambiente.unidadeDeTrabalho,
    pecas.persistencia ?? new PersistenciaDoBootstrapKysely(ambiente.unidadeDeTrabalho),
    pecas.semeador ?? ambiente.semeador,
    new LeitorDeGruposDaInstituicaoKysely(ambiente.unidadeDeTrabalho),
    pecas.usuarios ?? ambiente.usuarios,
    new GeradorDeTokenDeConviteNode(),
    pecas.conferidor ?? new ConferidorQueResponde(),
    pecas.relogio ?? new RelogioEmSequencia([new Date()]),
  );
}

export interface ContagensDoBanco {
  readonly instituicoes: number;
  readonly grupos: number;
  readonly permissoesDeGrupo: number;
  readonly usuarios: number;
  readonly convites: number;
  readonly atribuicoesDeGrupo: number;
  readonly auditoria: number;
  readonly marcador: number;
  readonly outbox: number;
}

const TABELAS_COM_ISOLAMENTO = [
  'usuario',
  'grupo',
  'grupo_permissao',
  'usuario_grupo',
  'convite',
  'registro_de_auditoria',
];

export async function permitirLeituraSemContextoAoDono(banco: BancoDeTeste): Promise<void> {
  await Promise.all(
    TABELAS_COM_ISOLAMENTO.map((tabela) =>
      banco.owner.query(`alter table identidade.${tabela} no force row level security`),
    ),
  );
}

async function contar(banco: BancoDeTeste, tabela: string): Promise<number> {
  const { rows } = await banco.owner.query(`select count(*)::int as total from ${tabela}`);
  return (rows[0] as { total: number }).total;
}

export async function contagensDoBanco(banco: BancoDeTeste): Promise<ContagensDoBanco> {
  return {
    instituicoes: await contar(banco, 'shared.instituicao'),
    grupos: await contar(banco, 'identidade.grupo'),
    permissoesDeGrupo: await contar(banco, 'identidade.grupo_permissao'),
    usuarios: await contar(banco, 'identidade.usuario'),
    convites: await contar(banco, 'identidade.convite'),
    atribuicoesDeGrupo: await contar(banco, 'identidade.usuario_grupo'),
    auditoria: await contar(banco, 'identidade.registro_de_auditoria'),
    marcador: await contar(banco, 'identidade.bootstrap_executado'),
    outbox: await contar(banco, 'shared.outbox'),
  };
}

export const BANCO_VAZIO: ContagensDoBanco = {
  instituicoes: 0,
  grupos: 0,
  permissoesDeGrupo: 0,
  usuarios: 0,
  convites: 0,
  atribuicoesDeGrupo: 0,
  auditoria: 0,
  marcador: 0,
  outbox: 0,
};
