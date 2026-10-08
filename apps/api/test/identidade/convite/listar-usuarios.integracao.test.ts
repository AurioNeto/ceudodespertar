import type { UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoGrupoNomeado, novoUsuarioAtivo, subirAplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import {
  contarTrilha,
  escrever,
  ROTA_USUARIOS,
  semearUsuarios,
} from '../gestao-de-usuarios/apoio-http.js';
import { desativarGrupo, semearGruposDeSistema } from './apoio-de-convite.js';

const ADMIN = 'sub-admin';
const SEM_PERMISSAO = 'sub-sem-permissao';
const ADMIN_DE_B = 'sub-admin-de-b';
const TOTAL_DE_USUARIOS_EM_MASSA = 55;

interface ItemListado {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly situacao: string;
  readonly grupos: ReadonlyArray<{ id: string; nome: string }>;
  readonly versao: number;
  readonly ultimoAcessoEm: string | null;
}

interface PaginaListada {
  readonly itens: ItemListado[];
  readonly proxima: string | null;
}

describe('listagem de usuários pela API (Doc 3 §11, Doc 7 §25)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    aplicacao = await subirAplicacaoDeAcesso(banco);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function semearCasa(nomes: readonly string[] = []) {
    await semearGruposDeSistema(aplicacao, INSTITUICAO_A);
    const gestao = novoGrupoNomeado('Gestão da casa', ['sistema.usuario.gerenciar']);
    const mutirao = novoGrupoNomeado('Mutirão', ['financeiro.lancamento.ler']);
    const admin = novoUsuarioAtivo(ADMIN, 'Administrador', [gestao.id]);
    const semPermissao = novoUsuarioAtivo(SEM_PERMISSAO, 'Sem Permissão', [mutirao.id]);
    const demais = nomes.map((nome, indice) => novoUsuarioAtivo(`sub-${indice}`, nome, [mutirao.id]));
    await semearUsuarios(aplicacao, INSTITUICAO_A, [gestao, mutirao], [admin, semPermissao, ...demais]);
    return { gestao, mutirao, admin, semPermissao, demais };
  }

  async function semearCasaDeB() {
    await semearGruposDeSistema(aplicacao, INSTITUICAO_B);
    const grupo = novoGrupoNomeado('Gestão de B', ['sistema.usuario.gerenciar']);
    const adminDeB = novoUsuarioAtivo(ADMIN_DE_B, 'Pessoa de B', [grupo.id]);
    await semearUsuarios(aplicacao, INSTITUICAO_B, [grupo], [adminDeB]);
    return { grupo, adminDeB };
  }

  async function listar(consulta: Record<string, string | number> = {}, sujeito = ADMIN) {
    const parametros = new URLSearchParams(Object.entries(consulta).map(([chave, valor]): [string, string] => [chave, String(valor)]));
    const resposta = await aplicacao.pedirComo(sujeito, `${ROTA_USUARIOS}?${parametros.toString()}`);
    return { status: resposta.status, corpo: (await resposta.json()) as PaginaListada & { erro?: string } };
  }

  async function percorrerTudo(consulta: Record<string, string | number>): Promise<ItemListado[]> {
    const itens: ItemListado[] = [];
    let depois: string | null = null;
    do {
      // eslint-disable-next-line no-await-in-loop -- cada página depende do cursor da anterior
      const { corpo } = await listar(depois === null ? consulta : { ...consulta, depois });
      itens.push(...corpo.itens);
      depois = corpo.proxima;
    } while (depois !== null);
    return itens;
  }

  async function semearEmMassa(total: number): Promise<void> {
    await banco.owner.query('begin');
    try {
      await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, INSTITUICAO_A]);
      await banco.owner.query(
        `insert into identidade.usuario (id, instituicao_id, nome, email, situacao)
         select gen_random_uuid(), $1, 'Massa ' || lpad(i::text, 3, '0'), 'massa' || i || '@casa.org', 'ATIVO'
           from generate_series(1, $2::int) as i`,
        [INSTITUICAO_A, total],
      );
      await banco.owner.query('commit');
    } catch (erro) {
      await banco.owner.query('rollback');
      throw erro;
    }
  }

  describe('itens', () => {
    it('traz id, nome, e-mail, situação, grupos com id e nome, versão e ultimoAcessoEm', async () => {
      const { gestao, admin } = await semearCasa();
      await banco.owner.query('begin');
      await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, INSTITUICAO_A]);
      await banco.owner.query(`update identidade.usuario set ultimo_acesso_em = '2026-03-05T10:15:30.123Z' where id = $1`, [admin.id]);
      await banco.owner.query('commit');

      const { status, corpo } = await listar({ busca: 'Administrador' });

      expect(status).toBe(200);
      expect(corpo.itens).toEqual([
        {
          id: admin.id,
          nome: 'Administrador',
          email: admin.email,
          situacao: 'ATIVO',
          grupos: [{ id: gestao.id, nome: 'Gestão da casa' }],
          versao: 1,
          ultimoAcessoEm: '2026-03-05T10:15:30.123Z',
        },
      ]);
      expect(corpo.proxima).toBeNull();
    });

    it('ultimoAcessoEm é nulo para quem nunca acessou e usuário sem grupo traz lista vazia', async () => {
      await semearCasa(['Sem Grupo']);
      await banco.owner.query('begin');
      await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, INSTITUICAO_A]);
      await banco.owner.query(`delete from identidade.usuario_grupo where usuario_id = (select id from identidade.usuario where nome = 'Sem Grupo')`);
      await banco.owner.query('commit');

      const { corpo } = await listar({ busca: 'Sem Grupo' });

      expect(corpo.itens).toMatchObject([{ nome: 'Sem Grupo', grupos: [], ultimoAcessoEm: null }]);
    });

    it('oculta grupo desativado dos grupos do item e mantém o ativo', async () => {
      const { gestao, mutirao, admin } = await semearCasa();
      await banco.owner.query('begin');
      await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, INSTITUICAO_A]);
      await banco.owner.query(
        'insert into identidade.usuario_grupo (usuario_id, grupo_id, instituicao_id, atribuido_por) values ($1, $2, $3, $1)',
        [admin.id, mutirao.id, INSTITUICAO_A],
      );
      await banco.owner.query('commit');
      await desativarGrupo(banco, INSTITUICAO_A, mutirao.id);

      const { corpo } = await listar({ busca: 'Administrador' });

      expect(corpo.itens).toMatchObject([{ id: admin.id, grupos: [{ id: gestao.id, nome: 'Gestão da casa' }] }]);
    });

    it('listar não grava trilha de consulta', async () => {
      await semearCasa();
      const antes = await contarTrilha(banco, INSTITUICAO_A);

      await listar();

      expect(await contarTrilha(banco, INSTITUICAO_A)).toBe(antes);
    });
  });

  describe('paginação', () => {
    it('ordena por nome sem diferenciar maiúsculas e minúsculas, com o id desempatando', async () => {
      await semearCasa(['beto', 'Carlos', 'ana', 'Ana']);

      const itens = await percorrerTudo({});

      expect(itens.map(({ nome }) => nome.toLowerCase())).toEqual([
        'administrador',
        'ana',
        'ana',
        'beto',
        'carlos',
        'sem permissão',
      ]);
      const [primeiraAna, segundaAna] = itens.filter(({ nome }) => nome.toLowerCase() === 'ana');
      expect(primeiraAna!.id < segundaAna!.id).toBe(true);
    });

    it('com limite 2 percorre todos sem repetir nem pular, e a última página não tem próxima', async () => {
      await semearCasa(['Beto', 'Carlos', 'Ana', 'Dora']);

      const primeira = await listar({ limite: 2 });
      const itens = await percorrerTudo({ limite: 2 });

      expect(primeira.corpo.itens).toHaveLength(2);
      expect(primeira.corpo.proxima).not.toBeNull();
      const ids = itens.map(({ id }) => id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(itens.map(({ nome }) => nome)).toEqual(['Administrador', 'Ana', 'Beto', 'Carlos', 'Dora', 'Sem Permissão']);
    });

    it('a página que termina exatamente no último item não devolve próxima', async () => {
      await semearCasa();

      const { corpo } = await listar({ limite: 2 });

      expect(corpo.itens).toHaveLength(2);
      expect(corpo.proxima).toBeNull();
    });

    it('o cursor é estável: usuário criado antes da posição não repete nem tira ninguém das páginas seguintes', async () => {
      await semearCasa(['Beto', 'Carlos', 'Dora']);
      const primeira = await listar({ limite: 2 });
      await escrever(aplicacao, ADMIN, ROTA_USUARIOS, { corpo: { nome: 'Aaron', email: 'aaron@casa.org' } });

      const segunda = await listar({ limite: 2, depois: primeira.corpo.proxima! });
      const terceira = await listar({ limite: 2, depois: segunda.corpo.proxima! });

      const vistos = [...primeira.corpo.itens, ...segunda.corpo.itens, ...terceira.corpo.itens].map(({ nome }) => nome);
      expect(vistos).toEqual(['Administrador', 'Beto', 'Carlos', 'Dora', 'Sem Permissão']);
    });

    it('sem limite devolve 50 por página; com 100 aceita; com 101 ou 0 recusa', async () => {
      await semearCasa();
      await semearEmMassa(TOTAL_DE_USUARIOS_EM_MASSA);

      const padrao = await listar();
      const maximo = await listar({ limite: 100 });
      const acima = await listar({ limite: 101 });
      const zero = await listar({ limite: 0 });

      expect(padrao.corpo.itens).toHaveLength(50);
      expect(padrao.corpo.proxima).not.toBeNull();
      expect(maximo.corpo.itens).toHaveLength(TOTAL_DE_USUARIOS_EM_MASSA + 2);
      expect(maximo.corpo.proxima).toBeNull();
      expect([acima.status, zero.status]).toEqual([400, 400]);
      expect([acima.corpo.erro, zero.corpo.erro]).toEqual(['CORPO_INVALIDO', 'CORPO_INVALIDO']);
    });

    it('cursor inválido dá 400 CORPO_INVALIDO', async () => {
      await semearCasa();

      const { status, corpo } = await listar({ depois: 'cursor-que-nao-e-meu' });

      expect(status).toBe(400);
      expect(corpo.erro).toBe('CORPO_INVALIDO');
    });
  });

  describe('filtros', () => {
    it('situacao devolve só usuários nessa situação', async () => {
      const { admin } = await semearCasa();
      await escrever(aplicacao, ADMIN, ROTA_USUARIOS, { corpo: { nome: 'Convidada', email: 'convidada@casa.org' } });

      const pendentes = await listar({ situacao: 'CONVITE_PENDENTE' });
      const ativos = await listar({ situacao: 'ATIVO' });

      expect(pendentes.corpo.itens.map(({ nome }) => nome)).toEqual(['Convidada']);
      expect(ativos.corpo.itens.map(({ id }) => id)).toContain(admin.id);
      expect(ativos.corpo.itens.map(({ nome }) => nome)).not.toContain('Convidada');
    });

    it('situacao desconhecida dá 400 CORPO_INVALIDO', async () => {
      await semearCasa();

      const { status, corpo } = await listar({ situacao: 'INEXISTENTE' });

      expect(status).toBe(400);
      expect(corpo.erro).toBe('CORPO_INVALIDO');
    });

    it('grupoId devolve só quem pertence ao grupo', async () => {
      const { gestao, admin } = await semearCasa(['Beto']);

      const { corpo } = await listar({ grupoId: gestao.id });

      expect(corpo.itens.map(({ id }) => id)).toEqual([admin.id]);
    });

    it('grupoId de grupo desativado não casa ninguém', async () => {
      const { mutirao } = await semearCasa(['Beto']);
      await desativarGrupo(banco, INSTITUICAO_A, mutirao.id);

      const { corpo } = await listar({ grupoId: mutirao.id });

      expect(corpo.itens).toEqual([]);
    });

    it('combina situacao, grupoId e busca', async () => {
      const { mutirao } = await semearCasa(['Beto', 'Bruna']);

      const { corpo } = await listar({ situacao: 'ATIVO', grupoId: mutirao.id, busca: 'br' });

      expect(corpo.itens.map(({ nome }) => nome)).toEqual(['Bruna']);
    });

    it('busca casa nome ou e-mail sem diferenciar maiúsculas e minúsculas', async () => {
      await semearCasa(['Ana Souza']);
      await escrever(aplicacao, ADMIN, ROTA_USUARIOS, { corpo: { nome: 'Zelador', email: 'chaves@vila.org' } });

      const porNome = await listar({ busca: 'ANA SOU' });
      const porEmail = await listar({ busca: 'CHAVES@VILA' });

      expect(porNome.corpo.itens.map(({ nome }) => nome)).toEqual(['Ana Souza']);
      expect(porEmail.corpo.itens.map(({ nome }) => nome)).toEqual(['Zelador']);
    });

    it('busca trata % e _ como texto literal, não como curinga', async () => {
      await semearCasa(['Ana_Paula', 'Ana Paula', '100% Luz', '100 Luz', 'Pasta\\Raiz']);

      const sublinhado = await listar({ busca: 'ana_' });
      const percentual = await listar({ busca: '100%' });
      const soCuringa = await listar({ busca: '%' });
      const barra = await listar({ busca: '\\' });

      expect(sublinhado.corpo.itens.map(({ nome }) => nome)).toEqual(['Ana_Paula']);
      expect(percentual.corpo.itens.map(({ nome }) => nome)).toEqual(['100% Luz']);
      expect(soCuringa.corpo.itens.map(({ nome }) => nome)).toEqual(['100% Luz']);
      expect(barra.corpo.itens.map(({ nome }) => nome)).toEqual(['Pasta\\Raiz']);
    });

    it('busca sem resultado devolve página vazia', async () => {
      await semearCasa();

      const { status, corpo } = await listar({ busca: 'ninguém com esse nome' });

      expect(status).toBe(200);
      expect(corpo).toEqual({ itens: [], proxima: null });
    });
  });

  describe('autorização e isolamento (T23)', () => {
    it('sem sistema.usuario.gerenciar dá 403 SEM_PERMISSAO', async () => {
      await semearCasa();

      const { status, corpo } = await listar({}, SEM_PERMISSAO);

      expect(status).toBe(403);
      expect(corpo.erro).toBe('SEM_PERMISSAO');
    });

    it('não lista ninguém de outra instituição, nem por busca nem por grupo', async () => {
      await semearCasa(['Beto']);
      const { grupo, adminDeB } = await semearCasaDeB();

      const todos = await percorrerTudo({});
      const porBusca = await listar({ busca: 'Pessoa de B' });
      const porGrupo = await listar({ grupoId: grupo.id });
      const doOutroLado = await listar({}, ADMIN_DE_B);

      expect(todos.map(({ id }) => id)).not.toContain(adminDeB.id);
      expect(porBusca.corpo.itens).toEqual([]);
      expect(porGrupo.corpo.itens).toEqual([]);
      expect(doOutroLado.corpo.itens.map(({ id }) => id as UsuarioId)).toEqual([adminDeB.id]);
    });
  });
});
