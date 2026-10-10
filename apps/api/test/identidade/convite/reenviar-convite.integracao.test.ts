import { randomUUID } from 'node:crypto';
import type { UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnviadorDeConvite } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoGrupoNomeado, subirAplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { eventosDoOutbox } from '../apoio.js';
import {
  efeitosGravados,
  escrever,
  estadoDoUsuario,
  ROTA_USUARIOS,
  semearUsuarios,
  trilhaDoUsuario,
  usuarioAtivoEm,
} from '../gestao-de-usuarios/apoio-http.js';
import {
  convitesDoUsuario,
  enviadorQueSondaOBanco,
  semearGruposDeSistema,
  sha256Hex,
  tudoQueFoiGravadoEmTexto,
} from './apoio-de-convite.js';
import type { EnviadorQueGuardaEnvios } from './apoio-de-convite.js';

const ADMIN = 'sub-admin';
const ADMIN_DE_B = 'sub-admin-de-b';
const ATIVO = 'sub-ativo';
const PEDIDO = { nome: 'Maria Silva', email: 'maria@casa.org' };

const reenviarDe = (id: string) => `${ROTA_USUARIOS}/${id}/convite/reenviar`;
const desativarDe = (id: string) => `${ROTA_USUARIOS}/${id}/desativar`;

