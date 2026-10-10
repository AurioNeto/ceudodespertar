import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoGrupoNomeado, subirAplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { consultarNaInstituicao } from '../apoio.js';
import { apoioDaTrava } from './apoio-da-trava.js';
import type { ApoioDaTrava } from './apoio-da-trava.js';
import { escrever, estadoDoUsuario, ROTA_USUARIOS, semearUsuarios, usuarioAtivoEm } from './apoio-http.js';
import type { RespostaDeEscrita } from './apoio-http.js';

const SUJEITO_X = 'sub-administrador-x';
const SUJEITO_Y = 'sub-administrador-y';
const MOTIVO = 'afastamento temporário';

const desativarDe = (id: string) => `${ROTA_USUARIOS}/${id}/desativar`;
const gruposDe = (id: string) => `${ROTA_USUARIOS}/${id}/grupos`;

describe('T25 · administradores concorrentes (Doc 3 §11; Doc 7 §25)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;
  let trava: ApoioDaTrava;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    aplicacao = await subirAplicacaoDeAcesso(banco);
    trava = apoioDaTrava(banco, INSTITUICAO_A);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function semearAdministradoresPorGruposDistintos() {
    const primeiroGrupo = novoGrupoNomeado('Administração 1', ['sistema.usuario.gerenciar']);
    const segundoGrupo = novoGrupoNomeado('Administração 2', ['sistema.usuario.gerenciar']);
    const x = usuarioAtivoEm(SUJEITO_X, [primeiroGrupo]);
    const y = usuarioAtivoEm(SUJEITO_Y, [segundoGrupo]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [primeiroGrupo, segundoGrupo], [x, y]);
    return { x, y };
  }

  async function administradoresAtivos(): Promise<number> {
    const [linha] = await consultarNaInstituicao<{ total: number }>(
      banco,
      INSTITUICAO_A,
      `select count(*)::int as total
         from identidade.usuario u
        where u.situacao = 'ATIVO'
          and exists (select 1 from identidade.usuario_grupo ug where ug.usuario_id = u.id)`,
    );
    return linha!.total;
  }

  function esperarUmSucessoEUmUltimoAdministrador(respostas: readonly RespostaDeEscrita[]): void {
    expect(respostas.map(({ status }) => status).toSorted()).toEqual([200, 422]);
    const recusada = respostas.find(({ status }) => status === 422)!;
    expect(recusada.corpo).toMatchObject({ erro: 'ULTIMO_ADMINISTRADOR' });
  }

  it('a corrida prova o resultado (a ordem trava, leitura, mutação, política é provada pelo espião unitário): desativar X e desativar Y simultâneos deixam um administrador', async () => {
    const { x, y } = await semearAdministradoresPorGruposDistintos();
    const versaoDeX = (await estadoDoUsuario(banco, INSTITUICAO_A, x.id)).versao;
    const versaoDeY = (await estadoDoUsuario(banco, INSTITUICAO_A, y.id)).versao;

    const respostas = await trava.dispararComATravaSegura([
      () => escrever(aplicacao, SUJEITO_Y, desativarDe(x.id), { versao: versaoDeX, corpo: { motivo: MOTIVO } }),
      () => escrever(aplicacao, SUJEITO_X, desativarDe(y.id), { versao: versaoDeY, corpo: { motivo: MOTIVO } }),
    ]);

    esperarUmSucessoEUmUltimoAdministrador(respostas);
    expect(await administradoresAtivos()).toBe(1);
  });

  it('a corrida prova o resultado: desativar X e tirar o grupo de Y simultâneos deixam um administrador', async () => {
    const { x, y } = await semearAdministradoresPorGruposDistintos();
    const versaoDeX = (await estadoDoUsuario(banco, INSTITUICAO_A, x.id)).versao;
    const versaoDeY = (await estadoDoUsuario(banco, INSTITUICAO_A, y.id)).versao;

    const respostas = await trava.dispararComATravaSegura([
      () => escrever(aplicacao, SUJEITO_Y, desativarDe(x.id), { versao: versaoDeX, corpo: { motivo: MOTIVO } }),
      () =>
        escrever(aplicacao, SUJEITO_X, gruposDe(y.id), { metodo: 'PUT', versao: versaoDeY, corpo: { grupos: [] } }),
    ]);

    esperarUmSucessoEUmUltimoAdministrador(respostas);
    expect(await administradoresAtivos()).toBe(1);
  });

  it('a trava por instituição segura o pedido enquanto outra transação a detém e o libera ao soltá-la', async () => {
    const { x } = await semearAdministradoresPorGruposDistintos();
    const versaoDeX = (await estadoDoUsuario(banco, INSTITUICAO_A, x.id)).versao;
    const liberar = await trava.segurar();
    let concluido = false;

    const pedido = escrever(aplicacao, SUJEITO_Y, desativarDe(x.id), {
      versao: versaoDeX,
      corpo: { motivo: MOTIVO },
    }).finally(() => {
      concluido = true;
    });
    await trava.esperarPedidos(1);

    expect(concluido).toBe(false);
    expect((await estadoDoUsuario(banco, INSTITUICAO_A, x.id)).situacao).toBe('ATIVO');
    await liberar();
    expect((await pedido).status).toBe(200);
    expect((await estadoDoUsuario(banco, INSTITUICAO_A, x.id)).situacao).toBe('SUSPENSO');
  });
});
