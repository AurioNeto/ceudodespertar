import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import type { UsuarioId } from '@cdd/contracts';
import {
  emailDoFicticio,
  ID_DA_INSTITUICAO_DE_DEMONSTRACAO,
  NOME_DA_INSTITUICAO_DE_DEMONSTRACAO,
  subDoFicticio,
  USERNAME_DO_DEV,
  USUARIOS_FICTICIOS,
} from '../../../src/modules/identidade/application/seed-demo/conteudo-da-demonstracao.js';
import type { ResumoDaSemeadura } from '../../../src/modules/identidade/application/seed-demo/semeadura-de-demonstracao.js';
import { PersistenciaDoBootstrap } from '../../../src/modules/identidade/application/bootstrap/persistencia-do-bootstrap.js';
import { PersistenciaDoBootstrapKysely } from '../../../src/modules/identidade/infrastructure/bootstrap/persistencia-do-bootstrap.kysely.js';
import { PersistenciaDaDemonstracaoKysely } from '../../../src/modules/identidade/infrastructure/seed-demo/persistencia-da-demonstracao.kysely.js';
import { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';
import type { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { CacheDeContextoDeAcesso } from '../../../src/modules/identidade/infrastructure/acesso/cache-de-contexto-de-acesso.js';
import { LeitorDoSujeitoDoUsuarioKysely } from '../../../src/modules/identidade/infrastructure/acesso/leitor-do-sujeito-do-usuario.kysely.js';
import { ResolvedorDeContextoDeAcessoDaIdentidade } from '../../../src/modules/identidade/infrastructure/acesso/resolvedor-de-contexto-de-acesso.da-identidade.js';
import { SincronizadorDoAcessoNoProvedor } from '../../../src/modules/identidade/infrastructure/acesso/sincronizador-do-acesso-no-provedor.js';
import { ClienteAdminDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import { ControleDeAcessoNoProvedorKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/controle-de-acesso-no-provedor.keycloak.js';
import { RelogioDoSistema } from '../../../src/shared/infrastructure/relogio.js';
import { emContextoDaInstituicao } from '../../../src/shared/infrastructure/contexto-da-instituicao.js';
import type { ErroDeDominio } from '../../../src/shared/kernel/erro-de-dominio.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import type { Result } from '../../../src/shared/kernel/result.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { COMANDO_POR_CONVITE, BANCO_VAZIO, contagensDoBanco, montarBootstrap, permitirLeituraSemContextoAoDono } from '../bootstrap/apoio-de-bootstrap.js';
import { abrirAmbienteDaIdentidade, eventosDoOutbox } from '../apoio.js';
import type { AmbienteDaIdentidade } from '../apoio.js';
import { CAMINHO_DOS_USUARIOS, RelogioManual, ServidorKeycloakFalso } from '../keycloak/servidor-keycloak-falso.js';
import {
  fotoDoBanco,
  LocalizadorQueResponde,
  montarSemeadura,
  OUTRO_SUB_DO_DEV,
  PersistenciaDaDemonstracaoComPortao,
  PortaoDeChegada,
  SUB_DO_DEV,
} from './apoio-da-semeadura.js';

const TOTAL_DE_USUARIOS = 1 + USUARIOS_FICTICIOS.length;
const GRUPOS_DE_SISTEMA = 6;
const TOTAL_DE_ATIVADOS = 1 + USUARIOS_FICTICIOS.filter(({ situacao }) => situacao !== 'CONVITE_PENDENTE').length;

class PersistenciaDoBootstrapComPortao extends PersistenciaDoBootstrap {
  constructor(
    private readonly real: PersistenciaDoBootstrap,
    private readonly portao: PortaoDeChegada,
  ) {
    super();
  }

  adquirirTravaGlobal(): Promise<void> {
    return this.real.adquirirTravaGlobal();
  }

  async jaFoiExecutado(): Promise<boolean> {
    const executado = await this.real.jaFoiExecutado();
    await this.portao.passar();
    return executado;
  }

  criarInstituicao(id: string, nome: string): Promise<void> {
    return this.real.criarInstituicao(id, nome);
  }

  registrarExecucao(...argumentos: Parameters<PersistenciaDoBootstrap['registrarExecucao']>): Promise<void> {
    return this.real.registrarExecucao(...argumentos);
  }
}

class RepositorioQueFalhaNaGravacao extends RepositorioDeUsuario {
  private gravacoes = 0;

  constructor(
    private readonly real: RepositorioDeUsuario,
    private readonly falharNaGravacao: number,
  ) {
    super();
  }

  porId(...argumentos: Parameters<RepositorioDeUsuario['porId']>): ReturnType<RepositorioDeUsuario['porId']> {
    return this.real.porId(...argumentos);
  }

  adicionar(usuario: Usuario): Promise<void> {
    this.gravacoes += 1;
    if (this.gravacoes === this.falharNaGravacao) return Promise.reject(new Error('falha ao gravar'));
    return this.real.adicionar(usuario);
  }

  salvar(usuario: Usuario): Promise<number> {
    return this.real.salvar(usuario);
  }
}

function sucessoDe(resultado: Result<ResumoDaSemeadura, ErroDeDominio>): ResumoDaSemeadura {
  if (!ehOk(resultado)) throw new Error(`seed recusado: ${resultado.erro.codigo}`);
  return resultado.valor;
}

function codigoDoErro(resultado: Result<ResumoDaSemeadura, ErroDeDominio>): string | undefined {
  return ehErr(resultado) ? resultado.erro.codigo : undefined;
}

describe('SemeaduraDeDemonstracao com Postgres real', () => {
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

  async function usuarioPorEmail(email: string): Promise<{
    id: string;
    situacao: string;
    subject_id: string | null;
    suspenso_em: Date | null;
    codigo_do_grupo: string;
  }> {
    const [linha] = await consultar<{
      id: string;
      situacao: string;
      subject_id: string | null;
      suspenso_em: Date | null;
      codigo_do_grupo: string;
    }>(
      `select u.id, u.situacao, u.subject_id, u.suspenso_em, g.codigo_sistema as codigo_do_grupo
         from identidade.usuario u
         join identidade.usuario_grupo ug on ug.usuario_id = u.id
         join identidade.grupo g on g.id = ug.grupo_id
        where u.email = $1`,
      [email],
    );
    if (linha === undefined) throw new Error(`usuário ${email} não existe`);
    return linha;
  }

  describe('primeira execução', () => {
    it('cria a instituição de demonstração com id fixo e nome, os 6 grupos de sistema e todos os usuários', async () => {
      const resumo = sucessoDe(await montarSemeadura(ambiente).executar());

      expect(resumo).toEqual({
        instituicaoId: ID_DA_INSTITUICAO_DE_DEMONSTRACAO,
        instituicaoCriada: true,
        usuariosCriados: TOTAL_DE_USUARIOS,
        usuariosJaExistentes: 0,
      });
      expect(await consultar('select id, nome from shared.instituicao')).toEqual([
        { id: ID_DA_INSTITUICAO_DE_DEMONSTRACAO, nome: NOME_DA_INSTITUICAO_DE_DEMONSTRACAO },
      ]);
      expect(await contagensDoBanco(banco)).toMatchObject({
        instituicoes: 1,
        grupos: GRUPOS_DE_SISTEMA,
        usuarios: TOTAL_DE_USUARIOS,
        atribuicoesDeGrupo: TOTAL_DE_USUARIOS,
        marcador: 0,
      });
    });

    it('vincula o dev como ADMINISTRADOR ATIVO com o sub real do provedor', async () => {
      const localizador = new LocalizadorQueResponde();

      await montarSemeadura(ambiente, { localizador }).executar();

      expect(localizador.consultados).toEqual([USERNAME_DO_DEV]);
      expect(await usuarioPorEmail(USERNAME_DO_DEV)).toMatchObject({
        situacao: 'ATIVO',
        subject_id: SUB_DO_DEV,
        codigo_do_grupo: 'ADMINISTRADOR',
      });
    });

    it.each(USUARIOS_FICTICIOS.filter(({ situacao }) => situacao === 'ATIVO'))(
      'usuário fictício $slug: ATIVO com sub demo:, e-mail .invalid e grupo $grupo',
      async ({ slug, grupo }) => {
        await montarSemeadura(ambiente).executar();

        expect(await usuarioPorEmail(emailDoFicticio(slug))).toMatchObject({
          situacao: 'ATIVO',
          subject_id: `demo:${slug}`,
          codigo_do_grupo: grupo,
        });
        expect(emailDoFicticio(slug)).toMatch(/@demo\.cdd\.invalid$/);
      },
    );

    it('convite pendente: sem sub, convite vigente e nenhum envio', async () => {
      await montarSemeadura(ambiente).executar();

      expect(await usuarioPorEmail(emailDoFicticio('convidado'))).toMatchObject({
        situacao: 'CONVITE_PENDENTE',
        subject_id: null,
      });
      const convites = await consultar<{ usado_em: Date | null; revogado_em: Date | null }>(
        `select c.usado_em, c.revogado_em from identidade.convite c
           join identidade.usuario u on u.id = c.usuario_id where u.email = $1`,
        [emailDoFicticio('convidado')],
      );
      expect(convites).toEqual([{ usado_em: null, revogado_em: null }]);
    });

    it('suspenso: SUSPENSO com sub demo: e instante de suspensão', async () => {
      await montarSemeadura(ambiente).executar();

      const suspenso = await usuarioPorEmail(emailDoFicticio('suspenso'));
      expect(suspenso).toMatchObject({ situacao: 'SUSPENSO', subject_id: subDoFicticio('suspenso') });
      expect(suspenso.suspenso_em).toBeInstanceOf(Date);
    });

    it('invariante do agregado: CONVITE_PENDENTE se e somente se subject_id é nulo, em todos os usuários', async () => {
      await montarSemeadura(ambiente).executar();

      const [violacoes] = await consultar<{ total: number }>(
        `select count(*)::int as total from identidade.usuario where (situacao = 'CONVITE_PENDENTE') <> (subject_id is null)`,
      );
      const [pendentes] = await consultar<{ total: number }>(
        `select count(*)::int as total from identidade.usuario where situacao = 'CONVITE_PENDENTE'`,
      );
      expect(violacoes?.total).toBe(0);
      expect(pendentes?.total).toBe(1);
    });

    it('todo usuário que não é o dev tem e-mail .invalid e sub demo:', async () => {
      await montarSemeadura(ambiente).executar();

      const fora = await consultar(
        `select email, subject_id from identidade.usuario
          where email <> $1 and (email not like '%@demo.cdd.invalid' or coalesce(subject_id, 'demo:') not like 'demo:%')`,
        [USERNAME_DO_DEV],
      );
      expect(fora).toEqual([]);
    });

    it('registra os eventos pelo domínio: convidado em todos, ativado nos ativados e suspenso em um só', async () => {
      await montarSemeadura(ambiente).executar();

      const eventos = await consultar<{ tipo: string; total: number }>(
        `select tipo, count(*)::int as total from shared.outbox where agregado_tipo = 'Usuario' group by tipo order by tipo`,
      );
      expect(eventos).toEqual([
        { tipo: 'USUARIO_ATIVADO', total: TOTAL_DE_ATIVADOS },
        { tipo: 'USUARIO_CONVIDADO', total: TOTAL_DE_USUARIOS },
        { tipo: 'USUARIO_SUSPENSO', total: 1 },
      ]);
      const suspenso = await usuarioPorEmail(emailDoFicticio('suspenso'));
      const doSuspenso = await eventosDoOutbox(banco, suspenso.id);
      expect(doSuspenso).toHaveLength(3);
      expect(doSuspenso).toEqual(expect.arrayContaining(['USUARIO_CONVIDADO', 'USUARIO_ATIVADO', 'USUARIO_SUSPENSO']));
    });
  });

  describe('login do dev', () => {
    function resolvedor(): ResolvedorDeContextoDeAcessoDaIdentidade {
      return new ResolvedorDeContextoDeAcessoDaIdentidade(
        ambiente.unidadeDeTrabalho,
        new CacheDeContextoDeAcesso(new RelogioDoSistema()),
      );
    }

    it('o sub do dev resolve contexto com sistema.usuario.gerenciar na instituição de demonstração', async () => {
      await montarSemeadura(ambiente).executar();

      const contexto = await resolvedor().resolver({ sub: SUB_DO_DEV, expiraEm: 0 });

      expect(contexto.recusada).toBe(false);
      if (contexto.recusada) return;
      expect(contexto.instituicaoId).toBe(ID_DA_INSTITUICAO_DE_DEMONSTRACAO);
      expect(contexto.permissoes.has('sistema.usuario.gerenciar')).toBe(true);
    });

    it('fictício ATIVO resolve só as permissões do próprio grupo; suspenso é recusado; sub inexistente é desconhecido', async () => {
      await montarSemeadura(ambiente).executar();

      const tesouraria = await resolvedor().resolver({ sub: subDoFicticio('tesouraria'), expiraEm: 0 });
      const suspenso = await resolvedor().resolver({ sub: subDoFicticio('suspenso'), expiraEm: 0 });
      const desconhecido = await resolvedor().resolver({ sub: subDoFicticio('convidado'), expiraEm: 0 });

      expect(tesouraria.recusada).toBe(false);
      if (!tesouraria.recusada) {
        expect(tesouraria.permissoes.has('financeiro.lancamento.registrar')).toBe(true);
        expect(tesouraria.permissoes.has('sistema.usuario.gerenciar')).toBe(false);
      }
      expect(suspenso).toEqual({ recusada: true, codigo: 'USUARIO_SUSPENSO' });
      expect(desconhecido).toEqual({ recusada: true, codigo: 'USUARIO_DESCONHECIDO' });
    });
  });

  describe('idempotência', () => {
    it('reexecução não duplica nem altera nada, byte a byte', async () => {
      await montarSemeadura(ambiente).executar();
      const antes = await fotoDoBanco(banco);

      const segunda = sucessoDe(await montarSemeadura(ambiente).executar());

      expect(segunda).toEqual({
        instituicaoId: ID_DA_INSTITUICAO_DE_DEMONSTRACAO,
        instituicaoCriada: false,
        usuariosCriados: 0,
        usuariosJaExistentes: TOTAL_DE_USUARIOS,
      });
      expect(await fotoDoBanco(banco)).toEqual(antes);
    });

    it('completa apenas o que falta quando um usuário fictício foi removido', async () => {
      await montarSemeadura(ambiente).executar();
      const leitura = await usuarioPorEmail(emailDoFicticio('leitura'));
      await banco.owner.query('delete from identidade.convite where usuario_id = $1', [leitura.id]);
      await banco.owner.query('delete from identidade.usuario_grupo where usuario_id = $1', [leitura.id]);
      await banco.owner.query('delete from identidade.usuario where id = $1', [leitura.id]);

      const resumo = sucessoDe(await montarSemeadura(ambiente).executar());

      expect(resumo).toMatchObject({ usuariosCriados: 1, usuariosJaExistentes: TOTAL_DE_USUARIOS - 1 });
      expect(await contagensDoBanco(banco)).toMatchObject({ usuarios: TOTAL_DE_USUARIOS });
      const dev = await usuarioPorEmail(USERNAME_DO_DEV);
      const recriado = await usuarioPorEmail(emailDoFicticio('leitura'));
      const [convite] = await consultar<{ criado_por: string }>('select criado_por from identidade.convite where usuario_id = $1', [recriado.id]);
      expect(convite?.criado_por).toBe(dev.id);
    });
  });

  describe('guarda de dados', () => {
    it('seed e bootstrap concorrentes: a trava global deixa uma só instituição no banco', async () => {
      const portao = new PortaoDeChegada();
      const demonstracao = new PersistenciaDaDemonstracaoComPortao(new PersistenciaDaDemonstracaoKysely(ambiente.unidadeDeTrabalho), portao);
      const persistencia = new PersistenciaDoBootstrapComPortao(new PersistenciaDoBootstrapKysely(ambiente.unidadeDeTrabalho), portao);

      const resultados = await Promise.all([
        montarSemeadura(ambiente, { demonstracao }).executar(),
        montarBootstrap(ambiente, { persistencia }).executar(COMANDO_POR_CONVITE),
      ]);

      expect(resultados.filter(({ tipo }) => tipo === 'ok')).toHaveLength(1);
      expect((await contagensDoBanco(banco)).instituicoes).toBe(1);
    });

    it('recusa quando existe instituição que não é a de demonstração (depois de um bootstrap) e não grava nada', async () => {
      sucessoDeBootstrap(await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE));
      const antes = await fotoDoBanco(banco);

      const resultado = await montarSemeadura(ambiente).executar();

      expect(codigoDoErro(resultado)).toBe('INSTITUICAO_NAO_DEMO_EXISTENTE');
      expect(await fotoDoBanco(banco)).toEqual(antes);
    });

    it('decide pelo id, não pelo nome: instituição com o nome da demonstração e outro id também recusa', async () => {
      await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2)', [
        'c0000000-0000-0000-0000-000000000000',
        NOME_DA_INSTITUICAO_DE_DEMONSTRACAO,
      ]);

      const resultado = await montarSemeadura(ambiente).executar();

      expect(codigoDoErro(resultado)).toBe('INSTITUICAO_NAO_DEMO_EXISTENTE');
      expect(await contagensDoBanco(banco)).toMatchObject({ instituicoes: 1, usuarios: 0, grupos: 0 });
    });

    it('instituição de demonstração com outro nome não é recusada: o id é a identidade', async () => {
      await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2)', [
        ID_DA_INSTITUICAO_DE_DEMONSTRACAO,
        'Nome antigo',
      ]);

      const resumo = sucessoDe(await montarSemeadura(ambiente).executar());

      expect(resumo.instituicaoCriada).toBe(false);
      expect(await contagensDoBanco(banco)).toMatchObject({ instituicoes: 1, usuarios: TOTAL_DE_USUARIOS });
    });

    it('depois da demonstração, o bootstrap é recusado: o banco já tem instituição', async () => {
      await montarSemeadura(ambiente).executar();

      const resultado = await montarBootstrap(ambiente).executar(COMANDO_POR_CONVITE);

      expect(codigoDoErro(resultado as Result<never, ErroDeDominio>)).toBe('BOOTSTRAP_JA_EXECUTADO');
    });
  });

  describe('dev e provedor', () => {
    it('sub do dev divergente do gravado aborta, não altera nada e mantém o sub antigo', async () => {
      await montarSemeadura(ambiente).executar();
      const antes = await fotoDoBanco(banco);
      const localizador = new LocalizadorQueResponde();
      localizador.sub = OUTRO_SUB_DO_DEV;

      const resultado = await montarSemeadura(ambiente, { localizador }).executar();

      expect(codigoDoErro(resultado)).toBe('SUJEITO_DO_DEV_DIVERGENTE');
      expect(await fotoDoBanco(banco)).toEqual(antes);
      expect((await usuarioPorEmail(USERNAME_DO_DEV)).subject_id).toBe(SUB_DO_DEV);
    });

    it('dev ausente no provedor: erro claro e banco intacto', async () => {
      const localizador = new LocalizadorQueResponde();
      localizador.sub = undefined;

      const resultado = await montarSemeadura(ambiente, { localizador }).executar();

      expect(codigoDoErro(resultado)).toBe('DEV_NAO_ENCONTRADO_NO_PROVEDOR');
      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });

    it('provedor indisponível: erro de infraestrutura e banco intacto', async () => {
      const localizador = new LocalizadorQueResponde();
      localizador.indisponivel = true;

      const resultado = await montarSemeadura(ambiente, { localizador }).executar();

      expect(codigoDoErro(resultado)).toBe('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL');
      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });
  });

  describe('atomicidade', () => {
    it.each([1, 2, TOTAL_DE_USUARIOS])('falha na gravação %i desfaz instituição, grupos, usuários, eventos e auditoria', async (falhaNa) => {
      const usuarios = new RepositorioQueFalhaNaGravacao(ambiente.usuarios, falhaNa);

      await expect(montarSemeadura(ambiente, { usuarios }).executar()).rejects.toThrow('falha ao gravar');

      expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
    });
  });

  describe('convergência do usuário suspenso no provedor', () => {
    let keycloak: ServidorKeycloakFalso;
    let sincronizador: SincronizadorDoAcessoNoProvedor;
    const CAMINHO_DO_SUSPENSO = `${CAMINHO_DOS_USUARIOS}/${encodeURIComponent(subDoFicticio('suspenso'))}`;

    beforeEach(async () => {
      keycloak = new ServidorKeycloakFalso();
      const urlBase = await keycloak.iniciar();
      const cliente = new ClienteAdminDoKeycloak(
        {
          urlBase,
          realm: 'cdd',
          clientId: 'cdd-api-admin',
          segredo: 'segredo-de-teste',
          timeoutPorChamadaEmMs: 500,
          orcamentoDaOperacaoEmMs: 2_000,
        },
        new RelogioManual(),
      );
      sincronizador = new SincronizadorDoAcessoNoProvedor(
        new LeitorDoSujeitoDoUsuarioKysely(ambiente.unidadeDeTrabalho),
        new ControleDeAcessoNoProvedorKeycloak(cliente),
      );
      await montarSemeadura(ambiente).executar();
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await keycloak.derrubar();
    });

    async function sincronizarSuspensaoDoSuspenso(): Promise<void> {
      const { id } = await usuarioPorEmail(emailDoFicticio('suspenso'));
      await emContextoDaInstituicao(ID_DA_INSTITUICAO_DE_DEMONSTRACAO, () =>
        sincronizador.aoSuspenderUsuario({
          eventoId: 'evento-de-teste',
          tipo: 'USUARIO_SUSPENSO',
          ocorridoEm: new Date(),
          agregadoTipo: 'Usuario',
          agregadoId: id as UsuarioId,
          dados: {},
        }),
      );
    }

    it('o sub demo: não existe no provedor (404) e a suspensão converge sem erro, sem tentar derrubar sessão', async () => {
      keycloak.definir('PUT', CAMINHO_DO_SUSPENSO, { status: 404 });
      const aviso = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await expect(sincronizarSuspensaoDoSuspenso()).resolves.toBeUndefined();

      expect(aviso).toHaveBeenCalledTimes(1);

      expect(keycloak.chamadasA('PUT', CAMINHO_DO_SUSPENSO)).toHaveLength(1);
      expect(keycloak.chamadasA('POST', `${CAMINHO_DO_SUSPENSO}/logout`)).toHaveLength(0);
    });

    it('contraprova: falha do provedor que não é 404 continua rejeitando, para o despachante repetir', async () => {
      keycloak.definir('PUT', CAMINHO_DO_SUSPENSO, { status: 503 });

      await expect(sincronizarSuspensaoDoSuspenso()).rejects.toThrow();
    });
  });
});

function sucessoDeBootstrap(resultado: { tipo: string }): void {
  if (resultado.tipo !== 'ok') throw new Error('bootstrap recusado');
}
