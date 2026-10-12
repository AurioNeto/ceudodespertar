import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, semearInstituicoes } from '../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { novoGrupoNomeado, ROTA_EU, subirAplicacaoDeAcesso } from './acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from './acesso/ambiente-http.js';
import { rotaDoGrupo } from './gestao-de-grupos/apoio-http.js';
import { escrever, estadoDoUsuario, ROTA_USUARIOS, semearUsuarios, usuarioAtivoEm } from './gestao-de-usuarios/apoio-http.js';

const ADMIN = 'sub-admin';
const ALVO = 'sub-alvo';
const NUL = '\u0000';
const NUL_NA_URL = '%00';

function cursorComNulNoNome(): string {
  const posicao = { chaveDeNome: `a${NUL}`, id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' };
  return Buffer.from(JSON.stringify(posicao)).toString('base64url');
}

describe('entrada e cache das rotas da identidade', () => {
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
    const administracao = novoGrupoNomeado('Administração', ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar']);
    const leitura = novoGrupoNomeado('Leitura', ['financeiro.lancamento.ler']);
    const admin = usuarioAtivoEm(ADMIN, [administracao]);
    const alvo = usuarioAtivoEm(ALVO, [leitura]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [administracao, leitura], [admin, alvo]);
    return { administracao, leitura, admin, alvo };
  }

  async function ler(caminho: string) {
    const resposta = await aplicacao.pedirComo(ADMIN, caminho);
    return {
      status: resposta.status,
      cacheControl: resposta.headers.get('cache-control'),
      corpo: (await resposta.json()) as Record<string, unknown>,
    };
  }

  describe('caractere NUL na entrada responde 400 CORPO_INVALIDO e nunca 500', () => {
    it.each([
      { campo: 'busca', consulta: `busca=a${NUL_NA_URL}b` },
      { campo: 'depois', consulta: `depois=${cursorComNulNoNome()}` },
    ])('$campo na listagem de usuários', async ({ campo, consulta }) => {
      await semearCasa();

      const { status, corpo } = await ler(`${ROTA_USUARIOS}?${consulta}`);

      expect(status).toBe(400);
      expect(corpo).toMatchObject({ erro: 'CORPO_INVALIDO', detalhes: { problemas: [{ caminho: campo }] } });
    });

    it('nome no convite', async () => {
      await semearCasa();

      const resposta = await escrever(aplicacao, ADMIN, ROTA_USUARIOS, {
        corpo: { nome: `Pessoa${NUL}`, email: 'pessoa@exemplo.org' },
      });

      expect(resposta.status).toBe(400);
      expect(resposta.corpo).toMatchObject({ erro: 'CORPO_INVALIDO', detalhes: { problemas: [{ caminho: 'nome' }] } });
    });

    it('motivo da desativação', async () => {
      const { alvo } = await semearCasa();

      const resposta = await escrever(aplicacao, ADMIN, `${ROTA_USUARIOS}/${alvo.id}/desativar`, {
        versao: (await estadoDoUsuario(banco, INSTITUICAO_A, alvo.id)).versao,
        corpo: { motivo: `afastamento${NUL}` },
      });

      expect(resposta.status).toBe(400);
      expect(resposta.corpo).toMatchObject({ erro: 'CORPO_INVALIDO', detalhes: { problemas: [{ caminho: 'motivo' }] } });
    });

    it('nome do grupo ao renomear', async () => {
      const { leitura } = await semearCasa();

      const resposta = await escrever(aplicacao, ADMIN, rotaDoGrupo(leitura.id), {
        metodo: 'PATCH',
        versao: 1,
        corpo: { nome: `Leitura${NUL}`, descricao: '' },
      });

      expect(resposta.status).toBe(400);
      expect(resposta.corpo).toMatchObject({ erro: 'CORPO_INVALIDO', detalhes: { problemas: [{ caminho: 'nome' }] } });
    });
  });

  describe('UUID em maiúsculas é o mesmo id em minúsculas', () => {
    it('id de grupo em maiúsculas no corpo do PUT de grupos define o grupo', async () => {
      const { administracao, leitura, alvo } = await semearCasa();

      const resposta = await escrever(aplicacao, ADMIN, `${ROTA_USUARIOS}/${alvo.id}/grupos`, {
        metodo: 'PUT',
        versao: (await estadoDoUsuario(banco, INSTITUICAO_A, alvo.id)).versao,
        corpo: { grupos: [leitura.id.toUpperCase(), administracao.id.toUpperCase()] },
      });

      expect(resposta.status).toBe(200);
      expect(resposta.corpo).toMatchObject({ grupos: expect.arrayContaining([leitura.id, administracao.id]) });
    });

    it('id de usuário em maiúsculas na rota encontra o usuário', async () => {
      const { alvo } = await semearCasa();

      const { status, corpo } = await ler(`${ROTA_USUARIOS}/${alvo.id.toUpperCase()}`);

      expect(status).toBe(200);
      expect(corpo).toMatchObject({ id: alvo.id });
    });

    it('grupoId em maiúsculas no filtro da listagem filtra pelo grupo', async () => {
      const { leitura, alvo } = await semearCasa();

      const { status, corpo } = await ler(`${ROTA_USUARIOS}?grupoId=${leitura.id.toUpperCase()}`);

      expect(status).toBe(200);
      expect((corpo['itens'] as { id: string }[]).map(({ id }) => id)).toEqual([alvo.id]);
    });
  });

  describe('respostas com dado pessoal não ficam em cache', () => {
    it.each([
      { rota: 'GET /identidade/usuarios', caminho: () => ROTA_USUARIOS },
      { rota: 'GET /identidade/usuarios/:id', caminho: (id: string) => `${ROTA_USUARIOS}/${id}` },
      { rota: 'GET /eu', caminho: () => ROTA_EU },
    ])('$rota responde Cache-Control: no-store', async ({ caminho }) => {
      const { alvo } = await semearCasa();

      const { status, cacheControl } = await ler(caminho(alvo.id));

      expect(status).toBe(200);
      expect(cacheControl).toBe('no-store');
    });
  });
});
