import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoGrupoNomeado, novoUsuarioAtivo, subirAplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { ROTA_USUARIOS, semearUsuarios } from '../gestao-de-usuarios/apoio-http.js';
import { desativarGrupo, semearGruposDeSistema } from './apoio-de-convite.js';

const ADMIN = 'sub-admin';
const SEM_PERMISSAO = 'sub-sem-permissao';
const ADMIN_DE_B = 'sub-admin-de-b';

describe('obter usuário pela API (Doc 7 §25)', () => {
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

  async function semearCasa() {
    await semearGruposDeSistema(aplicacao, INSTITUICAO_A);
    const gestao = novoGrupoNomeado('Gestão da casa', ['sistema.usuario.gerenciar']);
    const mutirao = novoGrupoNomeado('Mutirão', ['financeiro.lancamento.ler']);
    const admin = novoUsuarioAtivo(ADMIN, 'Administrador', [gestao.id]);
    const semPermissao = novoUsuarioAtivo(SEM_PERMISSAO, 'Sem Permissão', [mutirao.id]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [gestao, mutirao], [admin, semPermissao]);
    return { gestao, mutirao, admin, semPermissao };
  }

  async function semearCasaDeB() {
    await semearGruposDeSistema(aplicacao, INSTITUICAO_B);
    const grupo = novoGrupoNomeado('Gestão de B', ['sistema.usuario.gerenciar']);
    const adminDeB = novoUsuarioAtivo(ADMIN_DE_B, 'Pessoa de B', [grupo.id]);
    await semearUsuarios(aplicacao, INSTITUICAO_B, [grupo], [adminDeB]);
    return adminDeB;
  }

  async function obter(caminho: string, sujeito = ADMIN) {
    const resposta = await aplicacao.pedirComo(sujeito, caminho);
    return {
      status: resposta.status,
      corpo: (await resposta.json()) as Record<string, unknown>,
    };
  }

  it('200 com o item no formato da listagem, incluindo versão', async () => {
    const { gestao, admin } = await semearCasa();

    const { status, corpo } = await obter(`${ROTA_USUARIOS}/${admin.id}`);

    expect(status).toBe(200);
    expect(corpo).toEqual({
      id: admin.id,
      nome: 'Administrador',
      email: admin.email,
      situacao: 'ATIVO',
      grupos: [{ id: gestao.id, nome: 'Gestão da casa' }],
      versao: 1,
      ultimoAcessoEm: null,
    });
  });

  it('não traz grupo desativado', async () => {
    const { semPermissao, mutirao } = await semearCasa();
    await desativarGrupo(banco, INSTITUICAO_A, mutirao.id);

    const { corpo } = await obter(`${ROTA_USUARIOS}/${semPermissao.id}`);

    expect(corpo.grupos).toEqual([]);
  });

  it('T23 · id de outra instituição dá 404 RECURSO_NAO_ENCONTRADO', async () => {
    await semearCasa();
    const adminDeB = await semearCasaDeB();

    const { status, corpo } = await obter(`${ROTA_USUARIOS}/${adminDeB.id}`);

    expect(status).toBe(404);
    expect(corpo).toMatchObject({ erro: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('id inexistente dá 404 RECURSO_NAO_ENCONTRADO', async () => {
    await semearCasa();

    const { status, corpo } = await obter(`${ROTA_USUARIOS}/${randomUUID()}`);

    expect(status).toBe(404);
    expect(corpo).toMatchObject({ erro: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('id que não é UUID dá 400 CORPO_INVALIDO', async () => {
    await semearCasa();

    const { status, corpo } = await obter(`${ROTA_USUARIOS}/nao-e-uuid`);

    expect(status).toBe(400);
    expect(corpo).toMatchObject({ erro: 'CORPO_INVALIDO' });
  });

  it('sem sistema.usuario.gerenciar dá 403 SEM_PERMISSAO', async () => {
    const { admin } = await semearCasa();

    const { status, corpo } = await obter(`${ROTA_USUARIOS}/${admin.id}`, SEM_PERMISSAO);

    expect(status).toBe(403);
    expect(corpo).toMatchObject({ erro: 'SEM_PERMISSAO' });
  });

  it('seguir o Location do POST /usuarios devolve 200 com o convidado', async () => {
    await semearCasa();
    const criado = await aplicacao.pedirComo(ADMIN, ROTA_USUARIOS, {
      metodo: 'POST',
      corpo: { nome: 'Maria Silva', email: 'maria@casa.org' },
    });
    const localizacao = criado.headers.get('location')!;

    const { status, corpo } = await obter(localizacao);

    expect(criado.status).toBe(201);
    expect(status).toBe(200);
    expect(corpo).toMatchObject({
      nome: 'Maria Silva',
      email: 'maria@casa.org',
      situacao: 'CONVITE_PENDENTE',
      versao: 1,
    });
  });
});
