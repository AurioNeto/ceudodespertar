import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { Controller, Get, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { GrupoId } from '@cdd/contracts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { AppModule } from '../../src/composicao/app.module.js';
import { EnviadorDeConvite } from '../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { ControleDeAcessoNoProvedor } from '../../src/modules/identidade/application/usuarios/controle-de-acesso-no-provedor.js';
import { ControleDeAcessoNoProvedorKeycloak } from '../../src/modules/identidade/infrastructure/keycloak/controle-de-acesso-no-provedor.keycloak.js';
import { EnviadorDeConviteKeycloak } from '../../src/modules/identidade/infrastructure/keycloak/enviador-de-convite.keycloak.js';
import { RepositorioDeUsuario } from '../../src/modules/identidade/domain/usuario/usuario.repo.js';
import { SemeadorDeGruposDeSistema } from '../../src/modules/identidade/public-api.js';
import { ApenasIdentificado, Publico, RequerPermissao } from '../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../src/shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { BancoModule } from '../../src/shared/infrastructure/banco/banco.module.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { Despachante } from '../../src/shared/infrastructure/eventos/despachante.js';
import { ModoDeTransacao } from '../../src/shared/infrastructure/http/modo-de-transacao.decorator.js';
import { AUDIENCIA_DE_TESTE, criarChavesDeTeste, emitirToken } from '../autenticacao/chaves-de-teste.js';
import type { ChavesDeTeste } from '../autenticacao/chaves-de-teste.js';
import { ServidorDeJwks } from '../autenticacao/servidor-de-jwks.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { novoUsuarioAtivo } from '../identidade/acesso/ambiente-http.js';
import { CAMINHO_DOS_USUARIOS, ServidorKeycloakFalso } from '../identidade/keycloak/servidor-keycloak-falso.js';
import { AUTOR, consultarNaInstituicao } from '../identidade/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';

const SUJEITO_DA_MARIA = 'sub-maria-casa-a';
const SUJEITO_SEM_CADASTRO = 'sub-sem-cadastro';
const CABECALHO_DE_IDEMPOTENCIA = 'Idempotency-Key';
const PERMISSAO_DE_ESCRITA = 'financeiro.lancamento.registrar';
const PERMISSAO_DE_LEITURA = 'financeiro.lancamento.ler';
const STATUS_CRIADO = 201;
const CONSUMIDOR_DA_SUSPENSAO = 'InvalidadorDoCacheDeAcesso.aoSuspenderUsuario';

let chamadasDoComandoDeProva = 0;

interface RespostaDoComando {
  readonly chamada: number;
  readonly instituicaoDaTransacao: string;
  readonly instituicaoDoAcesso: string;
}

@Controller('prova')
class RotasDeProvaController {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @RequerPermissao(PERMISSAO_DE_ESCRITA)
  @ModoDeTransacao('escrita')
  @Post('comando')
  async comando(@ContextoAtual() acesso: ContextoDeAcesso): Promise<RespostaDoComando> {
    chamadasDoComandoDeProva += 1;
    return {
      chamada: chamadasDoComandoDeProva,
      instituicaoDaTransacao: await this.instituicaoDaTransacao(),
      instituicaoDoAcesso: acesso.instituicaoId,
    };
  }

  @RequerPermissao(PERMISSAO_DE_LEITURA)
  @Get('protegida')
  protegida(): { ok: true } {
    return { ok: true };
  }

  @Publico()
  @Get('publica')
  publica(): { ok: true } {
    return { ok: true };
  }

  @ApenasIdentificado()
  @Get('instituicao-da-transacao')
  async lerInstituicaoDaTransacao(): Promise<{ instituicaoDaTransacao: string }> {
    return { instituicaoDaTransacao: await this.instituicaoDaTransacao() };
  }

  @ApenasIdentificado()
  @ModoDeTransacao('escrita')
  @Post('gravar-sem-instituicao')
  async gravarSemInstituicao(): Promise<{ ok: true }> {
    await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
      em.execute(
        `insert into identidade.grupo (id, instituicao_id, codigo_sistema, nome, descricao, protegido)
         values (?, ?, null, 'Grupo fora de contexto', 'não deve existir', false)`,
        [randomUUID(), INSTITUICAO_A],
      ),
    );
    return { ok: true };
  }

  private instituicaoDaTransacao(): Promise<string> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ em }) => {
      const [linha] = await em.execute<Array<{ valor: string | null }>>(
        `select current_setting('app.instituicao_id', true) as valor`,
      );
      return linha?.valor ?? '';
    });
  }
}

