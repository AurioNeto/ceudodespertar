import type { Eu, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistradorDeUltimoAcesso } from '../../../src/modules/identidade/application/registrador-de-ultimo-acesso.js';
import { CacheDeContextoDeAcesso, TTL_DO_CACHE_DE_ACESSO_EM_MS } from '../../../src/modules/identidade/infrastructure/acesso/cache-de-contexto-de-acesso.js';
import { UnidadeDeTrabalho } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { AGORA } from '../apoio.js';
import {
  novoGrupoNomeado,
  novoUsuarioAtivo,
  PERMISSAO_EXIGIDA_PELA_ROTA,
  ROTA_PROTEGIDA_POR_PERMISSAO,
  semear,
  subirAplicacaoDeAcesso,
} from './ambiente-http.js';
import type { AplicacaoDeAcesso } from './ambiente-http.js';

const SUJEITO_DE_A = 'sub-maria-casa-a';
const SUJEITO_DE_B = 'sub-joao-casa-b';
const UMA_HORA_EM_MS = 3_600_000;

async function executarNaInstituicao(
  banco: BancoDeTeste,
  instituicaoId: string,
  comando: string,
  parametros: readonly unknown[] = [],
): Promise<Record<string, unknown>[]> {
  await banco.owner.query('begin');
  try {
    await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
    const resultado = await banco.owner.query(comando, [...parametros]);
    await banco.owner.query('commit');
    return resultado.rows as Record<string, unknown>[];
  } catch (erro) {
    await banco.owner.query('rollback');
    throw erro;
  }
}

