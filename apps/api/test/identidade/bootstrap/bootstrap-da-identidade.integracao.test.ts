import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'kysely';
import { PersistenciaDoBootstrap } from '../../../src/modules/identidade/application/bootstrap/persistencia-do-bootstrap.js';
import type { ResultadoDoBootstrap } from '../../../src/modules/identidade/application/bootstrap/bootstrap-da-identidade.js';
import { PersistenciaDoBootstrapKysely } from '../../../src/modules/identidade/infrastructure/bootstrap/persistencia-do-bootstrap.kysely.js';
import { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';
import type { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { emContextoDaInstituicao } from '../../../src/shared/infrastructure/contexto-da-instituicao.js';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import type { Result } from '../../../src/shared/kernel/result.js';
import type { ErroDeDominio } from '../../../src/shared/kernel/erro-de-dominio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { abrirAmbienteDaIdentidade, eventosDoOutbox } from '../apoio.js';
import type { AmbienteDaIdentidade } from '../apoio.js';
import {
  BANCO_VAZIO,
  COMANDO_POR_CONVITE,
  COMANDO_POR_VINCULO,
  ConferidorQueResponde,
  EMAIL_DA_ADMINISTRADORA,
  RelogioEmSequencia,
  SUJEITO_DA_ADMINISTRADORA,
  SemeadorQueNaoSemeia,
  contagensDoBanco,
  montarBootstrap,
  permitirLeituraSemContextoAoDono,
  sha256Hex,
} from './apoio-de-bootstrap.js';

const GRUPOS_DE_SISTEMA = 6;
const ESPERA_DO_PORTAO_EM_MS = 400;
const HORAS_ALEM_DA_VALIDADE_DO_CONVITE = 73;
const MILISSEGUNDOS_POR_HORA = 3_600_000;
const INSTITUICAO_ANTERIOR = 'c0000000-0000-0000-0000-000000000000';

function codigoDoErro(resultado: Result<ResultadoDoBootstrap, ErroDeDominio>): string | undefined {
  return ehErr(resultado) ? resultado.erro.codigo : undefined;
}

function sucessoDe(resultado: Result<ResultadoDoBootstrap, ErroDeDominio>): ResultadoDoBootstrap {
  if (!ehOk(resultado)) throw new Error(`bootstrap recusado: ${resultado.erro.codigo}`);
  return resultado.valor;
}

class PersistenciaComPortao extends PersistenciaDoBootstrap {
  private chegadas = 0;
  private liberarQuemEspera: (() => void) | undefined;

  constructor(private readonly real: PersistenciaDoBootstrap) {
    super();
  }

  adquirirTravaGlobal(): Promise<void> {
    return this.real.adquirirTravaGlobal();
  }

  async jaFoiExecutado(): Promise<boolean> {
    const executado = await this.real.jaFoiExecutado();
    await this.esperarOutraExecucao();
    return executado;
  }

  criarInstituicao(id: string, nome: string): Promise<void> {
    return this.real.criarInstituicao(id, nome);
  }

  registrarExecucao(...argumentos: Parameters<PersistenciaDoBootstrap['registrarExecucao']>): Promise<void> {
    return this.real.registrarExecucao(...argumentos);
  }

  private esperarOutraExecucao(): Promise<void> {
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

class RepositorioQueFalhaAoSalvar extends RepositorioDeUsuario {
  constructor(private readonly real: RepositorioDeUsuario) {
    super();
  }

  porId(...argumentos: Parameters<RepositorioDeUsuario['porId']>): ReturnType<RepositorioDeUsuario['porId']> {
    return this.real.porId(...argumentos);
  }

  adicionar(usuario: Usuario): Promise<void> {
    return this.real.adicionar(usuario);
  }

  salvar(): Promise<number> {
    return Promise.reject(new Error('falha ao salvar'));
  }
}

describe('BootstrapDaIdentidade com Postgres real', () => {
  let banco: BancoDeTeste;
  let ambiente: AmbienteDaIdentidade;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await permitirLeituraSemContextoAoDono(banco);
    ambiente = await abrirAmbienteDaIdentidade(banco);
  });

  afterEach(async () => {
    await ambiente.orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  async function consultar<T extends object>(consulta: string, parametros: readonly unknown[] = []): Promise<T[]> {
    const { rows } = await banco.owner.query(consulta, [...parametros]);
    return rows as T[];
  }

  async function marcadoresVisiveisSob(instituicaoId: string): Promise<number> {
    await banco.app.query('begin');
    try {
      await banco.app.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
      const { rows } = await banco.app.query('select count(*)::int as total from identidade.bootstrap_executado');
      return (rows[0] as { total: number }).total;
    } finally {
      await banco.app.query('rollback');
    }
  }

  describe('modo convite', () => {
    it('cria a instituição, os 6 grupos de sistema, o administrador pendente no grupo ADMINISTRADOR e o marcador', async () => {
      const resultado = sucessoDe(await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE));

      const contagens = await contagensDoBanco(banco);
      expect(contagens.instituicoes).toBe(1);
      expect(contagens.grupos).toBe(GRUPOS_DE_SISTEMA);
      expect(contagens.usuarios).toBe(1);
      expect(contagens.marcador).toBe(1);

      const [usuario] = await consultar<{ id: string; situacao: string; subject_id: string | null; instituicao_id: string }>(
        'select id, situacao, subject_id, instituicao_id from identidade.usuario',
      );
      expect(usuario).toMatchObject({ id: resultado.usuarioId, situacao: 'CONVITE_PENDENTE', subject_id: null });
      expect(usuario?.instituicao_id).toBe(resultado.instituicaoId);

      const grupos = await consultar<{ codigo_sistema: string }>(
        `select g.codigo_sistema from identidade.usuario_grupo ug join identidade.grupo g on g.id = ug.grupo_id
          where ug.usuario_id = $1`,
        [resultado.usuarioId],
      );
      expect(grupos).toEqual([{ codigo_sistema: 'ADMINISTRADOR' }]);

      const [marcador] = await consultar<{ admin_usuario_id: string }>('select admin_usuario_id from identidade.bootstrap_executado');
      expect(marcador?.admin_usuario_id).toBe(resultado.usuarioId);
    });

    it('grava o convite vigente cujo hash é o do token devolvido, convidado pelo próprio administrador', async () => {
      const resultado = sucessoDe(await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE));

      expect(resultado.modo).toBe('CONVITE');
      if (resultado.modo !== 'CONVITE') return;
      const [convite] = await consultar<{ token: string; criado_por: string; usado_em: Date | null; revogado_em: Date | null }>(
        `select encode(token_sha256, 'hex') as token, criado_por, usado_em, revogado_em from identidade.convite`,
      );
      expect(convite).toEqual({
        token: sha256Hex(resultado.convite.token),
        criado_por: resultado.usuarioId,
        usado_em: null,
        revogado_em: null,
      });
      expect(resultado.convite).toMatchObject({
        usuarioId: resultado.usuarioId,
        email: EMAIL_DA_ADMINISTRADORA,
        nome: COMANDO_POR_CONVITE.adminNome,
      });
    });

    it('grava só o convite no outbox e não consulta o provedor de identidade', async () => {
      const conferidor = new ConferidorQueResponde();

      const resultado = sucessoDe(await montarBootstrap(ambiente, { conferidor }).executar(COMANDO_POR_CONVITE));

      expect(await eventosDoOutbox(banco, resultado.usuarioId)).toEqual(['USUARIO_CONVIDADO']);
      expect(conferidor.consultados).toEqual([]);
    });
  });

  describe('modo vínculo', () => {
    it('cria o administrador ativo com o sub informado, convite usado e evento de ativação', async () => {
      const resultado = sucessoDe(await montarBootstrap(ambiente).executar(COMANDO_POR_VINCULO));

      expect(resultado).toEqual({
        modo: 'VINCULO',
        instituicaoId: expect.any(String),
        usuarioId: expect.any(String),
      });
      const [usuario] = await consultar<{ situacao: string; subject_id: string | null }>(
        'select situacao, subject_id from identidade.usuario',
      );
      expect(usuario).toEqual({ situacao: 'ATIVO', subject_id: SUJEITO_DA_ADMINISTRADORA });
      const [convite] = await consultar<{ usado: boolean }>('select usado_em is not null as usado from identidade.convite');
      expect(convite?.usado).toBe(true);
      expect(await eventosDoOutbox(banco, resultado.usuarioId)).toEqual([
        'USUARIO_CONVIDADO',
        'USUARIO_ATIVADO',
      ]);
      expect((await contagensDoBanco(banco)).marcador).toBe(1);
    });

    it('aceita e-mail do provedor com caixa e espaços diferentes do informado', async () => {
      const conferidor = new ConferidorQueResponde();
      conferidor.emails.set(SUJEITO_DA_ADMINISTRADORA, `  ${EMAIL_DA_ADMINISTRADORA.toUpperCase()} `);

      const resultado = await montarBootstrap(ambiente, { conferidor }).executar(COMANDO_POR_VINCULO);

      expect(ehOk(resultado)).toBe(true);
      expect(conferidor.consultados).toEqual([SUJEITO_DA_ADMINISTRADORA]);
    });

    it('e-mail do sub diferente do informado: EMAIL_DO_SUJEITO_DIVERGENTE e nada é gravado', async () => {
      const conferidor = new ConferidorQueResponde();
      conferidor.emails.set(SUJEITO_DA_ADMINISTRADORA, 'outra.pessoa@casa.org');

      const resultado = await montarBootstrap(ambiente, { conferidor }).executar(COMANDO_POR_VINCULO);

      expect(codigoDoErro(resultado)).toBe('EMAIL_DO_SUJEITO_DIVERGENTE');
      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });

    it('sub que não existe no provedor: SUJEITO_INEXISTENTE e nada é gravado', async () => {
      const conferidor = new ConferidorQueResponde();
      conferidor.emails.clear();

      const resultado = await montarBootstrap(ambiente, { conferidor }).executar(COMANDO_POR_VINCULO);

      expect(codigoDoErro(resultado)).toBe('SUJEITO_INEXISTENTE');
      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });

    it('provedor indisponível: PROVEDOR_DE_IDENTIDADE_INDISPONIVEL e nada é gravado', async () => {
      const conferidor = new ConferidorQueResponde();
      conferidor.indisponivel = true;

      const resultado = await montarBootstrap(ambiente, { conferidor }).executar(COMANDO_POR_VINCULO);

      expect(codigoDoErro(resultado)).toBe('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL');
      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });

    it('consulta o provedor sem nenhuma transação aberta no banco', async () => {
      const conferidor = new ConferidorQueResponde();
      const transacoesAbertasDuranteAConsulta: number[] = [];
      conferidor.aoConsultar = async () => {
        const { rows } = await banco.app.query(
          `select count(*)::int as total from pg_stat_activity
            where datname = current_database() and usename = 'cdd_app'
              and pid <> pg_backend_pid() and state like 'idle in transaction%'`,
        );
        transacoesAbertasDuranteAConsulta.push((rows[0] as { total: number }).total);
      };

      await montarBootstrap(ambiente, { conferidor }).executar(COMANDO_POR_VINCULO);

      expect(transacoesAbertasDuranteAConsulta).toEqual([0]);
    });
  });

  describe('atomicidade', () => {
    it('grupo ADMINISTRADOR ausente: devolve GRUPO_INEXISTENTE e desfaz a instituição já inserida', async () => {
      const resultado = await montarBootstrap(ambiente, { semeador: new SemeadorQueNaoSemeia() }).executar(
        COMANDO_POR_CONVITE,
      );

      expect(codigoDoErro(resultado)).toBe('GRUPO_INEXISTENTE');
      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });

    it('ativação recusada pelo domínio: o erro devolvido desfaz instituição, grupos, usuário e convite', async () => {
      const convidadoEm = new Date('2026-03-01T10:00:00.000Z');
      const depoisDaValidade = new Date(convidadoEm.getTime() + HORAS_ALEM_DA_VALIDADE_DO_CONVITE * MILISSEGUNDOS_POR_HORA);
      const relogio = new RelogioEmSequencia([convidadoEm, depoisDaValidade]);

      const resultado = await montarBootstrap(ambiente, { relogio }).executar(COMANDO_POR_VINCULO);

      expect(codigoDoErro(resultado)).toBe('CONVITE_EXPIRADO');
      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });

    it('falha ao salvar o usuário ativado: a exceção desfaz tudo', async () => {
      const usuarios = new RepositorioQueFalhaAoSalvar(ambiente.usuarios);

      await expect(montarBootstrap(ambiente, { usuarios }).executar(COMANDO_POR_VINCULO)).rejects.toThrow('falha ao salvar');

      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });
  });

  describe('segunda execução', () => {
    it('sequencial: recusa com BOOTSTRAP_JA_EXECUTADO e não grava nada novo', async () => {
      await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE);
      const depoisDaPrimeira = await contagensDoBanco(banco);

      const segunda = await montarBootstrap(ambiente).executar({ ...COMANDO_POR_CONVITE, adminEmail: 'outra@casa.org' });

      expect(codigoDoErro(segunda)).toBe('BOOTSTRAP_JA_EXECUTADO');
      expect(await contagensDoBanco(banco)).toEqual(depoisDaPrimeira);
    });

    it('concorrente: exatamente uma vence, a outra recebe BOOTSTRAP_JA_EXECUTADO e há uma só instituição', async () => {
      const persistencia = new PersistenciaComPortao(new PersistenciaDoBootstrapKysely(ambiente.unidadeDeTrabalho));
      const bootstrap = montarBootstrap(ambiente, { persistencia });

      const resultados = await Promise.all([
        bootstrap.executar(COMANDO_POR_CONVITE),
        bootstrap.executar({ ...COMANDO_POR_CONVITE, adminEmail: 'outra@casa.org' }),
      ]);

      expect(resultados.filter(ehOk)).toHaveLength(1);
      expect(resultados.map(codigoDoErro).filter((codigo) => codigo !== undefined)).toEqual(['BOOTSTRAP_JA_EXECUTADO']);
      const contagens = await contagensDoBanco(banco);
      expect(contagens.instituicoes).toBe(1);
      expect(contagens.marcador).toBe(1);
      expect(contagens.usuarios).toBe(1);
    });

    it('marcador legível sob o contexto de qualquer instituição, inclusive a recém-criada', async () => {
      const resultado = sucessoDe(await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE));

      expect(await marcadoresVisiveisSob(resultado.instituicaoId)).toBe(1);
      expect(await marcadoresVisiveisSob(INSTITUICAO_ANTERIOR)).toBe(1);
    });

    it('nova execução sob o contexto da instituição criada continua recusada', async () => {
      const primeira = sucessoDe(await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE));

      const segunda = await emContextoDaInstituicao(primeira.instituicaoId, () =>
        montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE),
      );

      expect(codigoDoErro(segunda)).toBe('BOOTSTRAP_JA_EXECUTADO');
    });
  });

  describe('banco com instituição anterior ao marcador', () => {
    it('recusa com BOOTSTRAP_JA_EXECUTADO e não grava nada além da instituição que já existia', async () => {
      await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2)', [INSTITUICAO_ANTERIOR, 'Casa antiga']);

      const resultado = await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE);

      expect(codigoDoErro(resultado)).toBe('BOOTSTRAP_JA_EXECUTADO');
      expect(await contagensDoBanco(banco)).toEqual({ ...BANCO_VAZIO, instituicoes: 1 });
    });
  });

  describe('papel de execução', () => {
    it('roda como cdd_app: a transação do caso de uso conecta com o papel da API e a RLS vale', async () => {
      const papeis: string[] = [];
      const persistencia = new (class extends PersistenciaDoBootstrap {
        private readonly real = new PersistenciaDoBootstrapKysely(ambiente.unidadeDeTrabalho);

        async adquirirTravaGlobal(): Promise<void> {
          await ambiente.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
            const { rows } = await sql<{ papel: string }>`select current_user as papel`.execute(kysely);
            papeis.push(rows[0]?.papel ?? '');
          });
          return this.real.adquirirTravaGlobal();
        }

        jaFoiExecutado(): Promise<boolean> {
          return this.real.jaFoiExecutado();
        }

        criarInstituicao(id: string, nome: string): Promise<void> {
          return this.real.criarInstituicao(id, nome);
        }

        registrarExecucao(...argumentos: Parameters<PersistenciaDoBootstrap['registrarExecucao']>): Promise<void> {
          return this.real.registrarExecucao(...argumentos);
        }
      })();

      await montarBootstrap(ambiente, { persistencia }).executar(COMANDO_POR_CONVITE);

      expect(papeis).toEqual(['cdd_app']);
      const { rows } = await banco.app.query('select count(*)::int as total from identidade.usuario');
      expect((rows[0] as { total: number }).total).toBe(0);
    });
  });
});