@Module({ imports: [AppModule, BancoModule], controllers: [RotasDeProvaController] })
class AppComRotasDeProva {}

class ServidorDeJwksEmLocalhost extends ServidorDeJwks {
  override get emissor(): string {
    return super.emissor.replace('127.0.0.1', 'localhost');
  }
}

describe('aplicação real (AppModule) contra o banco', () => {
  let chaves: ChavesDeTeste;
  let servidor: ServidorDeJwksEmLocalhost;
  let keycloak: ServidorKeycloakFalso;
  let urlDoKeycloak: string;
  let banco: BancoDeTeste;
  let app: INestApplication;
  let origem: string;
  let usuario: ReturnType<typeof novoUsuarioAtivo>;

  beforeAll(async () => {
    chaves = await criarChavesDeTeste();
    servidor = new ServidorDeJwksEmLocalhost(chaves.conjunto);
    await servidor.iniciar();
    keycloak = new ServidorKeycloakFalso();
    urlDoKeycloak = (await keycloak.iniciar()).replace('127.0.0.1', 'localhost');
  });

  afterAll(async () => {
    await servidor.derrubar();
    await keycloak.derrubar();
  });

  beforeEach(async () => {
    chamadasDoComandoDeProva = 0;
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    vi.stubEnv('OIDC_EMISSOR', servidor.emissor);
    vi.stubEnv('OIDC_AUDIENCIA', AUDIENCIA_DE_TESTE);
    vi.stubEnv('BANCO_URL', urlDoAppPara(banco));
    vi.stubEnv('BANCO_POOL_MAXIMO', '5');
    vi.stubEnv('LOG_NIVEL', 'fatal');
    vi.stubEnv('KEYCLOAK_URL_BASE', urlDoKeycloak);
    vi.stubEnv('KEYCLOAK_REALM', 'cdd');
    keycloak.requisicoes.length = 0;
    keycloak.definir('PUT', `${CAMINHO_DOS_USUARIOS}/${SUJEITO_DA_MARIA}`, { status: 204 });
    keycloak.definir('POST', `${CAMINHO_DOS_USUARIOS}/${SUJEITO_DA_MARIA}/logout`, { status: 204 });
    app = await criarAplicacao(AppComRotasDeProva);
    await app.listen(0, '127.0.0.1');
    origem = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    await semearMariaNaCasaA();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
    await derrubarBancoDeTeste(banco);
  });

  async function semearMariaNaCasaA(): Promise<void> {
    const semeador = app.get(SemeadorDeGruposDeSistema);
    await semeador.semear(INSTITUICAO_A);
    await semeador.semear(INSTITUICAO_B);
    const [tesouraria] = await consultarNaInstituicao<{ id: string }>(
      banco,
      INSTITUICAO_A,
      `select id from identidade.grupo where codigo_sistema = 'TESOURARIA'`,
    );
    usuario = novoUsuarioAtivo(SUJEITO_DA_MARIA, 'Maria Silva', [tesouraria!.id as GrupoId]);
    await comContexto(INSTITUICAO_A, () => app.get(RepositorioDeUsuario).adicionar(usuario));
    await app.get(Despachante).executarCiclo();
  }

  async function pedir(
    metodo: 'GET' | 'POST',
    caminho: string,
    opcoes: { sujeito?: string; chave?: string } = {},
  ): Promise<Response> {
    const cabecalhos: Record<string, string> = { connection: 'close', 'content-type': 'application/json' };
    if (opcoes.sujeito !== undefined) {
      const token = await emitirToken(chaves, { payload: { iss: servidor.emissor, sub: opcoes.sujeito } });
      cabecalhos.authorization = `Bearer ${token}`;
    }
    if (opcoes.chave !== undefined) cabecalhos[CABECALHO_DE_IDEMPOTENCIA] = opcoes.chave;
    return fetch(`${origem}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      ...(metodo === 'POST' ? { body: '{}' } : {}),
    });
  }

  async function codigoDeErro(resposta: Response): Promise<string> {
    return ((await resposta.json()) as { erro: string }).erro;
  }

  describe('escrita com Idempotency-Key', () => {
    it('abre a transação com a instituição do usuário e entrega o mesmo resultado no replay sem reexecutar o comando', async () => {
      const chave = randomUUID();

      const primeira = await pedir('POST', '/api/v1/prova/comando', { sujeito: SUJEITO_DA_MARIA, chave });
      const replay = await pedir('POST', '/api/v1/prova/comando', { sujeito: SUJEITO_DA_MARIA, chave });

      expect(primeira.status).toBe(STATUS_CRIADO);
      expect(await primeira.json()).toStrictEqual({
        chamada: 1,
        instituicaoDaTransacao: INSTITUICAO_A,
        instituicaoDoAcesso: INSTITUICAO_A,
      });
      expect(replay.status).toBe(STATUS_CRIADO);
      expect(await replay.json()).toStrictEqual({
        chamada: 1,
        instituicaoDaTransacao: INSTITUICAO_A,
        instituicaoDoAcesso: INSTITUICAO_A,
      });
      expect(chamadasDoComandoDeProva).toBe(1);
      const guardadas = await consultarNaInstituicao<{ instituicao_id: string; usuario_id: string }>(
        banco,
        INSTITUICAO_A,
        'select instituicao_id, usuario_id from shared.chave_de_idempotencia where chave = $1',
        [chave],
      );
      expect(guardadas).toStrictEqual([{ instituicao_id: INSTITUICAO_A, usuario_id: usuario.id }]);
    });

    it('sem a chave, a borda abre a transação da instituição e cada chamada executa o comando', async () => {
      const primeira = await pedir('POST', '/api/v1/prova/comando', { sujeito: SUJEITO_DA_MARIA });
      const segunda = await pedir('POST', '/api/v1/prova/comando', { sujeito: SUJEITO_DA_MARIA });

      expect(await primeira.json()).toMatchObject({ chamada: 1, instituicaoDaTransacao: INSTITUICAO_A });
      expect(await segunda.json()).toMatchObject({ chamada: 2, instituicaoDaTransacao: INSTITUICAO_A });
    });
  });

  describe('GET /eu sob a borda transacional', () => {
    it('lê o contexto e grava o último acesso na transação de leitura-que-grava', async () => {
      const resposta = await pedir('GET', '/api/v1/eu', { sujeito: SUJEITO_DA_MARIA });

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toMatchObject({
        usuario: { id: usuario.id },
        instituicao: { id: INSTITUICAO_A, nome: 'Casa A' },
      });
      const [linha] = await consultarNaInstituicao<{ ultimo_acesso_em: Date | null }>(
        banco,
        INSTITUICAO_A,
        'select ultimo_acesso_em from identidade.usuario where id = $1',
        [usuario.id],
      );
      expect(linha?.ultimo_acesso_em).toBeInstanceOf(Date);
    });

    it('T26 · usuário que deixou de estar ativo recebe 401 com o desafio Bearer', async () => {
      await pedir('GET', '/api/v1/prova/protegida', { sujeito: SUJEITO_DA_MARIA });
      await banco.owner.query('begin');
      await banco.owner.query("select set_config('app.instituicao_id', $1, true)", [INSTITUICAO_A]);
      await banco.owner.query("update identidade.usuario set situacao = 'SUSPENSO' where id = $1", [usuario.id]);
      await banco.owner.query('commit');

      const resposta = await pedir('GET', '/api/v1/eu', { sujeito: SUJEITO_DA_MARIA });

      expect(resposta.status).toBe(401);
      expect(resposta.headers.get('www-authenticate')).toBe('Bearer');
      expect(await codigoDeErro(resposta)).toBe('USUARIO_SUSPENSO');
    });
  });

  describe('invalidação do cache de acesso pelo outbox', () => {
    it('suspender o usuário pelo repositório faz a próxima rota protegida recusar sem esperar o TTL', async () => {
      const antes = await pedir('GET', '/api/v1/prova/protegida', { sujeito: SUJEITO_DA_MARIA });
      expect(antes.status).toBe(200);

      await comContexto(INSTITUICAO_A, async () => {
        const repositorio = app.get(RepositorioDeUsuario);
        const carregado = await repositorio.porId(usuario.id);
        const suspensao = carregado!.desativar(AUTOR, 'afastamento', new Date());
        expect(suspensao.tipo).toBe('ok');
        await repositorio.salvar(carregado!);
      });
      await app.get(Despachante).executarCiclo();

      const depois = await pedir('GET', '/api/v1/prova/protegida', { sujeito: SUJEITO_DA_MARIA });
      expect(depois.status).toBe(401);
      expect(await codigoDeErro(depois)).toBe('USUARIO_SUSPENSO');
      const entregues = await banco.owner.query(
        `select o.tipo, o.publicado_em is not null as publicado,
                exists (select 1 from shared.evento_processado p
                         where p.evento_id = o.evento_id and p.consumidor = $2) as consumido
           from shared.outbox o
          where o.agregado_id = $1 and o.tipo = 'USUARIO_SUSPENSO'`,
        [usuario.id, CONSUMIDOR_DA_SUSPENSAO],
      );
      expect(entregues.rows).toStrictEqual([{ tipo: 'USUARIO_SUSPENSO', publicado: true, consumido: true }]);
    });

    it('a suspensão chega ao Keycloak pelo consumidor real: desabilita e depois derruba as sessões', async () => {
      await comContexto(INSTITUICAO_A, async () => {
        const repositorio = app.get(RepositorioDeUsuario);
        const carregado = await repositorio.porId(usuario.id);
        carregado!.desativar(AUTOR, 'afastamento', new Date());
        await repositorio.salvar(carregado!);
      });
      await app.get(Despachante).executarCiclo();

      const caminho = `${CAMINHO_DOS_USUARIOS}/${SUJEITO_DA_MARIA}`;
      expect(
        keycloak.requisicoes.filter(({ caminho: c }) => c.startsWith(caminho)).map(({ metodo, caminho: c }) => `${metodo} ${c}`),
      ).toEqual([`PUT ${caminho}`, `POST ${caminho}/logout`]);
    });
  });

  describe('rotas públicas e requisição sem instituição', () => {
    it.each(['/saude/viva', '/saude/pronta', '/api/v1/prova/publica'])('GET %s sem token responde 200', async (caminho) => {
      const resposta = await pedir('GET', caminho);

      expect(resposta.status).toBe(200);
    });

    it('requisição só identificada abre transação sem instituição (fail-closed)', async () => {
      const resposta = await pedir('GET', '/api/v1/prova/instituicao-da-transacao', { sujeito: SUJEITO_SEM_CADASTRO });

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toStrictEqual({ instituicaoDaTransacao: '' });
    });

    it('requisição só identificada não grava em tabela isolada por instituição', async () => {
      const resposta = await pedir('POST', '/api/v1/prova/gravar-sem-instituicao', { sujeito: SUJEITO_SEM_CADASTRO });

      expect(resposta.status).toBe(500);
      const gravados = await consultarNaInstituicao(
        banco,
        INSTITUICAO_A,
        `select 1 from identidade.grupo where nome = 'Grupo fora de contexto'`,
      );
      expect(gravados).toStrictEqual([]);
    });
  });

  describe('envio de convite', () => {
    it('a composição real entrega os convites pelo adaptador do Keycloak', () => {
      expect(app.get(EnviadorDeConvite)).toBeInstanceOf(EnviadorDeConviteKeycloak);
    });
  });

  describe('suspensão e reativação no provedor', () => {
    it('a composição real aplica o estado do usuário pelo adaptador do Keycloak', () => {
      expect(app.get(ControleDeAcessoNoProvedor)).toBeInstanceOf(ControleDeAcessoNoProvedorKeycloak);
    });
  });
});