describe('reenviar convite pela API (Doc 3 §11, Doc 7 §25)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;
  let enviador: EnviadorQueGuardaEnvios;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    enviador = enviadorQueSondaOBanco(banco, INSTITUICAO_A);
    aplicacao = await subirAplicacaoDeAcesso(banco, [{ provider: EnviadorDeConvite, valor: enviador }]);
  });

  afterEach(async () => {
    await enviador.aguardarSondas();
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function semearCasaComConvidado() {
    await semearGruposDeSistema(aplicacao, INSTITUICAO_A);
    const gestao = novoGrupoNomeado('Gestão da casa', ['sistema.usuario.gerenciar']);
    const admin = usuarioAtivoEm(ADMIN, [gestao]);
    const ativo = usuarioAtivoEm(ATIVO, [gestao]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [gestao], [admin, ativo]);
    const convite = await escrever(aplicacao, ADMIN, ROTA_USUARIOS, { corpo: PEDIDO });
    await vi.waitFor(() => expect(enviador.enviados).toHaveLength(1));
    return { admin, ativo, convidadoId: convite.corpo.id as UsuarioId };
  }

  const reenviar = (id: string, versao: number | string | undefined, chave?: string, sujeito = ADMIN) =>
    escrever(aplicacao, sujeito, reenviarDe(id), { ...(versao === undefined ? {} : { versao }), ...(chave === undefined ? {} : { chave }) });

  it('200 só com a nova versão, sem dado pessoal', async () => {
    const { convidadoId } = await semearCasaComConvidado();

    const resposta = await reenviar(convidadoId, 1);

    expect(resposta).toEqual({ status: 200, corpo: { versao: 2 } });
    expect(await estadoDoUsuario(banco, INSTITUICAO_A, convidadoId)).toMatchObject({ versao: 2, situacao: 'CONVITE_PENDENTE' });
  });

  it('gera novo hash, invalida o antigo e o token antigo deixa de ser o vigente', async () => {
    const { convidadoId } = await semearCasaComConvidado();
    const tokenAntigo = enviador.enviados[0]!.token;

    await reenviar(convidadoId, 1);
    await vi.waitFor(() => expect(enviador.enviados).toHaveLength(2));

    const tokenNovo = enviador.enviados[1]!.token;
    expect(tokenNovo).not.toBe(tokenAntigo);
    expect(await convitesDoUsuario(banco, INSTITUICAO_A, convidadoId)).toEqual([
      { hash: sha256Hex(tokenAntigo), revogado: true, expiraEm: expect.any(Date) },
      { hash: sha256Hex(tokenNovo), revogado: false, expiraEm: expect.any(Date) },
    ]);
  });

  it('envia só depois do commit e o token novo não aparece em nenhuma tabela', async () => {
    const { convidadoId } = await semearCasaComConvidado();

    await reenviar(convidadoId, 1);
    await vi.waitFor(() => expect(enviador.instantaneosDoBanco).toHaveLength(2));

    expect(await Promise.all(enviador.instantaneosDoBanco)).toEqual([1, 1]);
    expect(enviador.enviados[1]).toMatchObject({ usuarioId: convidadoId, email: PEDIDO.email, nome: PEDIDO.nome });
    const gravado = await tudoQueFoiGravadoEmTexto(banco, INSTITUICAO_A);
    expect(gravado).not.toContain(enviador.enviados[1]!.token);
    expect(gravado).not.toContain(enviador.enviados[0]!.token);
  });

  it('grava mais um USUARIO_CONVIDADO na trilha e no outbox, com quem reenviou como autor', async () => {
    const { admin, convidadoId } = await semearCasaComConvidado();

    await reenviar(convidadoId, 1);

    const registros = await trilhaDoUsuario(banco, INSTITUICAO_A, convidadoId, 'USUARIO_CONVIDADO');
    expect(registros).toHaveLength(2);
    expect(registros.map(({ autor_usuario_id }) => autor_usuario_id)).toEqual([admin.id, admin.id]);
    for (const registro of registros) {
      expect(registro.detalhes).not.toContain(PEDIDO.email);
      expect(registro.detalhes).not.toContain(PEDIDO.nome);
    }
    expect(await eventosDoOutbox(banco, convidadoId)).toEqual(['USUARIO_CONVIDADO', 'USUARIO_CONVIDADO']);
  });

  it('replay com a mesma chave devolve a mesma resposta sem novo token, trilha ou envio', async () => {
    const { convidadoId } = await semearCasaComConvidado();
    const chave = randomUUID();
    const primeira = await reenviar(convidadoId, 1, chave);
    await vi.waitFor(() => expect(enviador.enviados).toHaveLength(2));
    const efeitos = await efeitosGravados(banco, INSTITUICAO_A);

    const replay = await reenviar(convidadoId, 1, chave);

    expect(replay).toEqual(primeira);
    expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitos);
    expect(enviador.enviados).toHaveLength(2);
  });

  describe('If-Match', () => {
    it('ausente dá 428 VERSAO_OBRIGATORIA', async () => {
      const { convidadoId } = await semearCasaComConvidado();

      const resposta = await reenviar(convidadoId, undefined);

      expect(resposta.status).toBe(428);
      expect(resposta.corpo).toMatchObject({ erro: 'VERSAO_OBRIGATORIA' });
    });

    it('desatualizado dá 409 VERSAO_DESATUALIZADA, sem trilha, outbox nem envio novos', async () => {
      const { convidadoId } = await semearCasaComConvidado();
      const antes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await reenviar(convidadoId, 7);

      expect(resposta.status).toBe(409);
      expect(resposta.corpo).toMatchObject({ erro: 'VERSAO_DESATUALIZADA' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(antes);
      expect(enviador.enviados).toHaveLength(1);
    });
  });

  describe('recusa sobre o alvo', () => {
    it('alvo suspenso dá 409 SITUACAO_DO_USUARIO_NAO_PERMITE, não 401', async () => {
      const { ativo } = await semearCasaComConvidado();
      const suspenso = await escrever(aplicacao, ADMIN, desativarDe(ativo.id), {
        versao: (await estadoDoUsuario(banco, INSTITUICAO_A, ativo.id)).versao,
        corpo: { motivo: 'afastamento' },
      });
      const antes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await reenviar(ativo.id, suspenso.corpo.versao as number);

      expect(resposta.status).toBe(409);
      expect(resposta.corpo).toMatchObject({ erro: 'SITUACAO_DO_USUARIO_NAO_PERMITE' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(antes);
      expect(enviador.enviados).toHaveLength(1);
    });

    it('alvo que já ativou o convite dá 409 CONVITE_JA_USADO', async () => {
      const { ativo } = await semearCasaComConvidado();
      const versao = (await estadoDoUsuario(banco, INSTITUICAO_A, ativo.id)).versao;

      const resposta = await reenviar(ativo.id, versao);

      expect(resposta.status).toBe(409);
      expect(resposta.corpo).toMatchObject({ erro: 'CONVITE_JA_USADO' });
      expect(enviador.enviados).toHaveLength(1);
    });
  });

  describe('T23 · isolamento por instituição', () => {
    it('id de usuário de outra instituição dá 404 RECURSO_NAO_ENCONTRADO e nada muda nela', async () => {
      await semearCasaComConvidado();
      await semearGruposDeSistema(aplicacao, INSTITUICAO_B);
      const grupoDeB = novoGrupoNomeado('Gestão de B', ['sistema.usuario.gerenciar']);
      await semearUsuarios(aplicacao, INSTITUICAO_B, [grupoDeB], [usuarioAtivoEm(ADMIN_DE_B, [grupoDeB])]);
      const convidadoDeB = await escrever(aplicacao, ADMIN_DE_B, ROTA_USUARIOS, { corpo: PEDIDO });
      const idDeB = convidadoDeB.corpo.id as UsuarioId;
      await vi.waitFor(() => expect(enviador.enviados).toHaveLength(2));
      const antesEmB = await efeitosGravados(banco, INSTITUICAO_B);

      const resposta = await reenviar(idDeB, 1);

      expect(resposta.status).toBe(404);
      expect(resposta.corpo).toMatchObject({ erro: 'RECURSO_NAO_ENCONTRADO' });
      expect(await efeitosGravados(banco, INSTITUICAO_B)).toEqual(antesEmB);
      expect(enviador.enviados).toHaveLength(2);
    });
  });
});
