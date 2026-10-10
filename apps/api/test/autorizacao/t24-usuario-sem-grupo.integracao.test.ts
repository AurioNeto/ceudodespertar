import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, semearInstituicoes } from '../eventos/apoio.js';
import { novoGrupoNomeado, subirAplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { estadoDoGrupo, ROTA_GRUPOS, rotaDaPermissaoDoGrupo } from '../identidade/gestao-de-grupos/apoio-http.js';
import { efeitosGravados, escrever, semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

const SEM_GRUPO = 'sub-sem-grupo';
const COM_GRUPO = 'sub-com-grupo-de-administracao';

describe('T24 · usuário real sem grupo algum — resolvedor real, banco real, rotas reais de permissão', () => {
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
    const administracao = novoGrupoNomeado('Administração', ['sistema.grupo.gerenciar']);
    const leitura = novoGrupoNomeado('Leitura', ['financeiro.lancamento.ler']);
    const semGrupo = usuarioAtivoEm(SEM_GRUPO, []);
    const comGrupo = usuarioAtivoEm(COM_GRUPO, [administracao]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [administracao, leitura], [semGrupo, comGrupo]);
    return { leitura };
  }

  it('T24 · rota de leitura com permissão — usuário sem grupo — responde 403 SEM_PERMISSAO', async () => {
    await semearCasa();

    const resposta = await aplicacao.pedirComo(SEM_GRUPO, ROTA_GRUPOS);

    expect([resposta.status, await resposta.json()]).toEqual([403, { erro: 'SEM_PERMISSAO', correlacaoId: expect.any(String) }]);
  });

  it('T24 · mesma rota de leitura — usuário com a permissão exigida — responde 200, então o 403 vem da falta de grupo', async () => {
    await semearCasa();

    const resposta = await aplicacao.pedirComo(COM_GRUPO, ROTA_GRUPOS);

    expect(resposta.status).toBe(200);
  });

  it('T24 · rota de escrita com permissão — usuário sem grupo — responde 403 SEM_PERMISSAO e não grava nada', async () => {
    const { leitura } = await semearCasa();
    const antes = { estado: await estadoDoGrupo(banco, INSTITUICAO_A, leitura.id), efeitos: await efeitosGravados(banco, INSTITUICAO_A) };

    const resposta = await escrever(aplicacao, SEM_GRUPO, rotaDaPermissaoDoGrupo(leitura.id, 'financeiro.conta.ler'), {
      metodo: 'PUT',
      versao: antes.estado.versao,
    });

    const depois = { estado: await estadoDoGrupo(banco, INSTITUICAO_A, leitura.id), efeitos: await efeitosGravados(banco, INSTITUICAO_A) };
    expect([resposta.status, resposta.corpo['erro'], depois]).toEqual([403, 'SEM_PERMISSAO', antes]);
  });

  it('T24 · mesma rota de escrita — usuário com a permissão exigida — grava, então o 403 vem da falta de grupo', async () => {
    const { leitura } = await semearCasa();
    const { versao } = await estadoDoGrupo(banco, INSTITUICAO_A, leitura.id);

    const resposta = await escrever(aplicacao, COM_GRUPO, rotaDaPermissaoDoGrupo(leitura.id, 'financeiro.conta.ler'), {
      metodo: 'PUT',
      versao,
    });

    expect(resposta.status).toBe(200);
  });
});