describe('contexto de acesso e GET /api/v1/eu (etapa B0)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function subir(): Promise<void> {
    aplicacao = await subirAplicacaoDeAcesso(banco);
  }

  async function semearMariaNaCasaA(permissoes = [PERMISSAO_EXIGIDA_PELA_ROTA]) {
    const grupo = novoGrupoNomeado('Tesouraria', permissoes);
    const usuario = novoUsuarioAtivo(SUJEITO_DE_A, 'Maria Silva', [grupo.id]);
    await semear(aplicacao, INSTITUICAO_A, [grupo], usuario);
    return { grupo, usuario };
  }

  async function situacaoNoBanco(usuarioId: UsuarioId, instituicaoId = INSTITUICAO_A) {
    const [linha] = await executarNaInstituicao(
      banco,
      instituicaoId,
      'select situacao, versao, ultimo_acesso_em from identidade.usuario where id = $1',
      [usuarioId],
    );
    return linha as { situacao: string; versao: number; ultimo_acesso_em: Date | null };
  }

  async function lerCodigoDeErro(resposta: Response): Promise<string> {
    return ((await resposta.json()) as { erro: string }).erro;
  }

  describe('GET /eu', () => {
    it('usuário ativo recebe exatamente o contrato Eu: grupos ativos e permissões únicas e ordenadas', async () => {
      await subir();
      const tesouraria = novoGrupoNomeado('Tesouraria', ['financeiro.lancamento.ler', 'financeiro.conta.ler']);
      const secretaria = novoGrupoNomeado('Secretaria', ['financeiro.lancamento.ler']);
      const extinto = novoGrupoNomeado('Extinto', ['financeiro.dre.ler']);
      const usuario = novoUsuarioAtivo(SUJEITO_DE_A, 'Maria Silva', [tesouraria.id, secretaria.id, extinto.id]);
      await semear(aplicacao, INSTITUICAO_A, [tesouraria, secretaria, extinto], usuario);
      await executarNaInstituicao(banco, INSTITUICAO_A, 'update identidade.grupo set ativo = false where id = $1', [
        extinto.id,
      ]);

      const resposta = await aplicacao.pedirComo(SUJEITO_DE_A);

      expect(resposta.status).toBe(200);
      const esperado: Eu = {
        usuario: { id: usuario.id, nome: 'Maria Silva', email: usuario.email },
        instituicao: { id: INSTITUICAO_A as Eu['instituicao']['id'], nome: 'Casa A' },
        grupos: [
          { id: secretaria.id, nome: 'Secretaria' },
          { id: tesouraria.id, nome: 'Tesouraria' },
        ],
        permissoes: ['financeiro.conta.ler', 'financeiro.lancamento.ler'] as Eu['permissoes'],
      };
      expect(await resposta.json()).toEqual(esperado);
    });

    it('usuário ativo sem grupos recebe grupos e permissões vazios', async () => {
      await subir();
      await semear(aplicacao, INSTITUICAO_A, [], novoUsuarioAtivo(SUJEITO_DE_A, 'Maria Silva', []));

      const resposta = await aplicacao.pedirComo(SUJEITO_DE_A);

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toMatchObject({ grupos: [], permissoes: [] });
    });

    it('sujeito desconhecido responde 401 USUARIO_DESCONHECIDO', async () => {
      await subir();

      const resposta = await aplicacao.pedirComo('sub-que-ninguem-tem');

      expect(resposta.status).toBe(401);
      expect(await lerCodigoDeErro(resposta)).toBe('USUARIO_DESCONHECIDO');
    });

    it.each([
      ['CONVITE_PENDENTE', 'USUARIO_CONVITE_PENDENTE'],
      ['SUSPENSO', 'USUARIO_SUSPENSO'],
      ['REVOGADO', 'USUARIO_REVOGADO'],
    ])('situação %s responde 401 %s', async (situacao, codigo) => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      await executarNaInstituicao(banco, INSTITUICAO_A, 'update identidade.usuario set situacao = $2 where id = $1', [
        usuario.id,
        situacao,
      ]);

      const resposta = await aplicacao.pedirComo(SUJEITO_DE_A);

      expect(resposta.status).toBe(401);
      expect(await lerCodigoDeErro(resposta)).toBe(codigo);
    });

    it('suspenso por SQL, sem evento, dentro do TTL: /eu recusa 401 USUARIO_SUSPENSO, esquece o cache e a próxima rota protegida também recusa', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
      await executarNaInstituicao(banco, INSTITUICAO_A, "update identidade.usuario set situacao = 'SUSPENSO' where id = $1", [
        usuario.id,
      ]);
      aplicacao.relogio.avancarEmMs(TTL_DO_CACHE_DE_ACESSO_EM_MS - 1);
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);

      const noEu = await aplicacao.pedirComo(SUJEITO_DE_A);
      const naProximaRota = await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO);

      expect(noEu.status).toBe(401);
      expect(await lerCodigoDeErro(noEu)).toBe('USUARIO_SUSPENSO');
      expect(naProximaRota.status).toBe(401);
      expect(await lerCodigoDeErro(naProximaRota)).toBe('USUARIO_SUSPENSO');
    });

    it('cada usuário vê só a própria instituição, os próprios grupos e as próprias permissões', async () => {
      await subir();
      await semearMariaNaCasaA();
      const grupoDeB = novoGrupoNomeado('Tesouraria', []);
      const joao = novoUsuarioAtivo(SUJEITO_DE_B, 'João Souza', [grupoDeB.id]);
      await semear(aplicacao, INSTITUICAO_B, [grupoDeB], joao);

      const deA = (await (await aplicacao.pedirComo(SUJEITO_DE_A)).json()) as Eu;
      const deB = (await (await aplicacao.pedirComo(SUJEITO_DE_B)).json()) as Eu;

      expect(deA.instituicao.nome).toBe('Casa A');
      expect(deA.usuario.nome).toBe('Maria Silva');
      expect(deA.permissoes).toEqual([PERMISSAO_EXIGIDA_PELA_ROTA]);
      expect(deB.instituicao.nome).toBe('Casa B');
      expect(deB.usuario.nome).toBe('João Souza');
      expect(deB.grupos).toEqual([{ id: grupoDeB.id, nome: 'Tesouraria' }]);
      expect(deB.permissoes).toEqual([]);
    });
  });

  describe('rota com @RequerPermissao', () => {
    it('responde 403 SEM_PERMISSAO sem a permissão e 200 com ela', async () => {
      await subir();
      await semearMariaNaCasaA();
      const grupoSemPermissao = novoGrupoNomeado('Visitantes', []);
      await semear(aplicacao, INSTITUICAO_B, [grupoSemPermissao], novoUsuarioAtivo(SUJEITO_DE_B, 'João', [grupoSemPermissao.id]));

      const comPermissao = await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO);
      const semPermissao = await aplicacao.pedirComo(SUJEITO_DE_B, ROTA_PROTEGIDA_POR_PERMISSAO);

      expect(comPermissao.status).toBe(200);
      expect(semPermissao.status).toBe(403);
      expect(await lerCodigoDeErro(semPermissao)).toBe('SEM_PERMISSAO');
    });
  });

  describe('cache e invalidação por evento', () => {
    it('dentro do TTL não relê o banco; no vencimento do TTL relê', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
      await executarNaInstituicao(banco, INSTITUICAO_A, "update identidade.usuario set situacao = 'SUSPENSO' where id = $1", [
        usuario.id,
      ]);

      aplicacao.relogio.avancarEmMs(TTL_DO_CACHE_DE_ACESSO_EM_MS - 1);
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);

      aplicacao.relogio.avancarEmMs(1);
      const aposOTtl = await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO);
      expect(aposOTtl.status).toBe(401);
      expect(await lerCodigoDeErro(aposOTtl)).toBe('USUARIO_SUSPENSO');
    });

    it('suspender pelo repositório e consumir o evento faz o próximo acesso responder 401', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      expect((await aplicacao.pedirComo(SUJEITO_DE_A)).status).toBe(200);

      const carregado = await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.porId(usuario.id));
      carregado!.desativar(usuario.id, 'desligamento', AGORA);
      await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.salvar(carregado!));
      await aplicacao.entregarEventos();

      const resposta = await aplicacao.pedirComo(SUJEITO_DE_A);
      expect(resposta.status).toBe(401);
      expect(await lerCodigoDeErro(resposta)).toBe('USUARIO_SUSPENSO');
    });

    it('reativar pelo repositório e consumir o evento devolve o acesso', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      const carregado = await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.porId(usuario.id));
      carregado!.desativar(usuario.id, 'licença', AGORA);
      await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.salvar(carregado!));
      await aplicacao.entregarEventos();
      expect((await aplicacao.pedirComo(SUJEITO_DE_A)).status).toBe(401);

      const suspenso = await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.porId(usuario.id));
      suspenso!.reativar(usuario.id, 'retorno', AGORA);
      await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.salvar(suspenso!));
      await aplicacao.entregarEventos();

      expect((await aplicacao.pedirComo(SUJEITO_DE_A)).status).toBe(200);
    });

    it('mudar os grupos do usuário e consumir GRUPO_ALTERADO remove a permissão no próximo acesso', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);

      const carregado = await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.porId(usuario.id));
      carregado!.definirGrupos([], usuario.id, AGORA);
      await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.salvar(carregado!));
      await aplicacao.entregarEventos();

      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(403);
    });

    it('mudar os grupos de um usuário e consumir GRUPO_ALTERADO não invalida outro usuário, nem da mesma instituição', async () => {
      await subir();
      const { grupo, usuario: maria } = await semearMariaNaCasaA();
      const joao = novoUsuarioAtivo(SUJEITO_DE_B, 'João', [grupo.id]);
      await semear(aplicacao, INSTITUICAO_A, [], joao);
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
      expect((await aplicacao.pedirComo(SUJEITO_DE_B, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
      await executarNaInstituicao(banco, INSTITUICAO_A, 'delete from identidade.usuario_grupo where usuario_id = $1', [
        joao.id,
      ]);

      const carregado = await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.porId(maria.id));
      carregado!.definirGrupos([], maria.id, AGORA);
      await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.salvar(carregado!));
      await aplicacao.entregarEventos();

      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(403);
      expect((await aplicacao.pedirComo(SUJEITO_DE_B, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
    });

    it('uma leitura que atravessa uma invalidação não guarda o resultado velho no cache', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      const unidade = aplicacao.app.get(UnidadeDeTrabalho);
      const cache = aplicacao.app.get(CacheDeContextoDeAcesso);
      const transacaoOriginal = unidade.transacao.bind(unidade);
      let primeiraChamada = true;
      vi.spyOn(unidade, 'transacao').mockImplementation(async (modo, fn) => {
        const resultado = await transacaoOriginal(modo, fn);
        if (primeiraChamada) {
          primeiraChamada = false;
          cache.invalidarUsuario(usuario.id);
        }
        return resultado;
      });
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
      vi.restoreAllMocks();
      await executarNaInstituicao(banco, INSTITUICAO_A, "update identidade.usuario set situacao = 'SUSPENSO' where id = $1", [
        usuario.id,
      ]);

      const seguinte = await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO);

      expect(seguinte.status).toBe(401);
    });

    it('editar o grupo e consumir GRUPO_EDITADO invalida os usuários da instituição, e só dela', async () => {
      await subir();
      const { grupo } = await semearMariaNaCasaA();
      const grupoDeB = novoGrupoNomeado('Tesouraria', [PERMISSAO_EXIGIDA_PELA_ROTA]);
      await semear(aplicacao, INSTITUICAO_B, [grupoDeB], novoUsuarioAtivo(SUJEITO_DE_B, 'João', [grupoDeB.id]));
      await aplicacao.entregarEventos();
      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
      expect((await aplicacao.pedirComo(SUJEITO_DE_B, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
      await executarNaInstituicao(banco, INSTITUICAO_B, 'delete from identidade.grupo_permissao where grupo_id = $1', [
        grupoDeB.id,
      ]);

      const carregado = await comContexto(INSTITUICAO_A, () => aplicacao.grupos.porId(grupo.id));
      carregado!.revogarPermissao(PERMISSAO_EXIGIDA_PELA_ROTA, '00000000-0000-0000-0000-000000000001' as UsuarioId, AGORA);
      await comContexto(INSTITUICAO_A, () => aplicacao.grupos.salvar(carregado!));
      await aplicacao.entregarEventos();

      expect((await aplicacao.pedirComo(SUJEITO_DE_A, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(403);
      expect((await aplicacao.pedirComo(SUJEITO_DE_B, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);
    });
  });

  describe('ultimoAcessoEm', () => {
    it('grava no primeiro acesso, não regrava dentro de uma hora e regrava depois dela, sem mexer na versão', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      const primeiro = aplicacao.relogio.agora();

      await aplicacao.pedirComo(SUJEITO_DE_A);
      const aposOPrimeiro = await situacaoNoBanco(usuario.id);
      expect(aposOPrimeiro.ultimo_acesso_em?.toISOString()).toBe(primeiro.toISOString());

      aplicacao.relogio.avancarEmMs(UMA_HORA_EM_MS - 1);
      await aplicacao.pedirComo(SUJEITO_DE_A);
      expect((await situacaoNoBanco(usuario.id)).ultimo_acesso_em?.toISOString()).toBe(primeiro.toISOString());

      aplicacao.relogio.avancarEmMs(1);
      await aplicacao.pedirComo(SUJEITO_DE_A);
      expect((await situacaoNoBanco(usuario.id)).ultimo_acesso_em?.toISOString()).toBe(primeiro.toISOString());

      aplicacao.relogio.avancarEmMs(1);
      await aplicacao.pedirComo(SUJEITO_DE_A);
      const aposAHora = await situacaoNoBanco(usuario.id);
      expect(aposAHora.ultimo_acesso_em?.toISOString()).toBe(aplicacao.relogio.agora().toISOString());
      expect(aposAHora.versao).toBe(aposOPrimeiro.versao);
    });

    it('um comando concorrente que carregou o usuário antes do acesso não toma conflito de versão', async () => {
      await subir();
      const { usuario } = await semearMariaNaCasaA();
      const carregado = await comContexto(INSTITUICAO_A, () => aplicacao.usuarios.porId(usuario.id));

      expect((await aplicacao.pedirComo(SUJEITO_DE_A)).status).toBe(200);
      carregado!.definirGrupos([], usuario.id, AGORA);

      await expect(comContexto(INSTITUICAO_A, () => aplicacao.usuarios.salvar(carregado!))).resolves.toBeUndefined();
    });

    it('falha ao gravar o último acesso não derruba o GET /eu', async () => {
      aplicacao = await subirAplicacaoDeAcesso(banco, [
        {
          provider: RegistradorDeUltimoAcesso,
          valor: { registrar: () => Promise.reject(new Error('banco fora do ar')) },
        },
      ]);
      await semearMariaNaCasaA();

      const resposta = await aplicacao.pedirComo(SUJEITO_DE_A);

      expect(resposta.status).toBe(200);
    });
  });
});
